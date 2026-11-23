from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlmodel import Session
from app.models.unem_db_models import Estudiante, AsigCargaHoraria
from app.dependencies.session_auditable import get_session_auditable as get_session

from app.schemas.esq_estudiante import EstudianteCreate,EstudianteReplace,EstudianteResponse,EstudianteUpdate,EstudianteCambioEstado
import app.service.estudiante_service as service
from app.dependencies.pruebas_optimizacion import validar_unicidad
from app.dependencies.auth_deps import requerir_rol,recurso_propietario,obtener_usuario_actual,verificar_permiso, docente_del_usuario, secciones_del_docente, es_docente_sp
from app.dependencies.seccion_deps import validar_seccion_para_nueva_operacion
from sqlmodel import select

router= APIRouter(
    prefix="/estudiantes",
    tags=["Estudiantes"]
)

# --- CREATE ---
@router.post("/", response_model=EstudianteResponse, status_code=status.HTTP_201_CREATED)
def crear_estudiante(estudiante_in: EstudianteCreate, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('estudiantes','CRE','LIM'))):
    # Las tres vinculaciones son opcionales en personas.estudiantes (BD 4.3).
    # Una sección sí determina un programa; no permitir programas contradictorios.
    if estudiante_in.id_usu is not None and not service.existe_llave_foranea_usu(session, estudiante_in.id_usu):
        raise HTTPException(status_code=404, detail="Usuario no existe")
    if not service.existe_llave_foranea_mun(session, estudiante_in.id_mun):
        raise HTTPException(status_code=404, detail="Municipio no existe")

    if estudiante_in.id_sec is not None:
        seccion = service.existe_llave_foranea_sec(session, estudiante_in.id_sec)
        if not seccion:
            raise HTTPException(status_code=404, detail="Sección no existe")
        if estudiante_in.id_pro is not None and estudiante_in.id_pro != seccion.id_pro:
            raise HTTPException(status_code=400, detail="La sección no pertenece al programa indicado")
        validar_seccion_para_nueva_operacion(session, estudiante_in.id_sec)
        estudiante_in = estudiante_in.model_copy(update={"id_pro": seccion.id_pro})
    elif estudiante_in.id_pro is not None and not service.existe_llave_foranea_pro(session, estudiante_in.id_pro):
        raise HTTPException(status_code=404, detail="Programa no existe")

    validar_unicidad(Estudiante, ['cedula', 'id_usu'])(estudiante_in, session)
    return service.crear(session, estudiante_in)

# --- READ ALL ---
@router.get("/", response_model=List[EstudianteResponse])
def leer_estudiantes(
    id_sec: Optional[int] = Query(None, description="Filtrar por sección"),
    busqueda: Optional[str] = Query(None, description="Buscar por cédula o nombre"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('estudiantes', 'LEC', 'SP'))
):
    if es_docente_sp(usuario_actual):
        id_doc = docente_del_usuario(usuario_actual, session)
        if id_doc is None:
            return []

        secciones_docente = session.exec(
            select(AsigCargaHoraria.id_sec)
            .where(AsigCargaHoraria.id_doc == id_doc, AsigCargaHoraria.estatus == 'A')
            .distinct()
        ).all()

        secciones_docente = [seccion for seccion in secciones_docente if seccion is not None]
        if not secciones_docente:
            return []

        return service.leer_por_secciones(session, list(secciones_docente), id_sec, busqueda)

    return service.leer_todos_con_filtros(
        session, id_sec, busqueda, incluir_retirados=usuario_actual.get('rol') in (1, 3)
    )

# --- READ ONE ---
@router.get("/{estudiante_id}", response_model=EstudianteResponse)
def leer_estudiante_id(estudiante_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('estudiantes','LEC','SP'))):
    recurso_propietario(usuario_actual,estudiante_id,[4])
    dato = service.obtener_dato_por_id(estudiante_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")
    return dato

# --- RETIRO / REINCORPORACIÓN: acción específica del Coordinador (rol 3) ---
@router.patch("/{estudiante_id}/estado", response_model=EstudianteResponse,
              dependencies=[Depends(verificar_permiso("estudiantes", "ACT", "SP"))])
def cambiar_estado_estudiante(
    estudiante_id: int,
    cambio: EstudianteCambioEstado,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(requerir_rol([1, 3])),
):
    # El administrador mantiene la capacidad de gestión previa; el Coordinador
    # solo obtiene esta acción, NO permisos para editar el resto del perfil.
    estudiante = service.obtener_dato_por_id(estudiante_id, session)
    if estudiante is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    if estudiante.estatus == cambio.estatus:
        return estudiante
    estudiante.estatus = cambio.estatus
    session.add(estudiante)
    session.commit()
    session.refresh(estudiante)
    return estudiante


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
    campos_enviados = dato_in.model_dump(exclude_unset=True)
    if 'id_sec' in campos_enviados and dato_in.id_sec is not None and dato_in.id_sec != db_dato.id_sec:
        seccion = service.existe_llave_foranea_sec(session, dato_in.id_sec)
        if not seccion:
            raise HTTPException(status_code=404, detail="Sección no existe")
        if dato_in.id_pro is not None and dato_in.id_pro != seccion.id_pro:
            raise HTTPException(status_code=400, detail="La sección no pertenece al programa indicado")
        validar_seccion_para_nueva_operacion(session, dato_in.id_sec)
        dato_in = dato_in.model_copy(update={'id_pro': seccion.id_pro})
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{estudiante_id}", status_code=status.HTTP_200_OK)
def eliminar_estudiante(estudiante_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('estudiantes','BOR','LIM'))):
    db_dato = service.obtener_dato_por_id(estudiante_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Estudiante eliminada exitosamente"}