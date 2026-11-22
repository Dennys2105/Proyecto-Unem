from sqlmodel import Session, select, update
from app.models.unem_db_models import PeriodoAcademico

def obtener_todos(session: Session):
    statement = select(PeriodoAcademico).order_by(PeriodoAcademico.anio.desc(), PeriodoAcademico.numero_periodo)
    return session.exec(statement).all()

def obtener_dato_por_id(periodo_id: int, session: Session):
    return session.get(PeriodoAcademico, periodo_id)

def crear(session: Session, dato_in):
    db_obj = PeriodoAcademico(**dato_in.model_dump())
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj

def actualizar(session: Session, db_dato, dato_in, parcial: bool = False):
    datos_dict = dato_in.model_dump(exclude_unset=True) if parcial else dato_in.model_dump()
    for key, value in datos_dict.items():
        setattr(db_dato, key, value)
    session.add(db_dato)
    session.commit()
    session.refresh(db_dato)
    return db_dato

def eliminar(session: Session, db_dato):
    db_dato.estatus = 'I'
    db_dato.activo = False
    session.add(db_dato)
    session.commit()
    session.refresh(db_dato)
    return db_dato