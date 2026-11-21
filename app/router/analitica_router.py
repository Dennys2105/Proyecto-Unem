"""
UNEM · Router de Analítica Académica (Opción 2)
Independiente de analytics.py para no tocar el archivo del dashboard.
Prefijo: /analitica
"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, text
from typing import Optional

from app.config.db_conection import get_session
from app.dependencies.auth_deps import obtener_usuario_actual

router = APIRouter(prefix="/analitica", tags=["Analítica Académica"])

_LECTOR = Depends(obtener_usuario_actual)

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


# ============================================================
# PREDICCIONES (Lote 5) — proyección y riesgo académico
# Regresión lineal por mínimos cuadrados calculada en PostgreSQL
# (regr_slope / regr_intercept / regr_r2) sobre la serie histórica.
# ============================================================

def _nivel_riesgo(pct: float, promedio: float) -> str:
    """Clasificación de riesgo académico a partir de % de aprobación y promedio."""
    if pct < 50 or promedio < 10:
        return "ALTO"
    if pct < 75 or promedio < 12:
        return "MEDIO"
    return "BAJO"


@router.get("/predicciones")
def predicciones(
    id_pro: Optional[int] = Query(None, description="Filtrar por programa"),
    pasos: int = Query(2, ge=1, le=4, description="Períodos futuros a proyectar"),
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    """
    Proyección de promedio y % de aprobación + riesgo por materia y estudiante.
    Requiere >= 2 períodos para calcular tendencia; se marca confiable con >= 3 y R² >= 0.5.
    """
    filtro = " AND mc.id_pro = :id_pro" if id_pro else ""
    params = {"id_pro": id_pro} if id_pro else {}

    # --- 1. Serie histórica por período académico ---
    serie_sql = _CTE + """
        SELECT pa.id_per, pa.nombre AS periodo, pa.anio, pa.numero_periodo, pa.tipo,
               pa.fecha_inicio,
               row_number() OVER (ORDER BY pa.fecha_inicio) AS orden,
               count(*) AS evaluaciones,
               round(avg(d.nota), 2) AS promedio,
               round(count(CASE WHEN d.nota >= 10 THEN 1 END)::numeric
                     / NULLIF(count(*), 0) * 100, 2) AS pct_aprobacion
        FROM definitivas d
        JOIN academico.periodos_academicos pa ON pa.id_per = d.id_per
        JOIN academico.malla_curricular mc ON mc.id_malla = d.id_malla
        WHERE 1=1
    """ + filtro + """
        GROUP BY pa.id_per, pa.nombre, pa.anio, pa.numero_periodo, pa.tipo, pa.fecha_inicio
        ORDER BY pa.fecha_inicio
    """
    serie_rows = session.exec(text(serie_sql).params(**params)).mappings().all()
    serie = [
        {
            "id_per": int(r["id_per"]), "periodo": r["periodo"], "anio": int(r["anio"]),
            "numero_periodo": int(r["numero_periodo"]), "tipo": r["tipo"],
            "fecha_inicio": str(r["fecha_inicio"]), "orden": int(r["orden"]),
            "evaluaciones": int(r["evaluaciones"]),
            "promedio": float(r["promedio"] or 0),
            "pct_aprobacion": float(r["pct_aprobacion"] or 0),
        }
        for r in serie_rows
    ]
    n = len(serie)

    # --- 2. Regresión lineal en el motor (NULL si n < 2) ---
    reg_sql = _CTE + """
        , serie AS (
            SELECT pa.id_per,
                   row_number() OVER (ORDER BY pa.fecha_inicio) AS orden,
                   avg(d.nota)::numeric AS promedio,
                   count(CASE WHEN d.nota >= 10 THEN 1 END)::numeric
                     / NULLIF(count(*), 0) * 100 AS pct_aprobacion
            FROM definitivas d
            JOIN academico.periodos_academicos pa ON pa.id_per = d.id_per
            JOIN academico.malla_curricular mc ON mc.id_malla = d.id_malla
            WHERE 1=1
    """ + filtro + """
            GROUP BY pa.id_per, pa.fecha_inicio
        )
        SELECT count(*) AS n,
               regr_slope(promedio, orden)        AS m_prom,
               regr_intercept(promedio, orden)    AS b_prom,
               regr_r2(promedio, orden)           AS r2_prom,
               regr_slope(pct_aprobacion, orden)  AS m_apr,
               regr_intercept(pct_aprobacion, orden) AS b_apr,
               regr_r2(pct_aprobacion, orden)     AS r2_apr
        FROM serie
    """
    reg = session.exec(text(reg_sql).params(**params)).mappings().first()

    def _f(v):
        return None if v is None else float(v)

    m_prom = _f(reg["m_prom"]) if reg else None
    b_prom = _f(reg["b_prom"]) if reg else None
    r2_prom = _f(reg["r2_prom"]) if reg else None
    m_apr = _f(reg["m_apr"]) if reg else None
    b_apr = _f(reg["b_apr"]) if reg else None
    r2_apr = _f(reg["r2_apr"]) if reg else None

    # --- 3. Proyección acotada a los rangos válidos (0-20 y 0-100) ---
    proyeccion = []
    if m_prom is not None and b_prom is not None and n >= 2:
        for k in range(1, pasos + 1):
            x = n + k
            prom = max(0.0, min(20.0, m_prom * x + b_prom))
            apr = max(0.0, min(100.0, (m_apr or 0.0) * x + (b_apr or 0.0)))
            proyeccion.append({
                "paso": k,
                "etiqueta": f"Proyección +{k}",
                "promedio_proyectado": round(prom, 2),
                "pct_aprobacion_proyectado": round(apr, 2),
            })

    if n < 2:
        aviso = "Se necesitan al menos 2 períodos con notas oficiales para calcular una tendencia."
    elif n < 3:
        aviso = "Solo hay 2 períodos: la proyección es una estimación preliminar, no confiable estadísticamente."
    elif (r2_prom or 0) < 0.5:
        aviso = "El ajuste lineal es débil (R² bajo): la serie es irregular, interpreta la proyección con cautela."
    else:
        aviso = None

    # --- 4. Riesgo por materia (vista oficial ya existente) ---
    q_mat = """
        SELECT cod_programa, materia, trayecto, periodo,
               total_estudiantes_evaluados, promedio, reprobados, porcentaje_aprobacion
        FROM academico.vw_analisis_notas
        WHERE reprobados > 0
    """
    p_mat = {}
    if id_pro:
        q_mat += " AND cod_programa = (SELECT codigo FROM academico.programas WHERE id_pro = :id_pro)"
        p_mat["id_pro"] = id_pro
    q_mat += " ORDER BY porcentaje_aprobacion ASC, reprobados DESC LIMIT 12"
    mat_rows = session.exec(text(q_mat).params(**p_mat)).mappings().all()
    materias_riesgo = []
    for r in mat_rows:
        pct = float(r["porcentaje_aprobacion"] or 0)
        prom = float(r["promedio"] or 0)
        materias_riesgo.append({
            "cod_programa": r["cod_programa"], "materia": r["materia"],
            "trayecto": int(r["trayecto"]), "periodo": int(r["periodo"]),
            "evaluados": int(r["total_estudiantes_evaluados"]),
            "promedio": prom, "reprobados": int(r["reprobados"]),
            "pct_aprobacion": pct, "nivel": _nivel_riesgo(pct, prom),
        })

    # --- 5. Riesgo por estudiante ---
    est_rows = session.exec(text(_CTE + """
        SELECT e.id_est, e.cedula,
               e.apellido || ', ' || e.nombre AS estudiante,
               p.codigo AS cod_programa,
               round(avg(d.nota), 2) AS promedio,
               count(*) AS materias_evaluadas,
               count(CASE WHEN d.nota < 10 THEN 1 END) AS materias_reprobadas
        FROM definitivas d
        JOIN personas.estudiantes e ON e.id_est = d.id_est
        JOIN academico.malla_curricular mc ON mc.id_malla = d.id_malla
        JOIN academico.programas p ON p.id_pro = mc.id_pro
        WHERE e.estatus = 'A'
    """ + filtro + """
        GROUP BY e.id_est, e.cedula, e.apellido, e.nombre, p.codigo
        HAVING avg(d.nota) < 12 OR count(CASE WHEN d.nota < 10 THEN 1 END) > 0
        ORDER BY promedio ASC
        LIMIT 20
    """).params(**params)).mappings().all()
    estudiantes_riesgo = []
    for r in est_rows:
        prom = float(r["promedio"] or 0)
        reprob = int(r["materias_reprobadas"])
        evaluadas = int(r["materias_evaluadas"])
        pct = round((evaluadas - reprob) / evaluadas * 100, 2) if evaluadas else 0.0
        estudiantes_riesgo.append({
            "id_est": int(r["id_est"]), "cedula": r["cedula"], "estudiante": r["estudiante"],
            "cod_programa": r["cod_programa"], "promedio": prom,
            "materias_evaluadas": evaluadas, "materias_reprobadas": reprob,
            "nivel": _nivel_riesgo(pct, prom),
        })

    return {
        "metodo": "Regresión lineal por mínimos cuadrados (regr_slope / regr_intercept / regr_r2 en PostgreSQL)",
        "n_periodos": n,
        "confiable": bool(n >= 3 and (r2_prom or 0) >= 0.5),
        "aviso": aviso,
        "pendiente_promedio": None if m_prom is None else round(m_prom, 4),
        "pendiente_aprobacion": None if m_apr is None else round(m_apr, 4),
        "r2_promedio": None if r2_prom is None else round(r2_prom, 4),
        "r2_aprobacion": None if r2_apr is None else round(r2_apr, 4),
        "serie": serie,
        "proyeccion": proyeccion,
        "materias_riesgo": materias_riesgo,
        "estudiantes_riesgo": estudiantes_riesgo,
    }