from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.schemas.esq_auth import UserRegister, UsuarioResposive, UsuarioWithCredencialesResposive
import app.service.auth_service as service
from fastapi.security import OAuth2PasswordRequestForm
from app.dependencies.auth_deps import requerir_rol

router= APIRouter(
    prefix="/Auth",
    tags=["Autenticacion"]
)

# --- CREATE ---
@router.post("/register", response_model=UsuarioResposive, status_code=status.HTTP_201_CREATED)
def registrar(auth_in: UserRegister, session: Session = Depends(get_session)):
    return service.registrar_usuario(session, datos=auth_in)

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    return service.iniciar_sesion(form_data, session)

# --- read all ---
@router.get("/listar_usuarios", response_model=List[UsuarioWithCredencialesResposive])
def listar_usuarios(session: Session = Depends(get_session), usuario_actual: dict = Depends(requerir_rol([1]))):
    return service.listar_usuarios(session)

#-- eliminar Usuario -- 
@router.delete("/{usuario_id}", status_code=status.HTTP_200_OK)
def eliminar_usuario(usuario_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(requerir_rol([1]))):
    db_dato = service.obtener_dato_por_id(usuario_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Usuario eliminado exitosamente"}