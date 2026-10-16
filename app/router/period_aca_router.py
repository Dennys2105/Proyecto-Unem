from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.schemas.esq_periodos_aca import PeriodoCreate,PeriodoUpdate, PeriodoResposive,PeriodoRemplace
import app.service.period_aca_service as service

router= APIRouter(
    prefix="/PeriodoAcademico",
    tags=["Periodo Academico"]
)

# --- CREATE ---
@router.post("/", response_model=PeriodoResposive, status_code=status.HTTP_201_CREATED)
def crear_periodo(periodo_in: PeriodoCreate, session: Session = Depends(get_session)):
    return service.crear(session, periodo_in)

# --- READ ALL ---
@router.get("/", response_model=List[PeriodoResposive])
def leer_periodos(session: Session = Depends(get_session)):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{periodo_id}", response_model=PeriodoResposive)
def leer_periodo_id(periodo_id: int, session: Session = Depends(get_session)):
    dato = service.obtener_dato_por_id(periodo_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{periodo_id}", response_model=PeriodoResposive)
def actualizar_parcial_periodo(periodo_id: int, dato_in: PeriodoUpdate, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(periodo_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{periodo_id}", status_code=status.HTTP_200_OK)
def eliminar_periodo(periodo_id: int, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(periodo_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Periodo eliminado exitosamente"}