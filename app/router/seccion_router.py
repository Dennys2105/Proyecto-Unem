from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.models.unem_db_models import Seccion
from app.config.db_conection import get_session
from app.schemas.esq_seccion import SeccionCreate,SeccionReplace,SeccionResponse,SeccionUpdate
import app.service.seccion_service as service
from app.dependencies.pruebas_optimizacion import validar_unicidad

router= APIRouter(
    prefix="/seccion",
    tags=["Seccion"]
)

# --- CREATE ---
@router.post("/", response_model=SeccionResponse, status_code=status.HTTP_201_CREATED)
def crear_seccion(seccion_in: SeccionCreate, session: Session = Depends(get_session)):
    validar_unicidad(Seccion,['codigo'])(seccion_in,session)
    pro_id = service.existe_llave_foranea_pro(session,seccion_in.id_pro)
    if not pro_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El Programa no existe")
    
    return service.crear(session, seccion_in)

# --- READ ALL ---
@router.get("/", response_model=List[SeccionResponse])
def leer_seccion(session: Session = Depends(get_session)):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{seccion_id}", response_model=SeccionResponse)
def leer_seccion_id(seccion_id: int, session: Session = Depends(get_session)):
    dato = service.obtener_dato_por_id(seccion_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seccion no encontrada")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{seccion_id}", response_model=SeccionResponse)
def actualizar_parcial_seccion(seccion_id: int, dato_in: SeccionUpdate, session: Session = Depends(get_session)):
    validar_unicidad(Seccion,"codigo","id_sec")(dato_in,session,seccion_id)
    
    db_dato = service.obtener_dato_por_id(seccion_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seccion no encontrada")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{seccion_id}", status_code=status.HTTP_200_OK)
def eliminar_seccion(seccion_id: int, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(seccion_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seccion no encontrada")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Seccion eliminada exitosamente"}