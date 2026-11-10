from fastapi import Depends, HTTPException, status
from app.service.auth_service import verificar_token
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/usuario/login")

def obtener_usuario_actual(token: str = Depends(oauth2_scheme)) -> dict:

    payload = verificar_token(token)
    return payload

## CODIGO ANTIGUA DE DEPENDENCIA DE ROLES, SE REEMPLAZARA POR NUEVA DE MANERA PROGRESIVA
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

##CODIGO ANTIGUO, AUNQUE PODRIA SEGUIR FUNCIONANDO CON LA NUEVA VERSION DE DEPENDECIA DE ROLES, SE NECESITA REVISAR Y VER SI ES NECESARIO CAMBIOS
def recurso_propietario(usuario: dict , recurso_id: int = None, roles_restringidos: list[int] = None) -> bool:
    """Dependencia para verificar si el usuario es propietario del recurso."""
    rol = usuario.get("rol")
    id_usuario = usuario.get("id")
    if roles_restringidos and rol in roles_restringidos:
        if id_usuario != recurso_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No eres el propietario de este recurso"
            )
    return True

def verificar_permiso(modulo: str, accion: str, alcance_requerido: str = "SP"):
    jerarquia = {"NAD": 0, "SP": 1, "LIM": 2, "TODO": 3}
    
    def dependencia_verificadora(usuario = Depends(obtener_usuario_actual)):
        if usuario.get("rol") == 1:  # Si es administrador, se le permite todo
            return {"id_usu": usuario.get("id"), "alcance": "TODO"}
        
        llave_permiso = f"{modulo}:{accion}"
        permisos_usuario = usuario.get("scopes", {}) 
        alcance_usuario = permisos_usuario.get(llave_permiso, "NAD")
        
        if jerarquia.get(alcance_usuario, 0) < jerarquia.get(alcance_requerido, 1):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. No cuentas con el alcance necesario ({accion}) en el módulo '{modulo}'."
            )
            
        return {"id_usu": usuario.get("id"), "alcance": alcance_usuario}
        
    return dependencia_verificadora