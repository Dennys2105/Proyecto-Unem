from sqlmodel import Session
from typing import Optional
from app.models.unem_db_models import PeriodoAcademico
from app.schemas.esq_periodos_aca import PeriodoCreate,PeriodoUpdate,PeriodoResposive
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear(session: Session, datos_in: PeriodoCreate) -> PeriodoAcademico:
    return crear_registro(db=session,modelo=PeriodoAcademico,datos_in=datos_in)

def leer_todos(session: Session) -> list[PeriodoAcademico]:
    return obtener_todos_activos(db=session,modelo=PeriodoAcademico)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[PeriodoAcademico]:
    return obtener_por_id(db=session,modelo=PeriodoAcademico,id=dato_id)

def actualizar(session: Session, db_dato: PeriodoAcademico, dato_in: PeriodoUpdate, parcial: bool = True) -> PeriodoAcademico:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: PeriodoAcademico) -> None:
    eliminar_logico(db=session, db_obj=db_dato)