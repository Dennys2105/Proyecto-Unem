from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.service.auth_service import verificar_token

security = HTTPBearer()

def obtener_usuario_actual(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Extrae el token del Header 'Authorization: Bearer <TOKEN>',
    lo valida y retorna el payload con la información del usuario.
    """
    token = credentials.credentials
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