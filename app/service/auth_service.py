import jwt
import os
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlmodel import Session, select
from fastapi.security import OAuth2PasswordRequestForm

from app.models.unem_db_models import Usuario, Rol, Credencial
from app.schemas.esq_auth import UserRegister, UserLogin, UsuarioResposive
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
        id_rol=datos.id_rol  # Usamos id_rol para recibir el entero (int)
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

    statement = select(Usuario, Credencial).join(Credencial,Usuario.id_usu == Credencial.id_usu).where(Usuario.username == username)
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

    # 3. Generar el Token JWT
    # hay que decir si nesesitas permisos extrar para ver si se crea scope
    token = crear_token({
        "sub": usuario.username,
        "rol": usuario.id_rol,
        "id": usuario.id_usu
    })
    
    return {
        "access_token": token,
        "token_type": "bearer"
    }

def listar_usuarios(session: Session):
    statement = select(Usuario,Credencial).join(Credencial,Usuario.id_usu == Credencial.id_usu)
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