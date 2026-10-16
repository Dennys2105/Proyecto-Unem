from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.dependencies.programas_deps import validar_codigo_unico
from app.schemas.esq_programas import ProgramasCreate, ProgramasRemplace, ProgramasResposive, ProgramasUpdate
import app.service.programas_service as service

router = APIRouter(
    prefix="/Programa",
    tags=["Programa"]
)

# --- CREATE ---
@router.post("/", response_model=ProgramasResposive, status_code=status.HTTP_201_CREATED)
def crear_programa(programa_in: ProgramasCreate, session: Session = Depends(get_session)):
    validar_codigo_unico(programa_in, session, id=None)
    return service.crear_programa(session, programa_in)

# --- READ ALL ---
@router.get("/", response_model=List[ProgramasResposive])
def leer_programa(session: Session = Depends(get_session)):
    return service.leer_programas(session)

# --- READ ONE ---
@router.get("/{programa_id}", response_model=ProgramasResposive)
def leer_ptograma_id(programa_id: int, session: Session = Depends(get_session)):
    programa = service.obtener_programa_por_id(programa_id, session)
    if not programa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no encontrado")
    return programa

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{programa_id}", response_model=ProgramasResposive)
def actualizar_parcial_programa(programa_id: int, programa_in: ProgramasUpdate, session: Session = Depends(get_session)):
    validar_codigo_unico(programa_in, session, id=programa_id)
    
    db_programa = service.obtener_programa_por_id(programa_id, session)
    if not db_programa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no encontrado")
    return service.actualizar_programa(session=session, db_programa=db_programa, programa_in=programa_in, parcial=True)

# --- DELETE LOGICO ---
@router.delete("/{programa_id}", status_code=status.HTTP_200_OK)
def eliminar_programa(programa_id: int, session: Session = Depends(get_session)):
    db_programa = service.obtener_programa_por_id(programa_id, session)
    if not db_programa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no encontrado")
    service.eliminar_programa(session=session, db_programa=db_programa)
    return {"message": "Programa eliminado exitosamente"}
