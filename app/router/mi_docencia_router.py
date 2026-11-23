"""Portal de autogestión del docente (rol 4).

Todas las consultas se resuelven desde el id_usu del JWT; no se acepta id_doc
proporcionado por el cliente. Las notas se autorizan por la terna exacta
(sección, malla, período), nunca por esos identificadores por separado.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, text

from app.dependencies.session_auditable import get_session_auditable as get_session
from app.dependencies.auth_deps import requerir_rol, docente_del_usuario
from app.models.unem_db_models import Estudiante, Docente, AsigCargaHoraria
from app.schemas.esq_notas import ActaCreate, TiposEvaluacion
from app.service import notas_service

router = APIRouter(
    prefix="/mi-docencia",
    tags=["Portal Docente"],
    dependencies=[Depends(requerir_rol([4]))],
)


class ActaDocente(ActaCreate):
    id_sec: int


def _docente_actual(session: Session, usuario: dict) -> Docente:
    id_doc = docente_del_usuario(usuario, session)
    docente = session.get(Docente, id_doc) if id_doc is not None else None
    if not docente or docente.estatus != 'A':
        raise HTTPException(status_code=403, detail="Tu cuenta no está vinculada a un docente activo.")
    return docente


def _seccion_asignada(session: Session, id_doc: int, id_sec: int) -> None:
    existe = session.exec(
        select(AsigCargaHoraria.id_asig).where(
            AsigCargaHoraria.id_doc == id_doc,
            AsigCargaHoraria.id_sec == id_sec,
            AsigCargaHoraria.estatus == 'A',
        ).limit(1)
    ).first()
    if existe is None:
        raise HTTPException(status_code=403, detail="Esa sección no pertenece a tus asignaciones activas.")


def _clase_asignada(session: Session, id_doc: int, id_sec: int, id_malla: int, id_per: int) -> None:
    existe = session.exec(
        select(AsigCargaHoraria.id_asig).where(
            AsigCargaHoraria.id_doc == id_doc,
            AsigCargaHoraria.id_sec == id_sec,
            AsigCargaHoraria.id_malla == id_malla,
            AsigCargaHoraria.id_per == id_per,
            AsigCargaHoraria.estatus == 'A',
            AsigCargaHoraria.tipo_actividad == 'Carga Académica',
        ).limit(1)
    ).first()
    if existe is None:
        raise HTTPException(
            status_code=403,
            detail="No tienes asignada esta combinación de sección, materia y período académico.",
        )


@router.get('/asignaciones')
def mis_asignaciones(
    session: Session = Depends(get_session),
    usuario: dict = Depends(requerir_rol([4])),
):
    doc = _docente_actual(session, usuario)
    filas = session.exec(text("""
        SELECT a.id_asig, a.id_sec, s.codigo AS seccion,
               a.id_malla, m.nombre AS materia, m.codigo AS cod_materia,
               a.id_per, pa.nombre AS periodo_academico,
               p.nombre AS programa, a.tipo_actividad,
               dl.dia, a.hora_inicio, a.hora_fin,
               ef.nombre_centro, ef.ubicacion AS aula
        FROM horarios.asig_carga_horarias a
        LEFT JOIN academico.secciones s ON s.id_sec = a.id_sec
        LEFT JOIN academico.malla_curricular mc ON mc.id_malla = a.id_malla
        LEFT JOIN academico.materias m ON m.id_mat = mc.id_mat
        LEFT JOIN academico.programas p ON p.id_pro = mc.id_pro
        LEFT JOIN academico.periodos_academicos pa ON pa.id_per = a.id_per
        LEFT JOIN general.dias_laborales dl ON dl.id_dia = a.id_dia
        LEFT JOIN infraestructura.espacios_fis ef ON ef.id_esp = a.id_esp
        WHERE a.id_doc = :id_doc AND a.estatus = 'A'
        ORDER BY dl.orden, a.hora_inicio, s.codigo, m.nombre
    """).params(id_doc=doc.id_doc)).mappings().all()
    return [
        {**dict(r), 'hora_inicio': str(r['hora_inicio'])[:5] if r['hora_inicio'] else None,
         'hora_fin': str(r['hora_fin'])[:5] if r['hora_fin'] else None}
        for r in filas
    ]


@router.get('/resumen')
def mi_resumen(
    session: Session = Depends(get_session),
    usuario: dict = Depends(requerir_rol([4])),
):
    doc = _docente_actual(session, usuario)
    stats = session.exec(text("""
        SELECT COUNT(DISTINCT (a.id_sec, a.id_malla, a.id_per)) FILTER
                 (WHERE a.id_sec IS NOT NULL AND a.id_malla IS NOT NULL) AS clases,
               COUNT(DISTINCT a.id_sec) FILTER (WHERE a.id_sec IS NOT NULL) AS secciones,
               COUNT(DISTINCT a.id_asig) AS bloques
        FROM horarios.asig_carga_horarias a
        WHERE a.id_doc = :id_doc AND a.estatus = 'A'
    """).params(id_doc=doc.id_doc)).mappings().one()
    alumnos = session.exec(text("""
        SELECT COUNT(DISTINCT e.id_est)
        FROM personas.estudiantes e
        WHERE e.estatus = 'A' AND EXISTS (
          SELECT 1 FROM horarios.asig_carga_horarias a
          WHERE a.id_doc = :id_doc AND a.id_sec = e.id_sec AND a.estatus = 'A'
        )
    """).params(id_doc=doc.id_doc)).one()[0]
    revisiones = session.exec(text("""
        SELECT n.estado_revision, COUNT(*)
        FROM academico.notas n
        JOIN personas.estudiantes e ON e.id_est = n.id_est
        WHERE n.estatus = 'A' AND EXISTS (
          SELECT 1 FROM horarios.asig_carga_horarias a
          WHERE a.id_doc = :id_doc AND a.id_sec = e.id_sec
            AND a.id_malla = n.id_malla AND a.id_per = n.id_per
            AND a.estatus = 'A' AND a.tipo_actividad = 'Carga Académica'
        )
        GROUP BY n.estado_revision
    """).params(id_doc=doc.id_doc)).all()
    estados = {estado: total for estado, total in revisiones}
    return {
        'docente': f'{doc.nombre} {doc.apellido}',
        'clases': stats['clases'] or 0,
        'secciones': stats['secciones'] or 0,
        'bloques': stats['bloques'] or 0,
        'estudiantes': alumnos or 0,
        'notas_pendientes': estados.get('P', 0),
        'notas_aprobadas': estados.get('A', 0),
        'notas_rechazadas': estados.get('R', 0),
    }


@router.get('/estudiantes')
def mis_estudiantes(
    id_sec: Optional[int] = Query(None),
    session: Session = Depends(get_session),
    usuario: dict = Depends(requerir_rol([4])),
):
    doc = _docente_actual(session, usuario)
    if id_sec is not None:
        _seccion_asignada(session, doc.id_doc, id_sec)
    consulta = text("""
        SELECT e.id_est, e.cedula, e.nombre, e.apellido, e.trayecto,
               e.id_sec, s.codigo AS seccion
        FROM personas.estudiantes e
        JOIN academico.secciones s ON s.id_sec = e.id_sec
        WHERE e.estatus = 'A'
          AND (:id_sec IS NULL OR e.id_sec = :id_sec)
          AND EXISTS (
              SELECT 1 FROM horarios.asig_carga_horarias a
              WHERE a.id_doc = :id_doc AND a.id_sec = e.id_sec AND a.estatus = 'A'
          )
        ORDER BY s.codigo, e.apellido, e.nombre
    """).params(id_doc=doc.id_doc, id_sec=id_sec)
    return [dict(r) for r in session.exec(consulta).mappings().all()]


@router.get('/acta')
def mi_acta(
    id_sec: int, id_malla: int, id_per: int,
    tipo_evaluacion: TiposEvaluacion = Query(TiposEvaluacion.Final),
    session: Session = Depends(get_session),
    usuario: dict = Depends(requerir_rol([4])),
):
    doc = _docente_actual(session, usuario)
    _clase_asignada(session, doc.id_doc, id_sec, id_malla, id_per)
    return notas_service.obtener_acta(session, id_sec, id_malla, id_per, tipo_evaluacion.value)


@router.post('/acta')
def guardar_mi_acta(
    acta: ActaDocente,
    session: Session = Depends(get_session),
    usuario: dict = Depends(requerir_rol([4])),
):
    doc = _docente_actual(session, usuario)
    _clase_asignada(session, doc.id_doc, acta.id_sec, acta.id_malla, acta.id_per)
    if not acta.filas or len(acta.filas) > 300:
        raise HTTPException(status_code=400, detail='El acta debe contener entre 1 y 300 estudiantes.')
    ids = [fila.id_est for fila in acta.filas]
    if len(set(ids)) != len(ids):
        raise HTTPException(status_code=400, detail='El acta contiene estudiantes repetidos.')
    # Comprobar TODOS los estudiantes antes de ejecutar el primer INSERT/UPDATE.
    ids_validos = set(session.exec(
        select(Estudiante.id_est).where(
            Estudiante.id_est.in_(ids),
            Estudiante.id_sec == acta.id_sec,
            Estudiante.estatus == 'A',
        )
    ).all())
    if ids_validos != set(ids):
        raise HTTPException(status_code=403, detail='El acta contiene alumnos ajenos o retirados.')
    if not notas_service.existe_llave_foranea_malla(session, acta.id_malla):
        raise HTTPException(status_code=404, detail='Materia no encontrada.')
    if not notas_service.existe_llave_foranea_per(session, acta.id_per):
        raise HTTPException(status_code=404, detail='Período académico no encontrado.')
    return notas_service.guardar_acta(session, acta, reapertura_admin=False)


@router.get('/asistencia/{id_sec}/excel')
def descargar_mi_asistencia(
    id_sec: int,
    session: Session = Depends(get_session),
    usuario: dict = Depends(requerir_rol([4])),
):
    doc = _docente_actual(session, usuario)
    _seccion_asignada(session, doc.id_doc, id_sec)
    # Reutiliza el reporte institucional existente sin exponer /exportar al rol 4.
    from app.router.exels_pdfs_router import exportar_estudiantes_seccion
    return exportar_estudiantes_seccion(id_sec=id_sec, session=session, usuario_actual=usuario)


@router.get('/horario/pdf')
def descargar_mi_horario(
    session: Session = Depends(get_session),
    usuario: dict = Depends(requerir_rol([4])),
):
    doc = _docente_actual(session, usuario)
    from app.router.exels_pdfs_router import descargar_horario_docente_pdf
    return descargar_horario_docente_pdf(cedula=doc.cedula, session=session)
