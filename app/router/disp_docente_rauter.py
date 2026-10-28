from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.schemas.esq_disp_docente import DisponibilidadDocenteCreate,DisponibilidadDocenteReplace,DisponibilidadDocenteResponse,DisponibilidadDocenteUpdate
import app.service.disp_docente_service as service


router= APIRouter(
    prefix="/disp_docente",
    tags=["Disponibilidad Docente"]
)

# --- CREATE ---
@router.post("/", response_model=DisponibilidadDocenteResponse, status_code=status.HTTP_201_CREATED)
def crear_disp(disp_in: DisponibilidadDocenteCreate, session: Session = Depends(get_session)):
    dia_id = service.existe_llave_foranea_dia(session,disp_in.id_dia)
    doc_id = service.existe_llave_foranea_doc(session,disp_in.id_doc)
    if not dia_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dia no existe")
    elif not doc_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El Docente no existe")
    
    return service.crear(session, disp_in)

# --- READ ALL ---
@router.get("/", response_model=List[DisponibilidadDocenteResponse])
def leer_disp(session: Session = Depends(get_session)):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{disp_id}", response_model=DisponibilidadDocenteResponse)
def leer_disp_id(disp_id: int, session: Session = Depends(get_session)):
    dato = service.obtener_dato_por_id(disp_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campo no encontrado")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{disp_id}", response_model=DisponibilidadDocenteResponse)
def actualizar_parcial_disp(disp_id: int, dato_in: DisponibilidadDocenteUpdate, session: Session = Depends(get_session)):
    if not service.existe_llave_foranea_doc(session,dato_in.id_doc):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
    
    if not service.existe_llave_foranea_dia(session,dato_in.id_dia):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dia no encontrado")
    
    db_dato = service.obtener_dato_por_id(disp_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campo no encontrado")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{disp_id}", status_code=status.HTTP_200_OK)
def eliminar_disp(disp_id: int, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(disp_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campo no encontrado")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Campo eliminado exitosamente"}