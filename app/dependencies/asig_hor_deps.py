from sqlmodel import Session, select
from app.models.unem_db_models import AsigCargaHoraria, DisponibilidadDocente, Docente
from app.schemas.esq_asig_carga_horaria import AsigCargaHorariaCreate
from fastapi import HTTPException, status
from datetime import time

def validar_conflictos_horarios(session: Session, datos: AsigCargaHorariaCreate, carga_id_excluir: int = None):
    # 1. Validar solapamiento de docente en el mismo día y período
    query_docente = select(AsigCargaHoraria).where(
        AsigCargaHoraria.id_doc == datos.id_doc,
        AsigCargaHoraria.id_dia == datos.id_dia,
        AsigCargaHoraria.id_per == datos.id_per,
        AsigCargaHoraria.estatus == "A",
        AsigCargaHoraria.hora_inicio < datos.hora_fin,
        AsigCargaHoraria.hora_fin > datos.hora_inicio
    )
    if carga_id_excluir:
        query_docente = query_docente.where(AsigCargaHoraria.id_asig != carga_id_excluir)
        
    conflicto_docente = session.exec(query_docente).first()
    if conflicto_docente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El docente ya tiene una asignación que se cruza con este horario en el mismo día."
        )

    # 2. Validar solapamiento de espacio físico en el mismo día y período
    query_espacio = select(AsigCargaHoraria).where(
        AsigCargaHoraria.id_esp == datos.id_esp,
        AsigCargaHoraria.id_dia == datos.id_dia,
        AsigCargaHoraria.id_per == datos.id_per,
        AsigCargaHoraria.estatus == "A",
        AsigCargaHoraria.hora_inicio < datos.hora_fin,
        AsigCargaHoraria.hora_fin > datos.hora_inicio
    )
    if carga_id_excluir:
        query_espacio = query_espacio.where(AsigCargaHoraria.id_asig != carga_id_excluir)

    conflicto_espacio = session.exec(query_espacio).first()
    if conflicto_espacio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El espacio físico (aula/laboratorio) ya se encuentra ocupado en ese horario."
        )

def validar_disponibilidad_docente(
    session: Session, 
    id_doc: int, 
    id_dia: int, 
    hora_inicio: time, 
    hora_fin: time
):
    statement = select(DisponibilidadDocente).where(
        DisponibilidadDocente.id_doc == id_doc,
        DisponibilidadDocente.id_dia == id_dia,
        DisponibilidadDocente.estatus == "A",
        DisponibilidadDocente.hora_inicio <= hora_inicio,
        DisponibilidadDocente.hora_fin >= hora_fin
    )
    
    disponibilidad_valida = session.exec(statement).first()
    
    if not disponibilidad_valida:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El docente no tiene disponibilidad registrada o el horario asignado excede su disponibilidad para este día."
        )