from fastapi import HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from app.models.unem_db_models import Rol
from app.schemas.esq_roles import RolesCreate, RolesUpdate,RolesResposive,RolesRemplace
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear_rol (session: Session, rol_in: RolesCreate) -> Rol:
    return crear_registro(db=session,modelo=Rol,datos_in=rol_in)

def leer_roles(session: Session) -> list[Rol]:
    return obtener_todos_activos(db=session,modelo=Rol)

def obtener_rol_por_id(rol_id: int, session:Session) -> Optional[Rol]:
    return obtener_por_id(db=session,modelo=Rol,id=rol_id)

def actualizar_rol(session: Session, db_rol: Rol, rol_in: RolesUpdate, parcial: bool = True) -> Rol:
    return actualizar_registro(db=session, db_obj=db_rol, datos_in=rol_in, parcial=parcial)

def eliminar_rol(session: Session, db_rol: Rol) -> None:
    eliminar_logico(db=session, db_obj=db_rol)