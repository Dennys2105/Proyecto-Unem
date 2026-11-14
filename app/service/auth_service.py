import jwt
import os
from typing import Optional
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlmodel import Session, select, text
from fastapi.security import OAuth2PasswordRequestForm


from app.models.unem_db_models import Usuario, Rol, Credencial,Docente,Estudiante
from app.schemas.esq_auth import UserRegister, UsuarioResposive,UsuarioUpdate
from app.service.base_services import eliminar_logico, obtener_por_id,actualizar_registro
# Configuración de Cifrado y JWT
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("CRÍTICO: La variable de entorno SECRET_KEY no está configurada.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


# --- Funciones de Utilidad (Hashing y JWT) ---

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


##CODIGO NUEVO EN TRABAJO PARA OBTENER LOS PERMISOS DE USUARIO ESTA EN FASES DE PRUEBAS
def obtener_permisos(usuario_id: int, session: Session) -> dict:
    # 1. Consultamos la vista pasando los parámetros con .params() en el text()
    query = text("""
        SELECT modulo, permiso, alcance_efectivo 
        FROM general.vw_permisos_efectivos_usuario 
        WHERE id_usu = :id_usu
    """).params(id_usu=usuario_id)
    
    resultados = session.exec(query).all()
    
    # 2. Transformamos los permisos en un diccionario compacto tipo: {"notas:LEC": "SP", "docentes:CRE": "TODO"}
    permisos_dict = {f"{row.modulo}:{row.permiso}": row.alcance_efectivo for row in resultados}

    return permisos_dict

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def crear_token(data: dict) -> str:
    payload = data.copy()
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expiracion})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verificar_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="El token ha expirado"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token inválido"
        )

# --- Operaciones de Servicio con Base de Datos ---

def registrar_usuario(session: Session, datos: UserRegister) -> UsuarioResposive:
    # 1. Verificar si el correo ya existe en la BD
    statement = select(Usuario).where(Usuario.username == datos.username)
    usuario_existente = session.exec(statement).first()
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El Username ya está existe"
        )
    
    # 3. Crear la instancia del modelo alineada exactamente a db_models.py
    nuevo_usuario = Usuario(
        username=datos.username,
        id_rol=datos.id_rol,
        email= datos.email
    )
    
    # 4. Guardar en la base de datos
    session.add(nuevo_usuario)
    session.commit()
    session.refresh(nuevo_usuario)
    
    # 2. Convertir la contraseña a hash
    hash_clave = get_password_hash(datos.password)
    
    # 4. Crear la credencial asociada usando el id_usu recién creado
    nueva_credencial = Credencial(
        id_usu=nuevo_usuario.id_usu,
        password_hash=hash_clave
    )
    
    session.add(nueva_credencial)
    session.commit()
    
    return nuevo_usuario

def iniciar_sesion(form_data: OAuth2PasswordRequestForm, session: Session) -> dict:
    # 1. Buscar el usuario por username(en el futuro se pienza hacer por email) en la BD
    username = form_data.username
    password = form_data.password

    statement = select(Usuario, Credencial).join(Credencial,Usuario.id_usu == Credencial.id_usu).where(Usuario.username == username and Usuario.estatus == "A")
    resultado = session.exec(statement).first()

    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )

    hora_actual = datetime.now(timezone.utc)
    usuario, credencial = resultado

    if credencial.bloqueado_hasta and credencial.bloqueado_hasta > hora_actual:
        # Calcular cuántos minutos le quedan
        tiempo_restante = int((credencial.bloqueado_hasta - hora_actual).total_seconds() / 60)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cuenta temporalmente bloqueada. Inténtalo de nuevo en {tiempo_restante} minutos."
        )

    elif not verify_password(password, credencial.password_hash):
        credencial.intentos_fallidos += 1
        if credencial.intentos_fallidos >= 5:
            credencial.bloqueado_hasta = hora_actual + timedelta(minutes=15)
            credencial.intentos_fallidos = 0  # Reiniciar intentos fallidos después de bloquear
            session.add(credencial)
            session.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Has superado los 5 intentos. Tu cuenta ha sido bloqueada por 15 minutos."
            )
        
        session.add(credencial)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña inválida"
        )

    credencial.intentos_fallidos = 0
    credencial.bloqueado_hasta = None
    credencial.ultimo_acceso = hora_actual
    session.add(credencial)
    session.commit()

    # 2. Obtener los permisos del usuario
    permisos = obtener_permisos(usuario.id_usu, session)

    # 3. Generar el Token JWT
    # hay que decir si nesesitas permisos extrar para ver si se crea scope
    token = crear_token({
        "sub": usuario.username,
        "email": usuario.email,
        "rol": usuario.id_rol,
        "scopes": permisos,
        "id": usuario.id_usu
    })
    
    return {
        "access_token": token,
        "token_type": "bearer"
    }

def listar_usuarios(session: Session):
    statement = select(Usuario,Credencial).join(Credencial,Usuario.id_usu == Credencial.id_usu).where(Usuario.estatus == "A")
    usuarios = session.exec(statement).all()
    
    #hay una forma mas optima de hecer esto con selectinload, pero por cansacio lo hacemos asi
    # Transformamos la tupla (usuario, credencial) al formato de diccionario que exige el esquema
    return [
        {
            "usuario": usuario,
            "credenciales": credencial
        }
        for usuario, credencial in usuarios
    ]

def actualizar_usuario(session: Session, db_dato: Usuario, dato_in: UsuarioUpdate, parcial: bool = True) -> Usuario:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def obtener_user_informacion(session: Session, user_id: int, user_inf: int ):
    if user_inf == 1:
        select_statement = select(Docente).where(Docente.id_usu == user_id and Docente.estatus == "A")
    
    elif user_inf == 2:
        select_statement = select(Estudiante).where(Estudiante.id_usu == user_id and Estudiante.estatus == "A")
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de usuario no válido. Debe ser 1 (Docente) o 2 (Estudiante)."
        )

    return session.exec(select_statement).first()

def eliminar(session: Session, db_dato: Usuario) -> None:
    eliminar_logico(db=session, db_obj=db_dato)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[Usuario]:
    return obtener_por_id(db=session,modelo=Usuario,id=dato_id)

def obtener_usuario_con_credenciales_por_id(session: Session, usuario_id: int):
    statement = select(Usuario, Credencial).join(Credencial, Usuario.id_usu == Credencial.id_usu).where(Usuario.id_usu == usuario_id and Usuario.estatus == "A")
    resultado = session.exec(statement).first()
    
    if not resultado:
        return None
        
    usuario, credencial = resultado
    return {
        "usuario": usuario,
        "credenciales": credencial
    }

