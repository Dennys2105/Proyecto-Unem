from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from app.config.db_conection import get_session
from app.schemas.esq_permisos import PermisoUsuCreate
import app.service.permisos_services as service
from app.dependencies.auth_deps import requerir_rol, obtener_usuario_actual, verificar_permiso

router = APIRouter(
    prefix="/permisos",
    tags=["Permisos De Usuarios"]
)

@router.post("/usuario/upsert", status_code=status.HTTP_200_OK)
def upsert_permiso_usuario_endpoint(
    payload: PermisoUsuCreate,
    db: Session = Depends(get_session),
    # usuario_actual = Depends(verificar_permiso(...)) comentado para facilitar las pruebas
):
    resultado = service.guardar_o_actualizar_permiso_usuario(
        db=db,
        id_usu=payload.id_usu,
        id_mod=payload.id_mod,
        id_perm=payload.id_perm,
        alcance_nuevo=payload.alcance
    )
    
    return {
        "mensaje": "Permiso procesado exitosamente (creado o actualizado)",
        "data": resultado
    }