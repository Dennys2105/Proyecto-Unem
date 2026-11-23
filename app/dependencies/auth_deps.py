from fastapi import Depends, HTTPException, status
from app.service.auth_service import verificar_token
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from typing import Optional

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

def bloquear_rol(rol_bloqueado: int):
    """Impide el acceso de un rol específico, incluso si conserva permisos en su token."""
    def verificar(usuario: dict = Depends(obtener_usuario_actual)):
        if usuario.get("rol") == rol_bloqueado:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu rol no tiene acceso a este módulo."
            )
        return usuario
    return verificar


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
        # Los docentes utilizan solo endpoints específicos de /mi-docencia.
        # Evita que tokens antiguos u overrides abran rutas administrativas.
        if usuario.get("rol") == 4:
            raise HTTPException(status_code=403, detail="El docente debe usar su portal de autogestión.")
        if usuario.get("rol") == 1:  # Si es administrador, se le permite todo
            return {"id_usu": usuario.get("id"), "alcance": "TODO", "rol": usuario.get("rol")}
        
        llave_permiso = f"{modulo}:{accion}"
        permisos_usuario = usuario.get("scopes", {}) 
        alcance_usuario = permisos_usuario.get(llave_permiso, "NAD")
        
        if jerarquia.get(alcance_usuario, 0) < jerarquia.get(alcance_requerido, 1):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. No cuentas con el alcance necesario ({accion}) en el módulo '{modulo}'."
            )
            
        return {"id_usu": usuario.get("id"), "alcance": alcance_usuario, "rol": usuario.get("rol")}
        
    return dependencia_verificadora

# ============================================================
# HELPER: Filtrado por propiedad del recurso (Fase 3)
# ============================================================
def materias_del_docente(session, id_doc: int) -> list[int]:
    """Retorna los id_malla de las materias asignadas al docente."""
    from sqlmodel import text
    rows = session.exec(
        text("""
            SELECT DISTINCT id_malla
            FROM horarios.asig_carga_horarias
            WHERE id_doc = :d AND estatus = 'A' AND id_malla IS NOT NULL
        """).params(d=id_doc)
    ).all()
    return [r[0] for r in rows]


def secciones_del_docente(session, id_doc: int) -> list[int]:
    """Retorna los id_sec de las secciones donde el docente tiene asignaciones."""
    from sqlmodel import text
    rows = session.exec(
        text("""
            SELECT DISTINCT id_sec
            FROM horarios.asig_carga_horarias
            WHERE id_doc = :d AND estatus = 'A' AND id_sec IS NOT NULL
        """).params(d=id_doc)
    ).all()
    return [r[0] for r in rows]


def es_docente_sp(usuario: dict) -> bool:
    """True solo si el usuario es DOCENTE (rol 4) con alcance SP.
    El filtrado por propiedad aplica únicamente a ese caso; un coordinador
    con alcance SP sigue viendo listados completos (gestiona toda la sede)."""
    return usuario.get("rol") == 4 and usuario.get("alcance") == "SP"


def docente_del_usuario(usuario: dict, session: Session) -> Optional[int]:
    """
    Obtiene el id_doc del docente vinculado al usuario autenticado.
    Retorna None si el usuario no es docente o no tiene vínculo.
    """
    from app.models.unem_db_models import Docente

    id_usu = usuario.get("id") or usuario.get("id_usu")
    if not id_usu:
        return None

    docente = session.exec(
        select(Docente).where(Docente.id_usu == id_usu, Docente.estatus == 'A')
    ).first()

    return docente.id_doc if docente else None