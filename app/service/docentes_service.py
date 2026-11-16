from sqlmodel import Session, select
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
    statement = select(Docente)
    return list(session.exec(statement).all())

def obtener_dato_por_id(docente_id: int, session: Session):
    # ✅ El parámetro debe llamarse 'docente_id', NO 'id'
    db_obj = session.get(Docente, docente_id)
    return db_obj

def actualizar(session: Session, db_dato: Docente, dato_in: DocenteUpdate, parcial: bool = True) -> Docente:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: Docente) -> None:
    eliminar_logico(db=session, db_obj=db_dato)

def existe_llave_foranea_mun(session: Session, id: int) -> Municipio:
    return obtener_por_id(session,Municipio,id)

def existe_llave_foranea_usu(session: Session, id: int) -> Usuario:
    return obtener_por_id(session,Usuario,id)