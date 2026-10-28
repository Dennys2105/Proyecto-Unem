from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.models.unem_db_models import Docente
from app.schemas.esq_docente import DocenteCreate,DocenteReplace,DocenteResponse,DocenteUpdate
import app.service.docentes_service as service
from app.dependencies.pruebas_optimizacion import validar_unicidad

router= APIRouter(
    prefix="/docentes",
    tags=["Docentes"]
)

# --- CREATE ---
@router.post("/", response_model=DocenteResponse, status_code=status.HTTP_201_CREATED)
def crear_docente(docente_in: DocenteCreate, session: Session = Depends(get_session)):
    usu_id = service.existe_llave_foranea_usu(session,docente_in.id_usu)
    mun_id = service.existe_llave_foranea_mun(session,docente_in.id_mun)
    if not usu_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no existe")
    elif not mun_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Municipio no existe")
    
    validar_unicidad(Docente,["id_usu","cedula"])(docente_in,session)
    return service.crear(session, docente_in)

# --- READ ALL ---
@router.get("/", response_model=List[DocenteResponse])
def leer_docentes(session: Session = Depends(get_session)):
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{docente_id}", response_model=DocenteResponse)
def leer_docente_id(docente_id: int, session: Session = Depends(get_session)):
    dato = service.obtener_dato_por_id(docente_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{docente_id}", response_model=DocenteResponse)
def actualizar_parcial_docente(docente_id: int, dato_in: DocenteUpdate, session: Session = Depends(get_session)):
    if not service.existe_llave_foranea_usu(session,dato_in.id_mun):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Municipio no existe")
    validar_unicidad(Docente,["id_usu","cedula"],"id_doc")(dato_in,session,docente_id)
    db_dato = service.obtener_dato_por_id(docente_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{docente_id}", status_code=status.HTTP_200_OK)
def eliminar_docente(docente_id: int, session: Session = Depends(get_session)):
    db_dato = service.obtener_dato_por_id(docente_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Docente eliminado exitosamente"}