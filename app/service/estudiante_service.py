from sqlmodel import Session
from typing import Optional
from app.models.unem_db_models import Estudiante,Usuario,Municipio,Programa, Seccion
from app.schemas.esq_estudiante import EstudianteCreate,EstudianteReplace,EstudianteResponse,EstudianteUpdate
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear(session: Session, datos_in: EstudianteCreate) -> Estudiante:
    return crear_registro(db=session,modelo=Estudiante,datos_in=datos_in)

def leer_todos(session: Session) -> list[Estudiante]:
    return obtener_todos_activos(db=session,modelo=Estudiante)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[Estudiante]:
    return obtener_por_id(db=session,modelo=Estudiante,id=dato_id)

def actualizar(session: Session, db_dato: Estudiante, dato_in: EstudianteUpdate, parcial: bool = True) -> Estudiante:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: Estudiante) -> None:
    eliminar_logico(db=session, db_obj=db_dato)

def existe_llave_foranea_usu(session: Session, id: int) -> Usuario:
    return obtener_por_id(session,Usuario,id)

def existe_llave_foranea_mun(session: Session, id: int) -> Municipio:
    return obtener_por_id(session,Municipio,id)

def existe_llave_foranea_pro(session: Session, id: int) -> Programa:
    return obtener_por_id(session,Programa,id)

def existe_llave_foranea_sec(session: Session, id: int) -> Seccion:
    return obtener_por_id(session,Seccion,id)
