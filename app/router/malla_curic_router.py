from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.schemas.esq_malla_curricular import MallaCurricularCreate,MallaCurricularUpdate, MallaCurricularResponse,MallaCurricularReplace
import app.service.malla_curicular_service as service

router= APIRouter(
    prefix="/malla_curicular",
    tags=["Malla Curicular"]
)

# --- CREATE ---
@router.post("/", response_model=MallaCurricularResponse, status_code=status.HTTP_201_CREATED)
def crear_mallal(dia_in: MallaCurricularCreate, session: Session = Depends(get_session)):
    id_pro = service.existe_llave_foranea_pro(session,dia_in.id_pro)
    id_mat = service.existe_llave_foranea_mat(session,dia_in.id_mat)
    id_pre_mat = service.existe_llave_foranea_mat(session,dia_in.perequisito_id_mat)
    if not id_pro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no existe")
    elif not id_mat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La Materia no existe")
    
    elif not id_pre_mat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La Materia de prerequisito no existe")
    
    return service.crear(session, dia_in)

# --- READ ALL ---
@router.get("/", response_model=List[MallaCurricularResponse])
def leer_malla(session: Session = Depends(get_session)):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{malla_id}", response_model=MallaCurricularResponse)
def leer_malla_id(malla_id: int, session: Session = Depends(get_session)):
    dato = service.obtener_dato_por_id(malla_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Malla no encontrado")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{malla_id}", response_model=MallaCurricularResponse)
def actualizar_parcial_malla(malla_id: int, dato_in: MallaCurricularUpdate, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(malla_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Malla no encontrado")
    
    id_pro = service.existe_llave_foranea_pro(session,dato_in.id_pro)
    id_mat = service.existe_llave_foranea_mat(session,dato_in.id_mat)
    id_pre_mat = service.existe_llave_foranea_mat(session,dato_in.perequisito_id_mat)
    if not id_pro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no existe")
    elif not id_mat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La Materia no existe")
    elif not id_pre_mat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La Materia de prerequisito no existe")
    
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{malla_id}", status_code=status.HTTP_200_OK)
def eliminar_malla(malla_id: int, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(malla_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Malla no encontrada")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Malla eliminada exitosamente"}