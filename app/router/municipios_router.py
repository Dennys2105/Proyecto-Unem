from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.models.unem_db_models import Municipio
from app.schemas.esq_municipios import MunicipiosCreate,MunicipiosUpdate, MunicipiosResposive,MunicipiosRemplace
import app.service.municipios_service as service
from app.dependencies.pruebas_optimizacion import validar_unicidad

router= APIRouter(
    prefix="/Municipio",
    tags=["Municipio"]
)

# --- CREATE ---
@router.post("/", response_model=MunicipiosResposive, status_code=status.HTTP_201_CREATED)
def crear_municipio(municipio_in: MunicipiosCreate, session: Session = Depends(get_session)):
    validar_unicidad(Municipio, "nombre")(municipio_in,session)
    return service.crear(session, municipio_in)

# --- READ ALL ---
@router.get("/", response_model=List[MunicipiosResposive])
def leer_municipios(session: Session = Depends(get_session)):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{municipio_id}", response_model=MunicipiosResposive)
def leer_municipio_id(municipio_id: int, session: Session = Depends(get_session)):
    dato = service.obtener_dato_por_id(municipio_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Municipio no encontrado")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{municipio_id}", response_model=MunicipiosResposive)
def actualizar_parcial_municipio(municipio_id: int, dato_in: MunicipiosUpdate, session: Session = Depends(get_session)):
    validar_unicidad(Municipio,"nombre","id_mun")(dato_in,session,municipio_id)
    db_dato = service.obtener_dato_por_id(municipio_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Municipio no encontrado")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{municipio_id}", status_code=status.HTTP_200_OK)
def eliminar_municipio(municipio_id: int, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(municipio_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Municipio no encontrado")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Municipio eliminado exitosamente"}