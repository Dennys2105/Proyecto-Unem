from sqlmodel import Session, text
from app.models.model_read_only import VwHorarioCompletoDocenteRead, VwMovimientosRead
import app.queries.analitics_queries as q
from datetime import date


def aud_avanzada(tabla: str | None, usuario: str | None, fecha_inicio: date | None, session: Session):
    query = q.SQL_CONSULTAR_AUDITORIA_AVANZADA
    params = {}

    if tabla:
        query += " AND am.tabla_mod = :tabla"
        params["tabla"] = tabla
    if usuario:
        query += " AND u.username ILIKE :usuario"
        params["usuario"] = f"%{usuario}%"
    if fecha_inicio:
        query += " AND am.fec_hor >= :fecha_inicio"
        params["fecha_inicio"] = fecha_inicio

    query += " ORDER BY am.fec_hor DESC LIMIT 100"

    resultados = session.exec(text(query).params(**params)).mappings().all()
    return [VwMovimientosRead(**row) for row in resultados]

def horario_comp_doc(cedula: str | None, cod_materia: str | None, cod_programa: str|None,session: Session):
    
    # Construcción dinámica ajustada exactamente a los campos de la vista personas.vw_horario_completo_docente
    query = q.SQL_HORARIO_DOCENTE
    params = {}
    
    if cedula:
        query += " AND cedula = :cedula"
        params["cedula"] = cedula
    if cod_materia:
        query += " AND cod_materia ILIKE :cod_materia"
        params["cod_materia"] = f"%{cod_materia}%"
    if cod_programa:
        query += " AND cod_programa ILIKE :cod_programa"
        params["cod_programa"] = f"%{cod_programa}%"
        
    query += " ORDER BY hora_inicio ASC LIMIT 100"
    
    resultados = session.exec(text(query).params(**params)).mappings().all()
    
    return [VwHorarioCompletoDocenteRead(**row) for row in resultados]

