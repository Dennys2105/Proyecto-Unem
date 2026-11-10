from sqlmodel import Session
from typing import Optional
from app.models.unem_db_models import Nota, Estudiante, MallaCurricular, PeriodoAcademico
from app.schemas.esq_seccion import SeccionCreate,SeccionResponse,SeccionUpdate,SeccionReplace
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear(session: Session, datos_in: SeccionCreate) -> Nota:
    return crear_registro(db=session,modelo=Nota,datos_in=datos_in)

def leer_todos(session: Session) -> list[Nota]:
    return obtener_todos_activos(db=session,modelo=Nota)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[Nota]:
    return obtener_por_id(db=session,modelo=Nota,id=dato_id)

def actualizar(session: Session, db_dato: Nota, dato_in: SeccionUpdate, parcial: bool = True) -> Nota:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: Nota) -> None:
    eliminar_logico(db=session, db_obj=db_dato)

def existe_llave_foranea_est(session: Session, id: int) -> Estudiante:
    return obtener_por_id(session,Estudiante,id)

def existe_llave_foranea_malla(session: Session, id: int) -> MallaCurricular:
    return obtener_por_id(session,MallaCurricular,id)

def existe_llave_foranea_per(session: Session, id: int) -> PeriodoAcademico:
    return obtener_por_id(session,PeriodoAcademico,id)