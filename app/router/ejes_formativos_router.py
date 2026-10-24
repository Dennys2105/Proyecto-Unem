from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.models.unem_db_models import EjeFormativo
from app.schemas.esq_eje_formativo import EjeCreate,EjeRemplace,EjeResposive,EjeUpdate
import app.service.ejes_formativos_service as service
from app.dependencies.pruebas_optimizacion import validar_unicidad

router= APIRouter(
    prefix="/EjesFormativos",
    tags=["EjesFormativos"]
)

# --- CREATE ---
@router.post("/", response_model=EjeResposive, status_code=status.HTTP_201_CREATED)
def crear_eje_formativo(eje_in: EjeCreate, session: Session = Depends(get_session)):
    validar_unicidad(EjeFormativo,"codigo")(eje_in,session)
    return service.crear(session, eje_in)

# --- READ ALL ---
@router.get("/", response_model=List[EjeResposive])
def leer_ejes_formativos(session: Session = Depends(get_session)):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{eje_id}", response_model=EjeResposive)
def leer_eje_formativo_id(eje_id: int, session: Session = Depends(get_session)):
    dato = service.obtener_dato_por_id(eje_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Eje Formativo no encontrado")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{eje_id}", response_model=EjeResposive)
def actualizar_parcial_eje_formativo(eje_id: int, dato_in: EjeUpdate, session: Session = Depends(get_session)):
    validar_unicidad(EjeFormativo,"codigo","id_eje")(dato_in,session,eje_id)
    db_dato = service.obtener_dato_por_id(eje_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Eje Formativo no encontrado")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{eje_id}", status_code=status.HTTP_200_OK)
def eliminar_eje_formativo(eje_id: int, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(eje_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Eje Formativo no encontrado")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Eje Formativo eliminado exitosamente"}