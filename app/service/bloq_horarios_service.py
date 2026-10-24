from sqlmodel import Session,select
from typing import Optional
from app.models.unem_db_models import BloqueHorario
from app.schemas.esq_bloque_horario import BloqueHorarioResponse,BloqueHorarioCreate,BloqueHorarioUpdate,BloqueHorarioReplace
from app.dependencies.bloq_horaio_deps import validar_horas
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def cond_inicio_fin(session: Session, datos_in: BloqueHorario, id= int):
    inicio = datos_in.hora_inicio
    fin = datos_in.hora_fin
    
    if not inicio and not fin:
        return True
    
    if not inicio:
        statement = select(BloqueHorario.hora_inicio).where(BloqueHorario.id_bloq == id)
        inicio = session.exec(statement).first()
    elif not fin:
        statement = select(BloqueHorario.hora_fin).where(BloqueHorario.id_bloq == id)
        fin = session.exec(statement).first()
    
    if inicio > fin:
        return True
    else:
        return False

def crear(session: Session, datos_in: BloqueHorarioCreate) -> BloqueHorario:
    validar_horas(datos_in.hora_inicio, datos_in.hora_fin)
    return crear_registro(db=session,modelo=BloqueHorario,datos_in=datos_in)

def leer_todos(session: Session) -> list[BloqueHorario]:
    return obtener_todos_activos(db=session,modelo=BloqueHorario)

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[BloqueHorario]:
    return obtener_por_id(db=session,modelo=BloqueHorario,id=dato_id)

def actualizar(session: Session, db_dato: BloqueHorario, dato_in: BloqueHorarioUpdate, parcial: bool = True) -> BloqueHorario:
    # Obtenemos los valores nuevos o mantenemos los que ya estaban en la BD si no se enviaron (parcial)
    nueva_hora_inicio = dato_in.hora_inicio if dato_in.hora_inicio is not None else db_dato.hora_inicio
    nueva_hora_fin = dato_in.hora_fin if dato_in.hora_fin is not None else db_dato.hora_fin
    
    validar_horas(nueva_hora_inicio,nueva_hora_fin)
    
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: BloqueHorario) -> None:
    eliminar_logico(db=session, db_obj=db_dato)