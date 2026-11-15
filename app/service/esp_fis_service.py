from sqlmodel import Session, text
from typing import Optional
from app.models.unem_db_models import EspacioFisico, Municipio
from app.schemas.esq_espacio_fisico import EspacioFisicoCreate,EspacioFisicoUpdate,EspacioFisicoRead
from app.service.base_services import (
    crear_registro,
    obtener_todos_activos,
    obtener_por_id,
    actualizar_registro,
    eliminar_logico
)
import app.queries.esp_fis_queries as q

def crear(session: Session, datos_in: EspacioFisicoCreate) -> EspacioFisico:
    return crear_registro(db=session,modelo=EspacioFisico,datos_in=datos_in)

def leer_todos(session: Session, tipo: str | None, disponible: str | None, capacidad_min: int | None, busqueda: str | None) -> list[EspacioFisico]:
    query = q.ESPACIO_FISICO
    params = {}
    
    if tipo:
        query += " AND e.tipo_espacio = :tipo"
        params["tipo"] = tipo
    if disponible is not None:
        query += " AND e.disponibilidad = :disponible"
        params["disponible"] = disponible
    if capacidad_min:
        query += " AND e.capacidad >= :capacidad_min"
        params["capacidad_min"] = capacidad_min
    if busqueda:
        query += " AND (e.nombre_centro ILIKE :busqueda OR e.ubicacion ILIKE :busqueda)"
        params["busqueda"] = f"%{busqueda}%"
    
    query += " GROUP BY e.id_esp, e.nombre_centro, e.ubicacion, e.tipo_espacio, e.capacidad, e.equipamiento, e.disponibilidad, m.nombre"
    query += " ORDER BY e.nombre_centro, e.ubicacion"
    
    resultados = session.exec(text(query).params(**params)).mappings().all()
    return [EspacioFisicoRead(**dict(r)) for r in resultados]

def actualizar(session: Session, db_dato: EspacioFisico, dato_in: EspacioFisicoUpdate, parcial: bool = True) -> EspacioFisico:
    return actualizar_registro(db=session, db_obj=db_dato, datos_in=dato_in, parcial=parcial)

def eliminar(session: Session, db_dato: EspacioFisico) -> None:
    eliminar_logico(db=session, db_obj=db_dato)

def existe_llave_foranea_mun(session: Session, id: int) -> Municipio:
    return obtener_por_id(session,Municipio,id)
