from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.config.db_conection import get_session
from app.schemas.esq_auth import UserRegister, UsuarioResposive, UsuarioWithCredencialesResposive, UsuarioUpdate
from app.schemas.esq_update_user import UpdateUserDocente, UpdateUserDocenteResponse, UpdateUserEstudiante,UpdateUserEstudianteResponse
from app.models.unem_db_models import Usuario
import app.service.auth_service as service
from app.service.docentes_service import actualizar as actualizar_docente
from app.service.estudiante_service import actualizar as actualizar_estudiante
from fastapi.security import OAuth2PasswordRequestForm
from app.dependencies.auth_deps import requerir_rol, verificar_permiso
from app.dependencies.pruebas_optimizacion import validar_unicidad

router= APIRouter(
    prefix="/usuario",
    tags=["Autenticacion"]
)

# --- CREATE ---
@router.post("/register", response_model=UsuarioResposive, status_code=status.HTTP_201_CREATED)
def registrar(auth_in: UserRegister, session: Session = Depends(get_session)):
    validar_unicidad(Usuario,["email","username"]) (auth_in,session)
    return service.registrar_usuario(session, datos=auth_in)

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    return service.iniciar_sesion(form_data, session)

# --- read all ---
@router.get("/listar_usuarios", response_model=List[UsuarioWithCredencialesResposive])
def listar_usuarios(session: Session = Depends(get_session), usuario_actual: dict = Depends(verificar_permiso('usuarios', 'LEC','TODO'))):
    return service.listar_usuarios(session)

# --- read by id ---
@router.get("/{usuario_id}", response_model=UsuarioWithCredencialesResposive)
def obtener_usuario(usuario_id: int, session: Session = Depends(get_session), usuario_actual: dict = Depends(verificar_permiso('usuarios','LEC','SP'))):
    resultado = service.obtener_usuario_con_credenciales_por_id(session, usuario_id)
    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Usuario no encontrado"
        )
    return resultado

# --- updates ---
@router.put("/docente/{user_id}", response_model=UpdateUserDocenteResponse)
def actualizar_docente_endpoint(
    user_id: int, data: UpdateUserDocente, session: Session = Depends(get_session), usuario_actual: dict = Depends(verificar_permiso('usuarios','ACT','TODO'))
):
    try:
        db_user = service.obtener_dato_por_id(user_id, session)
        if not db_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

        db_docente = service.obtener_user_informacion(session, user_id, 1) # 1 = Docente
        if not db_docente:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
        
        # Actualizamos la tabla general de usuarios con su respectivo payload
        service.actualizar_usuario(session, db_user, data.usuario, parcial=True)
        # Actualizamos el perfil específico del docente
        actualizar_docente(session, db_docente, data.docente, parcial=True)

        return {
            "usuario": db_user,
            "docente": db_docente
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al actualizar: {str(e)}")


@router.put("/estudiante/{user_id}", response_model=UpdateUserEstudianteResponse)
def actualizar_estudiante_endpoint(
    user_id: int, data: UpdateUserEstudiante, session: Session = Depends(get_session), usuario_actual: dict = Depends(verificar_permiso('usuarios', 'ACT', 'TODO'))
):
    try:
        db_user = service.obtener_dato_por_id(user_id, session)
        if not db_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

        db_estudiante = service.obtener_user_informacion(session, user_id, 2)
        if not db_estudiante:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

        # Actualizamos la tabla general de usuarios
        service.actualizar_usuario(session, db_user, data.usuario, parcial=True)
        # Actualizamos el perfil específico del estudiante
        actualizar_estudiante(session, db_estudiante, data.estudiante, parcial=True)

        return {
            "usuario": db_user,
            "estudiante": db_estudiante
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al actualizar: {str(e)}")

#-- eliminar Usuario -- 
@router.delete("/{usuario_id}", status_code=status.HTTP_200_OK)
def eliminar_usuario(usuario_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('usuarios','BOR','TODO'))):
    db_dato = service.obtener_dato_por_id(usuario_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Usuario eliminado exitosamente"}