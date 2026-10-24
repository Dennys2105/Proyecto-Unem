from fastapi import Depends, HTTPException, status
from app.service.auth_service import verificar_token
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def obtener_usuario_actual(token: str = Depends(oauth2_scheme)) -> dict:

    payload = verificar_token(token)
    return payload

def requerir_rol(roles_permitidos: list[int]):
    """Dependencia flexible para restringir acceso por ID de Rol."""
    def rol_checker(usuario: dict = Depends(obtener_usuario_actual)):
        rol_usuario = usuario.get("rol")
        if rol_usuario not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción"
            )
        return usuario
    return rol_checker

def recurso_propietario(usuario: dict = Depends(obtener_usuario_actual), recurso_id: int = None, roles_restringidos: list[int] = None) -> bool:
    """Dependencia para verificar si el usuario es propietario del recurso."""
    rol = usuario.get("rol")
    id_usuaro = usuario.get("id")
    if roles_restringidos and rol in roles_restringidos:
        if id_usuaro != recurso_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No eres el propietario de este recurso"
            )
    return True