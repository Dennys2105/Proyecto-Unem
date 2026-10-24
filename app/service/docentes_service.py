from sqlmodel import Session
from typing import Optional
from app.models.unem_db_models import Docente, Municipio, Usuario
from app.schemas.esq_docente import DocenteCreate,DocenteReplace,DocenteResponse,DocenteUpdate
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear(session: Session, datos_in: DocenteCreate) -> Docente:
    return crear_registro(db=session,modelo=Docente,datos_in=datos_in)

def leer_todos(session: Session) -> list[Docente]:
    return obtener_todos_activos(db=session,modelo=Docente)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[Docente]:
    return obtener_por_id(db=session,modelo=Docente,id=dato_id)

def actualizar(session: Session, db_dato: Docente, dato_in: DocenteUpdate, parcial: bool = True) -> Docente:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: Docente) -> None:
    eliminar_logico(db=session, db_obj=db_dato)

def existe_llave_foranea_mun(session: Session, id: int) -> Municipio:
    return obtener_por_id(session,Municipio,id)

def existe_llave_foranea_usu(session: Session, id: int) -> Usuario:
    return obtener_por_id(session,Usuario,id)