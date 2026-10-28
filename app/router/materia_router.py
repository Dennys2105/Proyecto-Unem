from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.models.unem_db_models import Materia
from app.config.db_conection import get_session
from app.schemas.esq_materias import MateriaCreate,MateriaReplace,MateriaResponse,MateriaUpdate
import app.service.materias_service as service
from app.dependencies.pruebas_optimizacion import validar_unicidad

router= APIRouter(
    prefix="/Materia",
    tags=["Materia"]
)

# --- CREATE ---
@router.post("/", response_model=MateriaResponse, status_code=status.HTTP_201_CREATED)
def crear_materia(materia_in: MateriaCreate, session: Session = Depends(get_session)):
    validar_unicidad(Materia,['codigo'])(materia_in,session)
    mun_id = service.existe_llave_foranea_eje(session,materia_in.id_eje)
    if not mun_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El Eje Formativo no existe")
    
    return service.crear(session, materia_in)

# --- READ ALL ---
@router.get("/", response_model=List[MateriaResponse])
def leer_materia(session: Session = Depends(get_session)):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{materia_id}", response_model=MateriaResponse)
def leer_materia_id(materia_id: int, session: Session = Depends(get_session)):
    dato = service.obtener_dato_por_id(materia_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{materia_id}", response_model=MateriaResponse)
def actualizar_parcial_materia(materia_id: int, dato_in: MateriaUpdate, session: Session = Depends(get_session)):
    if not service.existe_llave_foranea_eje(session,dato_in.id_eje):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Eje Formativo no encontrado")
    
    db_dato = service.obtener_dato_por_id(materia_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{materia_id}", status_code=status.HTTP_200_OK)
def eliminar_materia(materia_id: int, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(materia_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Materia eliminada exitosamente"}