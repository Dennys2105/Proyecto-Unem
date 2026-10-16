from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.schemas.esq_roles import RolesCreate, RolesResposive, RolesUpdate
import app.service.roles_service as service

router = APIRouter(
    prefix="/roles",
    tags=["Roles"]
)

# --- CREATE ---
@router.post("/", response_model=RolesResposive, status_code=status.HTTP_201_CREATED)
def crear_roles(rol_in: RolesCreate, session: Session = Depends(get_session)):
    return service.crear_rol(session, rol_in)

# --- READ ALL ---
@router.get("/", response_model=List[RolesResposive])
def leer_roles(session: Session = Depends(get_session)):
    return service.leer_roles(session)

# --- READ ONE ---
@router.get("/{rol_id}", response_model=RolesResposive)
def leer_rol_id(rol_id: int, session: Session = Depends(get_session)):
    rol = service.obtener_rol_por_id(rol_id, session)
    if not rol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
    return rol

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{rol_id}", response_model=RolesResposive)
def actualizar_parcial_rol(rol_id: int, rol_in: RolesUpdate, session: Session = Depends(get_session)):
    db_rol = service.obtener_rol_por_id(rol_id, session)
    if not db_rol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
    return service.actualizar_rol(session=session, db_rol=db_rol, rol_in=rol_in, parcial=True)

# --- DELETE LOGICO ---
@router.delete("/{rol_id}", status_code=status.HTTP_200_OK)
def eliminar_rol(rol_id: int, session: Session = Depends(get_session)):
    db_rol = service.obtener_rol_por_id(rol_id, session)
    if not db_rol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
    service.eliminar_rol(session=session, db_rol=db_rol)
    return {"message": "Rol eliminado exitosamente"}