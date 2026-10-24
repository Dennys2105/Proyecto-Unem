from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.models.unem_db_models import DiaLaboral
from app.schemas.esq_dias_laborales import DiasCreate,DiasUpdate, DiasResposive,DiasRemplace
import app.service.dias_service as service
from app.dependencies.pruebas_optimizacion import validar_unicidad

router= APIRouter(
    prefix="/DiasLaborales",
    tags=["DiasLaborales"]
)

# --- CREATE ---
@router.post("/", response_model=DiasResposive, status_code=status.HTTP_201_CREATED)
def crear_dia_laboral(dia_in: DiasCreate, session: Session = Depends(get_session)):
    validar_unicidad(modelo_db=DiaLaboral, campos="dia")(datos_in=dia_in, session=session)
    return service.crear(session, dia_in)

# --- READ ALL ---
@router.get("/", response_model=List[DiasResposive])
def leer_dias_laborales(session: Session = Depends(get_session)):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{dia_id}", response_model=DiasResposive)
def leer_dia_laboral_id(dia_id: int, session: Session = Depends(get_session)):
    dato = service.obtener_dato_por_id(dia_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Día Laboral no encontrado")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{dia_id}", response_model=DiasResposive)
def actualizar_parcial_dia_laboral(dia_id: int, dato_in: DiasUpdate, session: Session = Depends(get_session)):
    validar_unicidad(modelo_db=DiaLaboral, campo="dia",nombre_id="id_dia")(datos_in=dato_in, session=session, id=dia_id)
    db_dato = service.obtener_dato_por_id(dia_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Día Laboral no encontrado")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{dia_id}", status_code=status.HTTP_200_OK)
def eliminar_dia_laboral(dia_id: int, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(dia_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Día Laboral no encontrado")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Día Laboral eliminado exitosamente"}