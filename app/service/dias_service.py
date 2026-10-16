from sqlmodel import Session
from typing import Optional
from app.models.unem_db_models import DiaLaboral
from app.schemas.esq_dias_laborales import DiasCreate,DiasRemplace,DiasUpdate
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear(session: Session, datos_in: DiasCreate) -> DiaLaboral:
    return crear_registro(db=session,modelo=DiaLaboral,datos_in=datos_in)

def leer_todos(session: Session) -> list[DiaLaboral]:
    return obtener_todos_activos(db=session,modelo=DiaLaboral)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[DiaLaboral]:
    return obtener_por_id(db=session,modelo=DiaLaboral,id=dato_id)

def actualizar(session: Session, db_dato: DiaLaboral, dato_in: DiasUpdate, parcial: bool = True) -> DiaLaboral:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: DiaLaboral) -> None:
    eliminar_logico(db=session, db_obj=db_dato)