from sqlmodel import Session,select
from sqlalchemy.orm import selectinload
from typing import Optional
from app.models.unem_db_models import AsigCargaHoraria,DiaLaboral, Docente,EspacioFisico,BloqueHorario,MallaCurricular,PeriodoAcademico
from app.schemas.esq_asig_carga_horaria import AsigCargaHorariaCreate,AsigCargaHorariaUpdate
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)
from app.dependencies.bloq_horaio_deps import validar_horas

def crear(session: Session, datos_in: AsigCargaHorariaCreate) -> AsigCargaHoraria:
    return crear_registro(db=session,modelo=AsigCargaHoraria,datos_in=datos_in)

def leer_todos(session: Session) -> list[AsigCargaHoraria]:
    return obtener_todos_activos(db=session,modelo=AsigCargaHoraria)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[AsigCargaHoraria]:
    return obtener_por_id(db=session,modelo=AsigCargaHoraria,id=dato_id)

def actualizar(session: Session, db_dato: AsigCargaHoraria, dato_in: AsigCargaHorariaUpdate, parcial: bool = True) -> AsigCargaHoraria:
    nueva_hora_inicio = dato_in.hora_inicio if dato_in.hora_inicio is not None else db_dato.hora_inicio
    nueva_hora_fin = dato_in.hora_fin if dato_in.hora_fin is not None else db_dato.hora_fin
    
    validar_horas(nueva_hora_inicio,nueva_hora_fin)
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: DiaLaboral) -> None:
    eliminar_logico(db=session, db_obj=db_dato)

#validar existancias de id

def existe_llave_foranea_dia(session: Session, id: int) -> DiaLaboral:
    return obtener_por_id(session,DiaLaboral,id)

def existe_llave_foranea_doc(session: Session, id: int) -> Docente:
    return obtener_por_id(session,Docente,id)

def existe_llave_foranea_esp(session: Session, id: int) -> EspacioFisico:
    return obtener_por_id(session,EspacioFisico,id)

def existe_llave_foranea_bloq(session: Session, id: int) -> BloqueHorario:
    return obtener_por_id(session,BloqueHorario,id)

def existe_llave_foranea_malla(session: Session, id: int) -> MallaCurricular:
    return obtener_por_id(session,MallaCurricular,id)

def existe_llave_foranea_per(session: Session, id: int) -> PeriodoAcademico:
    return obtener_por_id(session,PeriodoAcademico,id)
