from sqlmodel import Session
from typing import Optional
from app.models.unem_db_models import Municipio
from app.schemas.esq_municipios import MunicipiosCreate,MunicipiosRemplace,MunicipiosUpdate,MunicipiosResposive
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear(session: Session, datos_in: MunicipiosCreate) -> Municipio:
    return crear_registro(db=session,modelo=Municipio,datos_in=datos_in)

def leer_todos(session: Session) -> list[Municipio]:
    return obtener_todos_activos(db=session,modelo=Municipio)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[Municipio]:
    return obtener_por_id(db=session,modelo=Municipio,id=dato_id)

def actualizar(session: Session, db_dato: Municipio, dato_in: MunicipiosUpdate, parcial: bool = True) -> Municipio:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: Municipio) -> None:
    eliminar_logico(db=session, db_obj=db_dato)