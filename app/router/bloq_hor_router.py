from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.schemas.esq_bloque_horario import BloqueHorarioCreate,BloqueHorarioReplace,BloqueHorarioResponse,BloqueHorarioUpdate
import app.service.bloq_horarios_service as service

router= APIRouter(
    prefix="/bloq_hor",
    tags=["Bloques Horarios"]
)

# --- CREATE ---
@router.post("/", response_model=BloqueHorarioResponse, status_code=status.HTTP_201_CREATED)
def crear_bloque_horario(bloq_in: BloqueHorarioCreate, session: Session = Depends(get_session)):
    return service.crear(session, bloq_in)

# --- READ ALL ---
@router.get("/", response_model=List[BloqueHorarioResponse])
def leer_bloques_horarios(session: Session = Depends(get_session)):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{bloque_id}", response_model=BloqueHorarioResponse)
def leer_bloque_horario_id(bloq_id: int, session: Session = Depends(get_session)):
    dato = service.obtener_dato_por_id(bloq_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloque Horario no encontrado")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{bloque_id}", response_model=BloqueHorarioResponse)
def actualizar_parcial_bloque_horario(bloq_id: int, dato_in: BloqueHorarioUpdate, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(bloq_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloque Horario no encontrado")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{bloque_id}", status_code=status.HTTP_200_OK)
def eliminar_bloque_horario(bloq_id: int, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(bloq_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloque Horario no encontrado")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Bloque Horario eliminado exitosamente"}