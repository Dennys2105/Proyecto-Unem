from sqlmodel import Session
from typing import Optional
from app.models.unem_db_models import EspacioFisico, Municipio
from app.schemas.esq_espacio_fisico import EspacioFisicoCreate,EspacioFisicoReplace,EspacioFisicoResponse,EspacioFisicoUpdate
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear(session: Session, datos_in: EspacioFisicoCreate) -> EspacioFisico:
    return crear_registro(db=session,modelo=EspacioFisico,datos_in=datos_in)

def leer_todos(session: Session) -> list[EspacioFisico]:
    return obtener_todos_activos(db=session,modelo=EspacioFisico)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[EspacioFisico]:
    return obtener_por_id(db=session,modelo=EspacioFisico,id=dato_id)

def actualizar(session: Session, db_dato: EspacioFisico, dato_in: EspacioFisicoUpdate, parcial: bool = True) -> EspacioFisico:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: EspacioFisico) -> None:
    eliminar_logico(db=session, db_obj=db_dato)

def existe_llave_foranea_mun(session: Session, id: int) -> Municipio:
    return obtener_por_id(session,Municipio,id)
