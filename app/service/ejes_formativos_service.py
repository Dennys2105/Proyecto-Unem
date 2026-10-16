from sqlmodel import Session
from typing import Optional
from app.models.unem_db_models import EjeFormativo
from app.schemas.esq_eje_formativo import EjeCreate,EjeRemplace,EjeResposive,EjeUpdate
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear(session: Session, datos_in: EjeCreate) -> EjeFormativo:
    return crear_registro(db=session,modelo=EjeFormativo,datos_in=datos_in)

def leer_todos(session: Session) -> list[EjeFormativo]:
    return obtener_todos_activos(db=session,modelo=EjeFormativo)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[EjeFormativo]:
    return obtener_por_id(db=session,modelo=EjeFormativo,id=dato_id)

def actualizar(session: Session, db_dato: EjeFormativo, dato_in: EjeUpdate, parcial: bool = True) -> EjeFormativo:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: EjeFormativo) -> None:
    eliminar_logico(db=session, db_obj=db_dato)