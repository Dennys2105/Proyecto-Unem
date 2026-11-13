from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from app.models.unem_db_models import Nota
from app.dependencies.auth_deps import verificar_permiso
from app.config.db_conection import get_session 
from app.schemas.esq_notas import NotasCreate,NotasResponcive,NotasUpdate
from app.dependencies.pruebas_optimizacion import validar_unicidad
import app.service.notas_service as service

router = APIRouter(prefix="/notas", tags=["Notas"])

# --- CREATE ---
@router.post("/", response_model= NotasResponcive, status_code=status.HTTP_201_CREATED)
def crear_nota(nota_in: NotasCreate, session: Session = Depends(get_session), usuario_actual: dict = Depends(verificar_permiso('notas','CRE','LIM'))):
    validar_unicidad(Nota,['id_est','id_malla','id_per','tipo_evaluacion'])(nota_in,session)
    est_id = service.existe_llave_foranea_est(session,nota_in.id_est)
    malla_id = service.existe_llave_foranea_malla(session,nota_in.id_malla)
    per_id = service.existe_llave_foranea_per(session,nota_in.id_per)
    if not est_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El Estudiante no existe")
    if not malla_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La Malla no existe")
    if not per_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El período académico no existe")
    
    return service.crear(session,nota_in)

# --- READ ALL ---
@router.get("/", response_model=List[NotasResponcive])
def leer_notas(session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('notas','LEC','SP'))):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{notas_id}", response_model=NotasResponcive)
def leer_seccion_id(notas_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('notas','LEC','SP'))):
    dato = service.obtener_dato_por_id(notas_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nota no encontrada")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{seccion_id}", response_model=NotasResponcive)
def actualizar_parcial_seccion(nota_id: int, dato_in: NotasUpdate, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('notas','ACT','LIM'))):
    validar_unicidad(Nota,['id_est','id_malla','id_per','tipo_evaluacion'],"id_nota")(dato_in,session,nota_id)
    
    db_dato = service.obtener_dato_por_id(nota_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nota no encontrada")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)

# --- DELETE LOGICO ---
@router.delete("/{seccion_id}", status_code=status.HTTP_200_OK)
def eliminar_seccion(seccion_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('notas','BOR','TODO'))):
    db_dato = service.obtener_dato_por_id(seccion_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notas no encontrada")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Notas eliminada exitosamente"}

