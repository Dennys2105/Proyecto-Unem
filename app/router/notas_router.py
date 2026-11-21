from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session
from typing import List, Optional, Any
from app.models.unem_db_models import Nota
from app.dependencies.auth_deps import (
    verificar_permiso, docente_del_usuario, materias_del_docente, secciones_del_docente,
)
from app.dependencies.session_auditable import get_session_auditable as get_session
from app.schemas.esq_notas import (
    NotasCreate, NotasResponcive, NotasUpdate,
    ActaCreate, ResumenActa, TiposEvaluacion,
)
import app.service.notas_service as service

router = APIRouter(prefix="/notas", tags=["Notas"])


# --- READ ALL (filtrado por alcance SP) ---
@router.get("/", response_model=List[NotasResponcive])
def leer_notas(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('notas', 'LEC', 'SP')),
):
    alcance = usuario_actual.get("alcance", "TODO")
    if alcance == "SP":
        id_doc = docente_del_usuario(usuario_actual, session)
        if id_doc is None:
            return []
        mallas = materias_del_docente(session, id_doc)
        if not mallas:
            return []
        return service.leer_todos_filtrado_por_mallas(session, mallas)
    return service.leer_todos(session)


# --- ACTA: estudiantes de una sección con su nota (filtrado SP) ---
@router.get("/acta")
def obtener_acta(
    id_sec: int = Query(..., description="Sección"),
    id_malla: int = Query(..., description="Materia de la malla curricular"),
    id_per: int = Query(..., description="Período académico"),
    tipo_evaluacion: TiposEvaluacion = Query(TiposEvaluacion.Final),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('notas', 'LEC', 'SP')),
):
    alcance = usuario_actual.get("alcance", "TODO")
    if alcance == "SP":
        id_doc = docente_del_usuario(usuario_actual, session)
        if id_doc is None:
            raise HTTPException(status_code=403, detail="Docente sin vínculo en el sistema.")
        mallas_docente = materias_del_docente(session, id_doc)
        if id_malla not in mallas_docente:
            raise HTTPException(status_code=403, detail="Esta materia no está asignada a tu carga horaria.")
        secciones_docente = secciones_del_docente(session, id_doc)
        if id_sec not in secciones_docente:
            raise HTTPException(status_code=403, detail="Esta sección no está en tus asignaciones.")

    filas = service.obtener_acta(session, id_sec, id_malla, id_per, tipo_evaluacion.value)
    if not filas:
        raise HTTPException(
            status_code=404,
            detail="No hay estudiantes activos asignados a esa sección.",
        )
    return filas


# --- ANÁLISIS ESTADÍSTICO (filtrado SP) ---
@router.get("/analisis")
def analisis(
    cod_programa: Optional[str] = Query(None),
    id_per: Optional[int] = Query(None),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('notas', 'LEC', 'SP')),
):
    alcance = usuario_actual.get("alcance", "TODO")
    if alcance == "SP":
        id_doc = docente_del_usuario(usuario_actual, session)
        if id_doc is None:
            return []
        mallas = materias_del_docente(session, id_doc)
        if not mallas:
            return []
        return service.analisis_notas_filtrado(session, mallas, cod_programa, id_per)
    return service.analisis_notas(session, cod_programa, id_per)


# --- READ ONE (verificación de propiedad SP) ---
@router.get("/{nota_id}", response_model=NotasResponcive)
def leer_nota_id(
    nota_id: int,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('notas', 'LEC', 'SP')),
):
    dato = service.obtener_enriquecida(session, nota_id)
    if not dato:
        raise HTTPException(status_code=404, detail="Nota no encontrada")

    alcance = usuario_actual.get("alcance", "TODO")
    if alcance == "SP":
        id_doc = docente_del_usuario(usuario_actual, session)
        if id_doc is None:
            raise HTTPException(status_code=403, detail="Acceso denegado.")
        mallas = materias_del_docente(session, id_doc)
        if dato.get("id_malla") not in mallas:
            raise HTTPException(status_code=403, detail="Esta nota no pertenece a tus materias asignadas.")

    return dato


# --- CREATE ---
@router.post("/", response_model=NotasResponcive, status_code=status.HTTP_201_CREATED)
def crear_nota(
    nota_in: NotasCreate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('notas', 'CRE', 'LIM')),
):
    if not service.existe_llave_foranea_est(session, nota_in.id_est):
        raise HTTPException(status_code=404, detail="El estudiante no existe")
    if not service.existe_llave_foranea_malla(session, nota_in.id_malla):
        raise HTTPException(status_code=404, detail="La materia de la malla no existe")
    if not service.existe_llave_foranea_per(session, nota_in.id_per):
        raise HTTPException(status_code=404, detail="El período académico no existe")
    return service.crear(session, nota_in)


# --- ✅ GUARDADO MASIVO DEL ACTA ---
@router.post("/acta", response_model=ResumenActa)
def guardar_acta(
    acta_in: ActaCreate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('notas', 'CRE', 'LIM')),
):
    if not service.existe_llave_foranea_malla(session, acta_in.id_malla):
        raise HTTPException(status_code=404, detail="La materia de la malla no existe")
    if not service.existe_llave_foranea_per(session, acta_in.id_per):
        raise HTTPException(status_code=404, detail="El período académico no existe")
    if not acta_in.filas:
        raise HTTPException(status_code=400, detail="El acta no contiene filas")
    return service.guardar_acta(session, acta_in)


# --- ✅ UPDATE PARCIAL (path y parámetro ahora coinciden) ---
@router.patch("/{nota_id}", response_model=NotasResponcive)
def actualizar_parcial_nota(
    nota_id: int,
    dato_in: NotasUpdate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('notas', 'ACT', 'LIM')),
):
    db_dato = service.obtener_dato_por_id(nota_id, session)
    if not db_dato:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- ✅ DELETE LÓGICO (path y parámetro ahora coinciden) ---
@router.delete("/{nota_id}", status_code=status.HTTP_200_OK)
def eliminar_nota(
    nota_id: int,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('notas', 'BOR', 'TODO')),
):
    db_dato = service.obtener_dato_por_id(nota_id, session)
    if not db_dato:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Nota anulada exitosamente"}