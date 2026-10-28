from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.schemas.esq_asig_carga_horaria import AsigCargaHorariaCreate,AsigCargaHorariaReplace,AsigCargaHorariaResponse,AsigCargaHorariaUpdate
import app.service.asig_carga_hor_service as service


router= APIRouter(
    prefix="/asig_carga_hor",
    tags=["Carga Horraria"]
)

# --- CREATE ---
@router.post("/", response_model=AsigCargaHorariaResponse, status_code=status.HTTP_201_CREATED)
def crear_disp(disp_in: AsigCargaHorariaCreate, session: Session = Depends(get_session)):
    dia_id = service.existe_llave_foranea_dia(session,disp_in.id_dia)
    doc_id = service.existe_llave_foranea_doc(session,disp_in.id_doc)
    malla_id = service.existe_llave_foranea_malla(session,disp_in.id_malla)
    per_id = service.existe_llave_foranea_per(session,disp_in.id_per)
    bloq_id = service.existe_llave_foranea_bloq(session,disp_in.id_bloq)
    esp_id = service.existe_llave_foranea_esp(session,disp_in.id_esp)
    if not dia_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dia no existe")
    elif not doc_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El Docente no existe")
    elif not malla_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Malla no existe")
    elif not per_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="periodo no existe")
    elif not bloq_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloque no existe")
    elif not esp_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Espacio no existe")
    
    return service.crear(session, disp_in)

# --- READ ALL ---
@router.get("/", response_model=List[AsigCargaHorariaResponse])
def leer_disp(session: Session = Depends(get_session)):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{disp_id}", response_model=AsigCargaHorariaResponse)
def leer_disp_id(disp_id: int, session: Session = Depends(get_session)):
    dato = service.obtener_dato_por_id(disp_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campo no encontrado")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{disp_id}", response_model=AsigCargaHorariaResponse)
def actualizar_parcial_disp(disp_id: int, dato_in: AsigCargaHorariaUpdate, session: Session = Depends(get_session)):
    if not service.existe_llave_foranea_dia(session,dato_in.id_dia):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dia no existe")
    
    elif not service.existe_llave_foranea_doc(session,dato_in.id_doc):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El Docente no existe")
    
    elif not service.existe_llave_foranea_malla(session,dato_in.id_malla):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Malla no existe")
    
    elif not service.existe_llave_foranea_per(session,dato_in.id_per):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="periodo no existe")
    
    elif not service.existe_llave_foranea_bloq(session,dato_in.id_bloq):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloque no existe")
    
    elif not service.existe_llave_foranea_esp(session,dato_in.id_esp):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Espacio no existe")
    
    db_dato = service.obtener_dato_por_id(disp_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campo no encontrado")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)

@router.delete("/{malla_id}", status_code=status.HTTP_200_OK)
def eliminar_malla(malla_id: int, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(malla_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dato no encontrada")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Dato eliminada exitosamente"}