from sqlmodel import Session
from typing import Optional
from app.models.unem_db_models import Materia, EjeFormativo
from app.schemas.esq_materias import MateriaCreate,MateriaReplace,MateriaUpdate,MateriaResponse
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear(session: Session, datos_in: MateriaCreate) -> Materia:
    return crear_registro(db=session,modelo=Materia,datos_in=datos_in)

def leer_todos(session: Session) -> list[Materia]:
    return obtener_todos_activos(db=session,modelo=Materia)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[Materia]:
    return obtener_por_id(db=session,modelo=Materia,id=dato_id)

def actualizar(session: Session, db_dato: Materia, dato_in: MateriaUpdate, parcial: bool = True) -> Materia:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: Materia) -> None:
    eliminar_logico(db=session, db_obj=db_dato)

def existe_llave_foranea_eje(session: Session, id: int) -> EjeFormativo:
    return obtener_por_id(session,EjeFormativo,id)