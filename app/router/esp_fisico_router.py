from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.schemas.esq_espacio_fisico import EspacioFisicoCreate,EspacioFisicoReplace,EspacioFisicoResponse,EspacioFisicoUpdate
import app.service.esp_fis_service as service


router= APIRouter(
    prefix="/esp_fisico",
    tags=["Espacio Fisico"]
)

# --- CREATE ---
@router.post("/", response_model=EspacioFisicoResponse, status_code=status.HTTP_201_CREATED)
def crear_espacio(esp_in: EspacioFisicoCreate, session: Session = Depends(get_session)):
    mun_id = service.existe_llave_foranea_mun(session,esp_in.id_mun)
    if not mun_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El Municipio no existe")
    
    return service.crear(session, esp_in)

# --- READ ALL ---
@router.get("/", response_model=List[EspacioFisicoResponse])
def leer_espacio(session: Session = Depends(get_session)):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{espacio_id}", response_model=EspacioFisicoResponse)
def leer_espacio_id(esp_id: int, session: Session = Depends(get_session)):
    dato = service.obtener_dato_por_id(esp_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{espacio_id}", response_model=EspacioFisicoResponse)
def actualizar_parcial_espacio(esp_id: int, dato_in: EspacioFisicoUpdate, session: Session = Depends(get_session)):
    if not service.existe_llave_foranea_mun(session,dato_in.id_mun):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Municipio no encontrado")
    
    db_dato = service.obtener_dato_por_id(esp_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{espacio_id}", status_code=status.HTTP_200_OK)
def eliminar_espacio(esp_id: int, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(esp_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Aula eliminada exitosamente"}