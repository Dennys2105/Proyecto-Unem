from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session
from app.dependencies.session_auditable import get_session_auditable as get_session
from app.schemas.esq_asig_carga_horaria import AsigCargaHorariaCreate,AsigCargaHorariaReplace,AsigCargaHorariaResponse,AsigCargaHorariaUpdate
import app.service.asig_carga_hor_service as service
from app.dependencies.auth_deps import recurso_propietario, verificar_permiso, docente_del_usuario, es_docente_sp
from app.dependencies.asig_hor_deps import validar_conflictos_horarios, validar_disponibilidad_docente
from app.dependencies.seccion_deps import validar_seccion_para_nueva_operacion

router= APIRouter(
    prefix="/asig_carga_hor",
    tags=["Carga Horaria"]
)

# --- CREATE ---
@router.post("/", response_model=AsigCargaHorariaResponse, status_code=status.HTTP_201_CREATED)
def crear_carga_horaria(carga_in: AsigCargaHorariaCreate, session: Session = Depends(get_session), usuario_actual: dict = Depends(verificar_permiso('asig_carga','CRE','TODO'))):
    validar_conflictos_horarios(session, carga_in)

    dia_id = service.existe_llave_foranea_dia(session, carga_in.id_dia)
    doc_id = service.existe_llave_foranea_doc(session, carga_in.id_doc)
    esp_id = service.existe_llave_foranea_esp(session, carga_in.id_esp)
    if not dia_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El día no existe")
    elif not doc_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El Docente no existe")
    elif not esp_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El espacio no existe")

    validar_disponibilidad_docente(
        session, carga_in.id_doc, carga_in.id_dia, carga_in.hora_inicio, carga_in.hora_fin
    )

    if carga_in.tipo_actividad == "Carga Académica" and not carga_in.id_malla:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La carga académica requiere una malla curricular",
        )
    if carga_in.id_malla and not service.existe_llave_foranea_malla(session, carga_in.id_malla):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Malla no existe")
    if carga_in.id_per and not service.existe_llave_foranea_per(session, carga_in.id_per):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no existe")

    if carga_in.id_sec is not None:
        if carga_in.id_per is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La asignación de una sección requiere su período académico.",
            )
        validar_seccion_para_nueva_operacion(session, carga_in.id_sec, carga_in.id_per)

    return service.crear(session, carga_in)

# --- READ ALL ---
@router.get("/", response_model=List[AsigCargaHorariaResponse])
def leer_carga_horaria(session: Session = Depends(get_session), usuario_actual: dict = Depends(verificar_permiso('asig_carga','LEC','SP'))):
    # DOCENTE con SP: solo su propio horario
    if es_docente_sp(usuario_actual):
        id_doc = docente_del_usuario(usuario_actual, session)
        if id_doc is None:
            return []
        return [a for a in service.leer_todos(session) if a.id_doc == id_doc]
    return service.leer_todos(session)

# --- READ ONE ---
@router.get("/{carga_horaria_id}", response_model=AsigCargaHorariaResponse)
def leer_carga_horaria_id(carga_horaria_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('asig_carga','LEC','SP'))):
    dato = service.obtener_dato_por_id(carga_horaria_id, session)
    recurso_propietario(usuario_actual,dato.id_doc,roles_restringidos=2)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campo no encontrado")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{carga_horaria_id}", response_model=AsigCargaHorariaResponse)
def actualizar_parcial_carga(carga_horaria_id: int, dato_in: AsigCargaHorariaUpdate, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('asig_carga','ACT','TODO'))):
    
    validar_conflictos_horarios(session,dato_in,carga_horaria_id)
    
    dia = dato_in.id_dia
    doc = dato_in.id_doc
    malla = dato_in.id_malla
    per = dato_in.id_per
    esp = dato_in.id_esp
    
    if dia is not None and not service.existe_llave_foranea_dia(session,dato_in.id_dia):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El dia no existe")
    
    elif doc is not None and not service.existe_llave_foranea_doc(session,dato_in.id_doc):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El Docente no existe")
    
    elif malla is not None and not service.existe_llave_foranea_malla(session,dato_in.id_malla):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Malla no existe")
    
    elif per is not None and not service.existe_llave_foranea_per(session,dato_in.id_per):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El Periodo Academico no existe")
    
    elif esp is not None and not service.existe_llave_foranea_esp(session,dato_in.id_esp):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El espacio no existe")
    
    db_dato = service.obtener_dato_por_id(carga_horaria_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carga Horaria no encontrada")

    seccion_destino = dato_in.id_sec if dato_in.id_sec is not None else db_dato.id_sec
    periodo_destino = dato_in.id_per if dato_in.id_per is not None else db_dato.id_per
    cambio_seccion_o_periodo = (
        (dato_in.id_sec is not None and dato_in.id_sec != db_dato.id_sec)
        or (dato_in.id_per is not None and dato_in.id_per != db_dato.id_per)
    )
    if seccion_destino is not None and cambio_seccion_o_periodo:
        if periodo_destino is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La asignación de una sección requiere su período académico.",
            )
        validar_seccion_para_nueva_operacion(session, seccion_destino, periodo_destino)

    if dato_in.id_doc is not None or dato_in.id_dia is not None or dato_in.hora_inicio is not None or dato_in.hora_fin is not None:
        id_doc = dato_in.id_doc if dato_in.id_doc is not None else db_dato.id_doc
        id_dia = dato_in.id_dia if dato_in.id_dia is not None else db_dato.id_dia
        hora_inicio = dato_in.hora_inicio if dato_in.hora_inicio is not None else db_dato.hora_inicio
        hora_fin = dato_in.hora_fin if dato_in.hora_fin is not None else db_dato.hora_fin

        validar_disponibilidad_docente(session, id_doc, id_dia, hora_inicio, hora_fin)

    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)

@router.delete("/{id_asig}", status_code=status.HTTP_200_OK)
def eliminar_asignacion(id_asig: int, session: Session = Depends(get_session), usuario_actual: dict = Depends(verificar_permiso('asig_carga','BOR','TODO'))):
    db_dato = service.obtener_dato_por_id(id_asig, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carga Horaria no encontrada")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Carga Horaria eliminada exitosamente"}