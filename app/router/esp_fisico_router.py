from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from sqlmodel import Session, text
from app.config.db_conection import get_session
from app.schemas.esq_espacio_fisico import EspacioFisicoCreate,EspacioFisicoRead,EspacioFisicoResponse,EspacioFisicoUpdate
import app.service.esp_fis_service as service
from app.dependencies.auth_deps import verificar_permiso
from typing import Optional, List

router= APIRouter(
    prefix="/esp_fisico",
    tags=["Espacio Fisico"]
)

# --- CREATE ---
@router.post("/", response_model=EspacioFisicoResponse, status_code=status.HTTP_201_CREATED)
def crear_espacio(esp_in: EspacioFisicoCreate, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('espacios', 'CRE','TODO'))):
    mun_id = service.existe_llave_foranea_mun(session,esp_in.id_mun)
    if not mun_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El Municipio no existe")
    
    return service.crear(session, esp_in)

@router.get("/", response_model=List[EspacioFisicoRead])
def listar_espacios(
    tipo: Optional[str] = Query(None, description="Filtrar por tipo (Aula, Laboratorio, Auditorio, Cancha)"),
    disponible: Optional[bool] = Query(None, description="Filtrar por disponibilidad"),
    capacidad_min: Optional[int] = Query(None, description="Capacidad mínima"),
    busqueda: Optional[str] = Query(None, description="Buscar por nombre o ubicación"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("espacios", "LEC", "TODO"))
):
    return service.leer_todos(session,tipo,disponible,capacidad_min,busqueda)

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{espacio_id}", response_model=EspacioFisicoResponse)
def actualizar_parcial_espacio(esp_id: int, dato_in: EspacioFisicoUpdate, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('espacios','ACT','LIM'))):
    if not service.existe_llave_foranea_mun(session,dato_in.id_mun):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Municipio no encontrado")
    
    db_dato = service.obtener_dato_por_id(esp_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)

# --- DELETE LOGICO ---
@router.delete("/{espacio_id}", status_code=status.HTTP_200_OK)
def eliminar_espacio(esp_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('infraestrutura','BOR','TODO'))):
    db_dato = service.obtener_dato_por_id(esp_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Aula eliminada exitosamente"}