from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.schemas.esq_auth import UserRegister, UsuarioResposive,UserLogin, UsuarioWithCredencialesResposive
import app.service.auth_service as service
from fastapi.security import OAuth2PasswordBearer,OAuth2PasswordRequestForm

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
def listar_usuarios(session: Session = Depends(get_session)):
    return service.listar_usuarios(session)