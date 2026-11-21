from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.models.unem_db_models import Estudiante
from app.dependencies.session_auditable import get_session_auditable as get_session

from app.schemas.esq_estudiante import EstudianteCreate,EstudianteReplace,EstudianteResponse,EstudianteUpdate
import app.service.estudiante_service as service
from app.dependencies.pruebas_optimizacion import validar_unicidad
from app.dependencies.auth_deps import requerir_rol,recurso_propietario,obtener_usuario_actual,verificar_permiso, docente_del_usuario, secciones_del_docente, es_docente_sp
from sqlmodel import select

router= APIRouter(
    prefix="/estudiantes",
    tags=["Estudiantes"]
)

# --- CREATE ---
@router.post("/", response_model=EstudianteResponse, status_code=status.HTTP_201_CREATED)
def crear_estudiante(estudiante_in: EstudianteCreate, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('estudiantes','CRE','LIM'))):
    usuario = service.existe_llave_foranea_usu(session,estudiante_in.id_usu)
    municipio = service.existe_llave_foranea_mun(session,estudiante_in.id_mun)
    prog = service.existe_llave_foranea_pro(session,estudiante_in.id_pro)
    seccion = service.existe_llave_foranea_usu(session,estudiante_in.id_sec)
    
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no existe")
    elif not municipio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Municipio no existe")
    elif not prog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no existe")
    elif not seccion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seccion no existe")
    
    validar_unicidad(Estudiante,['cedula',"id_usu"])(estudiante_in,session)
    return service.crear(session, estudiante_in)

# --- READ ALL ---
@router.get("/", response_model=List[EstudianteResponse])
def leer_estudiantes(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('estudiantes', 'LEC', 'SP'))
):
    # DOCENTE con SP: solo estudiantes de SUS secciones
    if es_docente_sp(usuario_actual):
        id_doc = docente_del_usuario(usuario_actual, session)
        if id_doc is None:
            return []
        secs = secciones_del_docente(session, id_doc)
        if not secs:
            return []
        statement = select(Estudiante).where(Estudiante.id_sec.in_(secs)).order_by(Estudiante.id_est)
        return session.exec(statement).all()
    statement = select(Estudiante).order_by(Estudiante.id_est)
    return session.exec(statement).all()

# --- READ ONE ---
@router.get("/{estudiante_id}", response_model=EstudianteResponse)
def leer_estudiante_id(estudiante_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('estudiantes','LEC','SP'))):
    recurso_propietario(usuario_actual,estudiante_id,[4])
    dato = service.obtener_dato_por_id(estudiante_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{estudiante_id}", response_model=EstudianteResponse)
def actualizar_parcial_estudiante(
    estudiante_id: int,                          
    dato_in: EstudianteUpdate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('estudiantes', 'ACT', 'LIM'))
):
    db_dato = service.obtener_dato_por_id(estudiante_id, session)
    if not db_dato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estudiante no encontrado"
        )
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{estudiante_id}", status_code=status.HTTP_200_OK)
def eliminar_estudiante(estudiante_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('estudiantes','BOR','LIM'))):
    db_dato = service.obtener_dato_por_id(estudiante_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Estudiante eliminada exitosamente"}