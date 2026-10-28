from sqlmodel import Session,select
from sqlalchemy.orm import selectinload
from typing import Optional
from app.models.unem_db_models import MallaCurricular, Materia, Programa
from app.schemas.esq_malla_curricular import MallaCurricularResponse,MallaCurricularReplace,MallaCurricularCreate,MallaCurricularUpdate
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)

def crear(session: Session, datos_in: MallaCurricularCreate) -> MallaCurricular:
    db_obj = crear_registro(db=session,modelo=MallaCurricular,datos_in=datos_in)
    return obtener_dato_por_id(db_obj.id_malla, session)
    
def leer_todos(session: Session) -> list[MallaCurricular]:
    statement = (
        select(MallaCurricular)
        .where(MallaCurricular.estatus == 'A')
        .options(
            selectinload(MallaCurricular.programa),
            selectinload(MallaCurricular.materia),
            selectinload(MallaCurricular.prerequisito_materia)
        )
    )
    return session.exec(statement).all()

def obtener_dato_por_id(dato_id: int, session:Session) -> Optional[MallaCurricular]:
    statement = (
        select(MallaCurricular)
        .where(MallaCurricular.id_malla == dato_id, MallaCurricular.estatus == 'A')
        .options(
            selectinload(MallaCurricular.programa),
            selectinload(MallaCurricular.materia),
            selectinload(MallaCurricular.prerequisito_materia)
        )
    )
    return session.exec(statement).first()

def actualizar(session: Session, db_dato: MallaCurricular, dato_in: MallaCurricularUpdate, parcial: bool = True) -> MallaCurricular:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: MallaCurricular) -> None:
    eliminar_logico(db=session, db_obj=db_dato)

def existe_llave_foranea_mat(session: Session, id: int) -> Materia:
    return obtener_por_id(session,Materia,id)

def existe_llave_foranea_pro(session: Session, id: int) -> Programa:
    return obtener_por_id(session,Programa,id)