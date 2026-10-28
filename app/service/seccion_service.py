from sqlmodel import Session
from typing import Optional
from app.models.unem_db_models import Seccion, Programa
from app.schemas.esq_seccion import SeccionCreate,SeccionResponse,SeccionUpdate,SeccionReplace
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear(session: Session, datos_in: SeccionCreate) -> Seccion:
    return crear_registro(db=session,modelo=Seccion,datos_in=datos_in)

def leer_todos(session: Session) -> list[Seccion]:
    return obtener_todos_activos(db=session,modelo=Seccion)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[Seccion]:
    return obtener_por_id(db=session,modelo=Seccion,id=dato_id)

def actualizar(session: Session, db_dato: Seccion, dato_in: SeccionUpdate, parcial: bool = True) -> Seccion:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: Seccion) -> None:
    eliminar_logico(db=session, db_obj=db_dato)

def existe_llave_foranea_pro(session: Session, id: int) -> Programa:
    return obtener_por_id(session,Programa,id)