from datetime import date
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.unem_db_models import PeriodoAcademico, Seccion


def validar_seccion_para_nueva_operacion(
    session: Session,
    id_sec: int,
    id_per: Optional[int] = None,
) -> Seccion:
    seccion = session.get(Seccion, id_sec)
    if not seccion or seccion.estatus != "A":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La sección no existe o está inactiva.",
        )

    if seccion.id_per is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Asigne un período académico a la sección antes de crear matrículas o asignaciones.",
        )

    if id_per is not None and id_per != seccion.id_per:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El período de la asignación debe coincidir con el período académico de la sección.",
        )

    periodo = session.get(PeriodoAcademico, seccion.id_per)
    if periodo is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El período académico asociado a la sección no existe.",
        )

    if periodo.fecha_fin < date.today():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El período académico «{periodo.nombre}» finalizó el {periodo.fecha_fin}; no se permiten nuevas matrículas ni asignaciones.",
        )

    return seccion
