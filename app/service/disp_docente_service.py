from sqlmodel import Session,select
from typing import Optional
from app.models.unem_db_models import DisponibilidadDocente, DiaLaboral, Docente
from app.dependencies.bloq_horaio_deps import validar_horas
from app.schemas.esq_disp_docente import DisponibilidadDocenteCreate,DisponibilidadDocenteReplace,DisponibilidadDocenteResponse,DisponibilidadDocenteUpdate
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear(session: Session, datos_in: DisponibilidadDocenteCreate) -> DisponibilidadDocente:
    return crear_registro(db=session,modelo=DisponibilidadDocente,datos_in=datos_in)

def leer_todos(session: Session) -> list[DisponibilidadDocente]:
    return obtener_todos_activos(db=session,modelo=DisponibilidadDocente)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[DisponibilidadDocente]:
    return obtener_por_id(db=session,modelo=DisponibilidadDocente,id=dato_id)

def actualizar(session: Session, db_dato: DisponibilidadDocente, dato_in: DisponibilidadDocenteUpdate, parcial: bool = True) -> DisponibilidadDocente:
    # Obtenemos los valores nuevos o mantenemos los que ya estaban en la BD si no se enviaron (parcial)
    nueva_hora_inicio = dato_in.hora_inicio if dato_in.hora_inicio is not None else db_dato.hora_inicio
    nueva_hora_fin = dato_in.hora_fin if dato_in.hora_fin is not None else db_dato.hora_fin
    
    validar_horas(nueva_hora_inicio,nueva_hora_fin)
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: DisponibilidadDocente) -> None:
    eliminar_logico(db=session, db_obj=db_dato)

def existe_llave_foranea_doc(session: Session, id: int) -> Docente:
    return obtener_por_id(session,Docente,id)

def existe_llave_foranea_dia(session: Session, id: int) -> DiaLaboral:
    return obtener_por_id(session,DiaLaboral,id)