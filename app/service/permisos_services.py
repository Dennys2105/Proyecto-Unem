from sqlmodel import Session, select
from typing import Optional
from app.models.unem_db_models import PermisoUsario  # Asegúrate de que el nombre del modelo coincida con tus definiciones
from app.schemas.esq_permisos import PermisoUsuCreate, PermisoUsuUpdate

def guardar_o_actualizar_permiso_usuario(
    db: Session, 
    id_usu: int, 
    id_mod: int, 
    id_perm: int, 
    alcance_nuevo: Optional[str] = None
) -> PermisoUsario:
    """
    Busca si ya existe un permiso personalizado para el usuario, módulo y tipo de permiso.
    Si existe, actualiza su alcance. Si no existe, lo crea.
    """
    # Consulta para detectar si coincide la combinación única
    statement = select(PermisoUsario).where(
        PermisoUsario.id_usu == id_usu,
        PermisoUsario.id_mod == id_mod,
        PermisoUsario.id_perm == id_perm
    )
    permiso_existente = db.exec(statement).first()

    if permiso_existente:
        # Si existe, actualizamos el alcance
        permiso_existente.alcance = alcance_nuevo
        db.add(permiso_existente)
        db.commit()
        db.refresh(permiso_existente)
        return permiso_existente
    else:
        # Si no existe, creamos el nuevo registro
        nuevo_permiso = PermisoUsario(
            id_usu=id_usu,
            id_mod=id_mod,
            id_perm=id_perm,
            alcance=alcance_nuevo,
            estatus='A' # Asumiendo 'A' por defecto según los estándares del diccionario
        )
        db.add(nuevo_permiso)
        db.commit()
        db.refresh(nuevo_permiso)
        return nuevo_permiso