from sqlmodel import Session, select
from typing import List, Optional
from app.models.unem_db_models import Programa
from app.schemas.esq_programas import ProgramasRemplace, ProgramasCreate, ProgramasUpdate
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear_programa (session: Session, programa_in: ProgramasCreate) -> Programa:
    return crear_registro(db=session,modelo=Programa,datos_in=programa_in)

def leer_programas(session: Session) -> list[Programa]:
    return obtener_todos_activos(db=session,modelo=Programa)

def obtener_programa_por_id(programa_id: int, session:Session) -> Optional[Programa]:
    return obtener_por_id(db=session,modelo=Programa,id=programa_id)

def actualizar_programa(session: Session, db_programa: Programa, programa_in: ProgramasUpdate, parcial: bool = True) -> Programa:
    return actualizar_registro(db=session, db_obj=db_programa, datos_in=programa_in, parcial=parcial)

def eliminar_programa(session: Session, db_programa: Programa) -> None:
    eliminar_logico(db=session, db_obj=db_programa)
