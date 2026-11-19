"""
UNEM · Router de Analítica Académica (Opción 2)
Independiente de analytics.py para no tocar el archivo del dashboard.
Prefijo: /analitica
"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, text
from typing import Optional

from app.config.db_conection import get_session
from app.dependencies.auth_deps import verificar_permiso

router = APIRouter(prefix="/analitica", tags=["Analítica Académica"])

_LECTOR = Depends(verificar_permiso("usuarios", "LEC", "LIM"))

_CTE = """
    WITH definitivas AS (
        SELECT DISTINCT ON (n.id_est, n.id_malla, n.id_per)
               n.id_est, n.id_malla, n.id_per, n.nota
        FROM academico.notas n
        WHERE n.estatus = 'A'
          AND n.tipo_evaluacion IN ('Final', 'Recuperación')
        ORDER BY n.id_est, n.id_malla, n.id_per,
                 CASE n.tipo_evaluacion WHEN 'Recuperación' THEN 1 ELSE 2 END
    )
"""


@router.get("/tendencia")
def tendencia(
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    """Promedio y % de aprobación por período académico (serie temporal)."""
    rows = session.exec(text(_CTE + """
        SELECT pa.id_per, pa.nombre AS periodo, pa.anio, pa.numero_periodo, pa.tipo,
               pa.fecha_inicio,
               count(*) AS evaluaciones,
               count(DISTINCT d.id_est) AS estudiantes,
               round(avg(d.nota), 2) AS promedio,
               count(CASE WHEN d.nota >= 10 THEN 1 END) AS aprobados,
               round(count(CASE WHEN d.nota >= 10 THEN 1 END)::numeric
                     / NULLIF(count(*), 0) * 100, 2) AS pct_aprobacion
        FROM definitivas d
        JOIN academico.periodos_academicos pa ON pa.id_per = d.id_per
        GROUP BY pa.id_per, pa.nombre, pa.anio, pa.numero_periodo, pa.tipo, pa.fecha_inicio
        ORDER BY pa.fecha_inicio
    """)).mappings().all()
    return [
        {"id_per": r["id_per"], "periodo": r["periodo"], "anio": int(r["anio"]),
         "numero_periodo": int(r["numero_periodo"]), "tipo": r["tipo"],
         "fecha_inicio": str(r["fecha_inicio"]),
         "evaluaciones": int(r["evaluaciones"]), "estudiantes": int(r["estudiantes"]),
         "promedio": float(r["promedio"] or 0), "aprobados": int(r["aprobados"]),
         "pct_aprobacion": float(r["pct_aprobacion"] or 0)} for r in rows
    ]


@router.get("/trayectos")
def trayectos(
    id_pro: Optional[int] = Query(None, description="Filtrar por programa"),
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    """Comparativa de rendimiento por trayecto dentro de cada programa."""
    filtro = " AND p.id_pro = :id_pro" if id_pro else ""
    params = {"id_pro": id_pro} if id_pro else {}
    rows = session.exec(text(_CTE + """
        SELECT p.codigo AS cod_programa, p.nombre AS programa, mc.trayecto,
               count(*) AS evaluaciones,
               count(DISTINCT d.id_est) AS estudiantes,
               round(avg(d.nota), 2) AS promedio,
               count(CASE WHEN d.nota >= 10 THEN 1 END) AS aprobados,
               round(count(CASE WHEN d.nota >= 10 THEN 1 END)::numeric
                     / NULLIF(count(*), 0) * 100, 2) AS pct_aprobacion
        FROM definitivas d
        JOIN academico.malla_curricular mc ON mc.id_malla = d.id_malla
        JOIN academico.programas p ON p.id_pro = mc.id_pro
        WHERE 1=1
    """ + filtro + """
        GROUP BY p.codigo, p.nombre, mc.trayecto
        ORDER BY p.codigo, mc.trayecto
    """).params(**params)).mappings().all()
    return [
        {"cod_programa": r["cod_programa"], "programa": r["programa"],
         "trayecto": int(r["trayecto"]), "evaluaciones": int(r["evaluaciones"]),
         "estudiantes": int(r["estudiantes"]), "promedio": float(r["promedio"] or 0),
         "aprobados": int(r["aprobados"]), "pct_aprobacion": float(r["pct_aprobacion"] or 0)}
        for r in rows
    ]


@router.get("/ejes")
def ejes(
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    """Rendimiento agregado por eje formativo."""
    rows = session.exec(text(_CTE + """
        SELECT eje.codigo AS cod_eje, eje.nombre AS eje,
               count(DISTINCT m.id_mat) AS materias,
               count(*) AS evaluaciones,
               round(avg(d.nota), 2) AS promedio,
               count(CASE WHEN d.nota >= 10 THEN 1 END) AS aprobados,
               round(count(CASE WHEN d.nota >= 10 THEN 1 END)::numeric
                     / NULLIF(count(*), 0) * 100, 2) AS pct_aprobacion
        FROM definitivas d
        JOIN academico.malla_curricular mc ON mc.id_malla = d.id_malla
        JOIN academico.materias m ON m.id_mat = mc.id_mat
        JOIN academico.ejes_formativos eje ON eje.id_eje = m.id_eje
        GROUP BY eje.codigo, eje.nombre
        ORDER BY promedio DESC
    """)).mappings().all()
    return [
        {"cod_eje": r["cod_eje"], "eje": r["eje"], "materias": int(r["materias"]),
         "evaluaciones": int(r["evaluaciones"]), "promedio": float(r["promedio"] or 0),
         "aprobados": int(r["aprobados"]), "pct_aprobacion": float(r["pct_aprobacion"] or 0)}
        for r in rows
    ]


@router.get("/ocupacion")
def ocupacion(
    id_dia: int = Query(..., ge=1, le=7, description="5=Viernes, 6=Sábado"),
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    """Ocupación de aulas para un día específico (la sede opera Viernes y Sábado)."""
    rows = session.exec(text("""
        SELECT e.id_esp, e.ubicacion AS aula, e.nombre_centro, e.capacidad,
               COUNT(a.id_asig) AS total_asignaciones,
               COALESCE(SUM(EXTRACT(EPOCH FROM (a.hora_fin - a.hora_inicio)) / 3600.0), 0) AS horas_ocupadas
        FROM infraestructura.espacios_fis e
        LEFT JOIN horarios.asig_carga_horarias a
               ON a.id_esp = e.id_esp AND a.id_dia = :id_dia AND a.estatus = 'A'
        WHERE e.estatus = 'A'
        GROUP BY e.id_esp, e.ubicacion, e.nombre_centro, e.capacidad
        ORDER BY horas_ocupadas DESC, e.ubicacion ASC
    """).params(id_dia=id_dia)).mappings().all()
    return [
        {"id_esp": r["id_esp"], "aula": r["aula"], "nombre_centro": r["nombre_centro"],
         "capacidad": int(r["capacidad"]), "total_asignaciones": int(r["total_asignaciones"]),
         "horas_ocupadas": round(float(r["horas_ocupadas"]), 2)} for r in rows
    ]


@router.get("/geografia")
def geografia(
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    """Estudiantes, docentes y espacios por municipio del estado Táchira."""
    rows = session.exec(text("""
        SELECT m.id_mun, m.nombre AS municipio,
            (SELECT count(*) FROM personas.estudiantes e
              WHERE e.id_mun = m.id_mun AND e.estatus = 'A') AS estudiantes,
            (SELECT count(*) FROM personas.docentes d
              WHERE d.id_mun = m.id_mun AND d.estatus = 'A') AS docentes,
            (SELECT count(*) FROM infraestructura.espacios_fis f
              WHERE f.id_mun = m.id_mun AND f.estatus = 'A') AS espacios
        FROM general.municipios m
        WHERE m.estatus = 'A'
        ORDER BY estudiantes DESC, municipio
    """)).mappings().all()
    return [
        {"id_mun": r["id_mun"], "municipio": r["municipio"],
         "estudiantes": int(r["estudiantes"]), "docentes": int(r["docentes"]),
         "espacios": int(r["espacios"])} for r in rows
    ]


@router.get("/histograma")
def histograma(
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    """Histograma de notas oficiales en 10 bins de 2 puntos (0-20)."""
    rows = session.exec(text(_CTE + """
        SELECT LEAST(width_bucket(d.nota, 0, 20, 10), 10) AS bin, count(*) AS cantidad
        FROM definitivas d
        GROUP BY bin
        ORDER BY bin
    """)).mappings().all()
    return [{"bin": int(r["bin"]), "cantidad": int(r["cantidad"])} for r in rows]