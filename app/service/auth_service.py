import jwt
import os
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.db_models import Usuario, Rol
from app.schemas.esq_usuarios import UserCreate, UserLogin
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

def registrar_usuario(session: Session, datos: UserCreate) -> Usuario:
    # 1. Verificar si el correo ya existe en la BD
    statement = select(Usuario).where(Usuario.correo == datos.correo)
    usuario_existente = session.exec(statement).first()
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado"
        )
    
    # 2. Convertir la contraseña a hash
    hash_clave = get_password_hash(datos.password)
    
    # 3. Crear la instancia del modelo alineada exactamente a db_models.py
    nuevo_usuario = Usuario(
        username=datos.username,
        correo=datos.correo,
        password=hash_clave,
        rol_id=datos.rol_id  # Usamos rol_id para recibir el entero (int)
    )
    
    # 4. Guardar en la base de datos
    session.add(nuevo_usuario)
    session.commit()
    session.refresh(nuevo_usuario)
    
    return nuevo_usuario

def iniciar_sesion(session: Session, datos: UserLogin) -> dict:
    # 1. Buscar el usuario por email en la BD
    statement = select(Usuario).where(Usuario.correo == datos.correo)
    usuario = session.exec(statement).first()
    
    # 2. Validar existencia de usuario y contraseña hasheada
    if not usuario or not verify_password(datos.password, usuario.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    # 3. Generar el Token JWT
    token = crear_token({
        "sub": usuario.correo,
        "rol": usuario.rol_id,
        "id": usuario.id
    })
    
    return {
        "access_token": token,
        "token_type": "bearer"
    }

def listar_usuarios(session: Session):
    statement = select(Usuario)
    return session.exec(statement).all()