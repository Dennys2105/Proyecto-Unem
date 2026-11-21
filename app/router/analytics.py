from fastapi import APIRouter, Depends, HTTPException, status,Query
from sqlmodel import Session, text
from typing import Optional
from datetime import date
from app.dependencies.auth_deps import verificar_permiso, obtener_usuario_actual
from app.config.db_conection import get_session 
from app.models.model_read_only import VwResumenEstadisticoRead,VwPermisosEfectivosRead,VwMovimientosRead,VwHorarioCompletoDocenteRead, VwDocentesPorContratoRead, VwDocentesPorProgramaMunicipioRead, VwAnalisisNotas
router = APIRouter(prefix="/analytics", tags=["Analítica y Reportes"])

#No se a implementado la funcion de autenticacion para facilitar las pruebas 

@router.get("/resumen", response_model=VwResumenEstadisticoRead)
def obtener_resumen_dashboard(session: Session = Depends(get_session), usuario_actual: dict = Depends(obtener_usuario_actual)):
    statement = text("SELECT * FROM general.vw_resumen_estadistico")
    
    resultado = session.exec(statement).mappings().first()
    
    if not resultado:
        return {} 
        
    return VwResumenEstadisticoRead(**resultado)

@router.get("/analisis_notas")
def obtner_analisis_notas(
    cod_programa: Optional[str] = Query(None, description="Filtrar por código de programa (ej: LPRI)"),
    id_per: Optional[int] = Query(None, description="Filtrar por período académico"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("estudiantes", "LEC", "LIM"))
):
    """Análisis estadístico de notas por materia. Sin filtros devuelve todo."""
    import app.service.notas_service as notas_service
    return notas_service.analisis_notas(session, cod_programa, id_per)

@router.get("/permisos", response_model=list[VwPermisosEfectivosRead])
def obtener_permiso_usuarios(usuario_id: int, session: Session = Depends(get_session)):
    
    statement = text("""
        SELECT *
        FROM general.vw_permisos_efectivos_usuario 
        WHERE id_usu = :usuario_id
    """).params(usuario_id=usuario_id)
    
    resultados = session.exec(statement).mappings().all()
    
    if not resultados:
        raise HTTPException(status_code=404, detail="No se encontraron permisos para este usuario.")
        
    return [VwPermisosEfectivosRead(**row) for row in resultados]

@router.get("/auditoria/movimientos", response_model=list[VwMovimientosRead])
def consultar_auditoria_avanzada(
    tabla: Optional[str] = Query(None, description="Filtrar por tabla afectada"),
    usuario: Optional[str] = Query(None, description="Filtrar por nombre de usuario"),
    fecha_inicio: Optional[date] = Query(None, description="Filtrar desde la fecha (YYYY-MM-DD)"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("aud_mov", "LEC", "LIM"))
):
    query = """
        SELECT 
            am.id_aud,
            am.fec_hor AS fecha,
            COALESCE(u.username, 'Sistema') AS usuario,
            am.tabla_mod AS tabla_afectada,
            am.accion,
            CASE
                -- DOCENTES: cédula + nombre completo
                WHEN am.tabla_mod = 'docentes' THEN
                    COALESCE(CONCAT(d.cedula, ' - ', d.nombre, ' ', d.apellido),
                             vl.registro_identificador, 'N/A')
                -- ESTUDIANTES: cédula + nombre completo
                WHEN am.tabla_mod = 'estudiantes' THEN
                    COALESCE(CONCAT(e.cedula, ' - ', e.nombre, ' ', e.apellido),
                             vl.registro_identificador, 'N/A')
                -- NOTAS: estudiante + materia + valor nota
                WHEN am.tabla_mod = 'notas' THEN
                    COALESCE(
                        CONCAT(e.nombre, ' ', e.apellido, ' | ', m_n.nombre, ' | Nota: ', n.nota),
                        CONCAT('NotaID:', COALESCE(am.val_despues->>'id_nota', am.val_antes->>'id_nota', '?'))
                    )
                -- CREDENCIALES: username del usuario dueño
                WHEN am.tabla_mod = 'credenciales' THEN
                    COALESCE(CONCAT('Usuario: ', u_c.username),
                             CONCAT('CreID:', COALESCE(am.val_despues->>'id_cre', am.val_antes->>'id_cre', '?')))
                -- ASIGNACIONES: docente + día
                WHEN am.tabla_mod = 'asig_carga_horarias' THEN
                    COALESCE(CONCAT(d.nombre, ' ', d.apellido, ' | ', dia.dia),
                             vl.registro_identificador, 'N/A')
                -- SECCIONES: código + programa
                WHEN am.tabla_mod = 'secciones' THEN
                    COALESCE(CONCAT(s.codigo, ' (', p2.nombre, ')'),
                             CONCAT('SecID:', COALESCE(am.val_despues->>'id_sec', am.val_antes->>'id_sec', '?')))
                -- MATERIAS: nombre real
                WHEN am.tabla_mod = 'materias' THEN
                    COALESCE(mat.nombre, vl.registro_identificador, 'N/A')
                -- PROGRAMAS: nombre real
                WHEN am.tabla_mod = 'programas' THEN
                    COALESCE(p.nombre, vl.registro_identificador, 'N/A')
                -- MUNICIPIOS: nombre real
                WHEN am.tabla_mod = 'municipios' THEN
                    COALESCE(mun.nombre, vl.registro_identificador, 'N/A')
                -- DÍAS LABORALES: nombre del día
                WHEN am.tabla_mod = 'dias_laborales' THEN
                    COALESCE(dia.dia, vl.registro_identificador, 'N/A')
                -- ESPACIOS FÍSICOS: centro + ubicación
                WHEN am.tabla_mod = 'espacios_fis' THEN
                    COALESCE(CONCAT(esp.nombre_centro, ' - ', esp.ubicacion),
                             vl.registro_identificador, 'N/A')
                -- USUARIOS: username (la vista ya lo trae)
                WHEN am.tabla_mod = 'usuarios' THEN
                    COALESCE(vl.registro_identificador, 'N/A')
                -- RESTO: usar lo que diga la vista
                ELSE COALESCE(vl.registro_identificador, 'N/A')
            END AS registro_identificador,
            vl.resumen_cambio AS resumen_cambios,
            am.dir_ip AS ip_origen
        FROM general.aud_mov am
        LEFT JOIN general.usuarios u ON u.id_usu = am.id_usu
        LEFT JOIN general.vw_auditoria_legible vl ON vl.id_aud = am.id_aud
        -- JOINs con esquemas CORRECTOS (verificados contra BD 4.3)
        LEFT JOIN personas.docentes d
            ON d.id_doc = COALESCE((am.val_despues->>'id_doc')::int, (am.val_antes->>'id_doc')::int)
        LEFT JOIN personas.estudiantes e
            ON e.id_est = COALESCE((am.val_despues->>'id_est')::int, (am.val_antes->>'id_est')::int)
        LEFT JOIN academico.notas n
            ON n.id_nota = COALESCE((am.val_despues->>'id_nota')::int, (am.val_antes->>'id_nota')::int)
        LEFT JOIN academico.malla_curricular mc_n
            ON mc_n.id_malla = n.id_malla
        LEFT JOIN academico.materias m_n
            ON m_n.id_mat = mc_n.id_mat
        LEFT JOIN general.usuarios u_c
            ON u_c.id_usu = COALESCE((am.val_despues->>'id_usu')::int, (am.val_antes->>'id_usu')::int)
        LEFT JOIN general.dias_laborales dia
            ON dia.id_dia = COALESCE((am.val_despues->>'id_dia')::int, (am.val_antes->>'id_dia')::int)
        LEFT JOIN academico.secciones s
            ON s.id_sec = COALESCE((am.val_despues->>'id_sec')::int, (am.val_antes->>'id_sec')::int)
        LEFT JOIN academico.programas p2
            ON p2.id_pro = s.id_pro
        LEFT JOIN academico.materias mat
            ON mat.id_mat = COALESCE((am.val_despues->>'id_mat')::int, (am.val_antes->>'id_mat')::int)
        LEFT JOIN academico.programas p
            ON p.id_pro = COALESCE((am.val_despues->>'id_pro')::int, (am.val_antes->>'id_pro')::int)
        LEFT JOIN general.municipios mun
            ON mun.id_mun = COALESCE((am.val_despues->>'id_mun')::int, (am.val_antes->>'id_mun')::int)
        LEFT JOIN infraestructura.espacios_fis esp
            ON esp.id_esp = COALESCE((am.val_despues->>'id_esp')::int, (am.val_antes->>'id_esp')::int)
        WHERE 1=1
    """
    params = {}

    if tabla:
        query += " AND am.tabla_mod = :tabla"
        params["tabla"] = tabla
    if usuario:
        query += " AND u.username ILIKE :usuario"
        params["usuario"] = f"%{usuario}%"
    if fecha_inicio:
        query += " AND am.fec_hor >= :fecha_inicio"
        params["fecha_inicio"] = fecha_inicio

    query += " ORDER BY am.fec_hor DESC LIMIT 100"

    resultados = session.exec(text(query).params(**params)).mappings().all()
    return [VwMovimientosRead(**row) for row in resultados]

@router.get("/Horario_docente", response_model=list[VwHorarioCompletoDocenteRead])
def horario_completo_docente(
    cedula: Optional[str] = Query(None, description="Filtrar por cédula exacta del docente (ej: V-14567890)"),
    cod_materia: Optional[str] = Query(None, description="Filtrar por el código de la materia (ej: INF-T1P1-PRO)"),
    cod_programa: Optional[str] = Query(None, description="Filtrar por el código del programa (ej: INF)"),
    session: Session = Depends(get_session)
):

    # Construcción dinámica ajustada exactamente a los campos de la vista personas.vw_horario_completo_docente
    query = """
        SELECT 
            cedula, 
            nombre_completo_docente, 
            tipo_contrato, 
            cod_programa, 
            programa, 
            cod_materia, 
            materia, 
            uc, 
            cod_eje,
            eje_formativo, 
            periodo_academico,
            dia,
            hora_inicio,
            hora_fin,
            espacio_fisico,
            nombre_centro,
            tipo_actividad
        FROM personas.vw_horario_completo_docente
        WHERE 1=1
    """
    params = {}
    
    if cedula:
        query += " AND cedula = :cedula"
        params["cedula"] = cedula
    if cod_materia:
        query += " AND cod_materia ILIKE :cod_materia"
        params["cod_materia"] = f"%{cod_materia}%"
    if cod_programa:
        query += " AND cod_programa ILIKE :cod_programa"
        params["cod_programa"] = f"%{cod_programa}%"
        
    query += " ORDER BY hora_inicio ASC LIMIT 100"
    
    resultados = session.exec(text(query).params(**params)).mappings().all()
    
    return [VwHorarioCompletoDocenteRead(**row) for row in resultados]

# ============================================================
# ENDPOINTS PARA DASHBOARD — DATOS 100% REALES
# Agregados en v4.5. No dependen del módulo de Notas.
# ============================================================

@router.get("/carga-por-dia")
def carga_horaria_por_dia(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Horas reales asignadas por día de la semana (incluye asesorías)."""
    statement = text("""
        SELECT
            d.id_dia,
            d.dia,
            d.orden,
            COALESCE(SUM(EXTRACT(EPOCH FROM (a.hora_fin - a.hora_inicio)) / 3600.0), 0) AS horas,
            COUNT(a.id_asig) AS asignaciones
        FROM general.dias_laborales d
        LEFT JOIN horarios.asig_carga_horarias a
            ON a.id_dia = d.id_dia AND a.estatus = 'A'
        WHERE d.estatus = 'A'
        GROUP BY d.id_dia, d.dia, d.orden
        ORDER BY d.orden
    """)
    rows = session.exec(statement).mappings().all()
    return [
        {
            "id_dia": r["id_dia"],
            "dia": r["dia"],
            "orden": r["orden"],
            "horas": round(float(r["horas"]), 2),
            "asignaciones": int(r["asignaciones"]),
        }
        for r in rows
    ]


@router.get("/docentes-por-contrato")
def docentes_por_contrato(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Distribución de docentes y carga horaria por tipo de contrato."""
    statement = text("SELECT * FROM general.vw_docentes_por_contrato")
    rows = session.exec(statement).mappings().all()
    return [
        {
            "tipo_contrato": r["tipo_contrato"],
            "total_docentes": int(r["total_docentes"]),
            "total_horas_maximas": float(r["total_horas_maximas"] or 0),
            "total_horas_asignadas": float(r["total_horas_asignadas"] or 0),
            "total_horas_disponibles": float(r["total_horas_disponibles"] or 0),
            "promedio_horas_asignadas": float(r["promedio_horas_asignadas"] or 0),
        }
        for r in rows
    ]


@router.get("/ocupacion-espacios")
def ocupacion_espacios(
    limite: int = Query(10, ge=1, le=50, description="Cantidad de espacios a devolver"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Ranking de espacios físicos por horas ocupadas (toda la semana)."""
    statement = text("""
        SELECT
            e.id_esp,
            e.ubicacion,
            e.nombre_centro,
            e.tipo_espacio,
            e.capacidad,
            COUNT(a.id_asig) AS total_asignaciones,
            COALESCE(SUM(EXTRACT(EPOCH FROM (a.hora_fin - a.hora_inicio)) / 3600.0), 0) AS horas_ocupadas
        FROM infraestructura.espacios_fis e
        LEFT JOIN horarios.asig_carga_horarias a
            ON a.id_esp = e.id_esp AND a.estatus = 'A'
        WHERE e.estatus = 'A'
        GROUP BY e.id_esp, e.ubicacion, e.nombre_centro, e.tipo_espacio, e.capacidad
        ORDER BY horas_ocupadas DESC, e.ubicacion ASC
        LIMIT :limite
    """).params(limite=limite)
    rows = session.exec(statement).mappings().all()
    return [
        {
            "id_esp": r["id_esp"],
            "ubicacion": r["ubicacion"],
            "nombre_centro": r["nombre_centro"],
            "tipo_espacio": r["tipo_espacio"],
            "capacidad": int(r["capacidad"]),
            "total_asignaciones": int(r["total_asignaciones"]),
            "horas_ocupadas": round(float(r["horas_ocupadas"]), 2),
        }
        for r in rows
    ]


@router.get("/estudiantes-por-programa")
def estudiantes_por_programa(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Cantidad de estudiantes activos por programa académico."""
    statement = text("""
        SELECT
            p.id_pro,
            p.codigo,
            p.nombre,
            p.tipo_sistema,
            COUNT(e.id_est) AS total_estudiantes
        FROM academico.programas p
        LEFT JOIN personas.estudiantes e
            ON e.id_pro = p.id_pro AND e.estatus = 'A'
        WHERE p.estatus = 'A'
        GROUP BY p.id_pro, p.codigo, p.nombre, p.tipo_sistema
        ORDER BY total_estudiantes DESC, p.codigo ASC
    """)
    rows = session.exec(statement).mappings().all()
    return [
        {
            "id_pro": r["id_pro"],
            "codigo": r["codigo"],
            "nombre": r["nombre"],
            "tipo_sistema": r["tipo_sistema"],
            "total_estudiantes": int(r["total_estudiantes"]),
        }
        for r in rows
    ]


@router.get("/periodo-vigente")
def periodo_vigente(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Devuelve el período académico marcado como vigente (o null si no hay)."""
    statement = text("""
        SELECT id_per, nombre, anio, numero_periodo, tipo, fecha_inicio, fecha_fin
        FROM academico.periodos_academicos
        WHERE activo = true AND estatus = 'A'
        ORDER BY anio DESC, numero_periodo DESC
        LIMIT 1
    """)
    r = session.exec(statement).mappings().first()
    if not r:
        return None
    return {
        "id_per": r["id_per"],
        "nombre": r["nombre"],
        "anio": int(r["anio"]),
        "numero_periodo": int(r["numero_periodo"]),
        "tipo": r["tipo"],
        "fecha_inicio": str(r["fecha_inicio"]),
        "fecha_fin": str(r["fecha_fin"]),
    }


@router.get("/cobertura-notas")
def cobertura_notas(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """
    Mide el AVANCE DE CARGA de notas, NO el rendimiento académico.
    Se usa en el Dashboard mientras el módulo de Notas está en desarrollo.
    """
    statement = text("""
        SELECT
            (SELECT COUNT(*) FROM academico.notas WHERE estatus = 'A') AS notas_registradas,
            (SELECT COUNT(*) FROM personas.estudiantes WHERE estatus = 'A') AS estudiantes_activos,
            (SELECT COUNT(DISTINCT id_est) FROM academico.notas WHERE estatus = 'A') AS estudiantes_evaluados,
            (SELECT COUNT(*) FROM academico.malla_curricular WHERE estatus = 'A') AS materias_en_malla
    """)
    r = session.exec(statement).mappings().first()
    total_est = int(r["estudiantes_activos"] or 0)
    evaluados = int(r["estudiantes_evaluados"] or 0)
    return {
        "notas_registradas": int(r["notas_registradas"] or 0),
        "estudiantes_activos": total_est,
        "estudiantes_evaluados": evaluados,
        "materias_en_malla": int(r["materias_en_malla"] or 0),
        "porcentaje_cobertura": round((evaluados / total_est * 100), 2) if total_est > 0 else 0.0,
    }

# ============================================================
# RENDIMIENTO ACADÉMICO CONSOLIDADO (v4.6)
# Solo notas OFICIALES: Final o Recuperación (esta prevalece).
# ============================================================

@router.get("/rendimiento-academico")
def rendimiento_academico(
    id_per: Optional[int] = Query(None, description="Filtrar por período académico"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """
    KPIs académicos institucionales calculados en el motor de BD.
    DISTINCT ON garantiza una sola nota oficial por estudiante-materia-período.
    """
    filtro = " AND n.id_per = :id_per" if id_per else ""
    params = {"id_per": id_per} if id_per else {}

    cte = f"""
        WITH definitivas AS (
            SELECT DISTINCT ON (n.id_est, n.id_malla, n.id_per)
                   n.id_est, n.id_malla, n.id_per, n.nota
            FROM academico.notas n
            WHERE n.estatus = 'A'
              AND n.tipo_evaluacion IN ('Final', 'Recuperación')
              {filtro}
            ORDER BY n.id_est, n.id_malla, n.id_per,
                     CASE n.tipo_evaluacion WHEN 'Recuperación' THEN 1 ELSE 2 END
        )
    """

    # --- 1. Resumen institucional + distribución por rangos ---
    row = session.exec(text(cte + """
        SELECT
            count(*)                                                   AS total_evaluaciones,
            count(DISTINCT id_est)                                     AS estudiantes_evaluados,
            COALESCE(round(avg(nota), 2), 0)                           AS promedio_general,
            COALESCE(round(stddev(nota), 2), 0)                        AS desviacion_estandar,
            COALESCE(min(nota), 0)                                     AS nota_minima,
            COALESCE(max(nota), 0)                                     AS nota_maxima,
            count(CASE WHEN nota >= 10 THEN 1 END)                     AS aprobados,
            count(CASE WHEN nota <  10 THEN 1 END)                     AS reprobados,
            COALESCE(round(count(CASE WHEN nota >= 10 THEN 1 END)::numeric
                     / NULLIF(count(*), 0) * 100, 2), 0)               AS porcentaje_aprobacion,
            count(CASE WHEN nota >= 18 THEN 1 END)                     AS r_excelencia,
            count(CASE WHEN nota >= 15 AND nota < 18 THEN 1 END)       AS r_notable,
            count(CASE WHEN nota >= 10 AND nota < 15 THEN 1 END)       AS r_aprobado,
            count(CASE WHEN nota >=  5 AND nota < 10 THEN 1 END)       AS r_reprobado,
            count(CASE WHEN nota <   5 THEN 1 END)                     AS r_critico
        FROM definitivas
    """).params(**params)).mappings().first()

    resumen = {
        "total_evaluaciones": int(row["total_evaluaciones"] or 0),
        "estudiantes_evaluados": int(row["estudiantes_evaluados"] or 0),
        "promedio_general": float(row["promedio_general"] or 0),
        "desviacion_estandar": float(row["desviacion_estandar"] or 0),
        "nota_minima": float(row["nota_minima"] or 0),
        "nota_maxima": float(row["nota_maxima"] or 0),
        "aprobados": int(row["aprobados"] or 0),
        "reprobados": int(row["reprobados"] or 0),
        "porcentaje_aprobacion": float(row["porcentaje_aprobacion"] or 0),
    }

    distribucion = [
        {"rango": "Excelencia (18-20)", "cantidad": int(row["r_excelencia"] or 0), "color": "#059669"},
        {"rango": "Notable (15-17)",    "cantidad": int(row["r_notable"] or 0),    "color": "#2563eb"},
        {"rango": "Aprobado (10-14)",   "cantidad": int(row["r_aprobado"] or 0),   "color": "#7c3aed"},
        {"rango": "Reprobado (5-9)",    "cantidad": int(row["r_reprobado"] or 0),  "color": "#d97706"},
        {"rango": "Crítico (0-4)",      "cantidad": int(row["r_critico"] or 0),    "color": "#dc2626"},
    ]

    # --- 2. Cobertura de evaluación ---
    cob = session.exec(text("""
        SELECT
            (SELECT count(*) FROM personas.estudiantes WHERE estatus = 'A') AS activos,
            (SELECT count(*) FROM academico.notas WHERE estatus = 'A')      AS notas_registradas
    """)).mappings().first()
    activos = int(cob["activos"] or 0)
    evaluados = resumen["estudiantes_evaluados"]
    cobertura = {
        "estudiantes_activos": activos,
        "estudiantes_evaluados": evaluados,
        "notas_registradas": int(cob["notas_registradas"] or 0),
        "porcentaje_cobertura": round(evaluados / activos * 100, 2) if activos else 0.0,
    }

    # --- 3. Desempeño por programa ---
    rows_prog = session.exec(text(cte + """
        SELECT p.codigo, p.nombre,
               count(*)                        AS evaluaciones,
               count(DISTINCT d.id_est)        AS estudiantes,
               round(avg(d.nota), 2)           AS promedio,
               count(CASE WHEN d.nota >= 10 THEN 1 END) AS aprobados,
               round(count(CASE WHEN d.nota >= 10 THEN 1 END)::numeric
                     / NULLIF(count(*), 0) * 100, 2)    AS porcentaje_aprobacion
        FROM definitivas d
        JOIN academico.malla_curricular mc ON mc.id_malla = d.id_malla
        JOIN academico.programas p         ON p.id_pro  = mc.id_pro
        GROUP BY p.codigo, p.nombre
        ORDER BY p.codigo
    """).params(**params)).mappings().all()

    por_programa = [
        {
            "codigo": r["codigo"], "nombre": r["nombre"],
            "evaluaciones": int(r["evaluaciones"]), "estudiantes": int(r["estudiantes"]),
            "promedio": float(r["promedio"] or 0), "aprobados": int(r["aprobados"]),
            "porcentaje_aprobacion": float(r["porcentaje_aprobacion"] or 0),
        } for r in rows_prog
    ]

    # --- 4. Materias en riesgo académico (menor % de aprobación) ---
    q_riesgo = """
        SELECT cod_programa, materia, trayecto, periodo, periodo_academico,
               total_estudiantes_evaluados, promedio, aprobados, reprobados, porcentaje_aprobacion
        FROM academico.vw_analisis_notas
        WHERE reprobados > 0
    """
    p_riesgo = {}
    if id_per:
        q_riesgo += " AND periodo_academico = (SELECT nombre FROM academico.periodos_academicos WHERE id_per = :id_per)"
        p_riesgo["id_per"] = id_per
    q_riesgo += " ORDER BY porcentaje_aprobacion ASC, reprobados DESC LIMIT 6"

    rows_riesgo = session.exec(text(q_riesgo).params(**p_riesgo)).mappings().all()
    materias_riesgo = [
        {
            "cod_programa": r["cod_programa"], "materia": r["materia"],
            "trayecto": int(r["trayecto"]), "periodo": int(r["periodo"]),
            "periodo_academico": r["periodo_academico"],
            "evaluados": int(r["total_estudiantes_evaluados"]),
            "promedio": float(r["promedio"] or 0),
            "aprobados": int(r["aprobados"]), "reprobados": int(r["reprobados"]),
            "porcentaje_aprobacion": float(r["porcentaje_aprobacion"] or 0),
        } for r in rows_riesgo
    ]

    return {
        "resumen": resumen,
        "distribucion": distribucion,
        "cobertura": cobertura,
        "por_programa": por_programa,
        "materias_riesgo": materias_riesgo,
    }

# ============================================================
# METADATOS REALES DEL SISTEMA (v5.5)
# Conteos estructurales + salud de integridad, todo desde pg_catalog.
# Accesible a cualquier usuario autenticado (alimenta el StatusBar).
# ============================================================
from app.dependencies.auth_deps import obtener_usuario_actual


@router.get("/sistema")
def info_sistema(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Metadatos vivos del motor: esquemas, tablas, vistas, integridad y volumen."""

    # --- 1. Tablas y vistas por esquema ---
    rows = session.exec(text("""
        SELECT table_schema AS esquema,
               count(*) FILTER (WHERE table_type = 'BASE TABLE') AS tablas,
               count(*) FILTER (WHERE table_type = 'VIEW')       AS vistas
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        GROUP BY table_schema
        ORDER BY table_schema
    """)).mappings().all()
    esquemas = [{"esquema": r["esquema"], "tablas": int(r["tablas"]), "vistas": int(r["vistas"])} for r in rows]
    total_tablas = sum(e["tablas"] for e in esquemas)
    total_vistas = sum(e["vistas"] for e in esquemas)

    # --- 2. Objetos de integridad ---
    cat = session.exec(text("""
        SELECT
            (SELECT count(*) FROM pg_trigger t
               JOIN pg_class c ON c.oid = t.tgrelid
               JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE NOT t.tgisinternal
                AND n.nspname NOT IN ('pg_catalog','information_schema')) AS triggers,
            (SELECT count(*) FROM pg_indexes
              WHERE schemaname NOT IN ('pg_catalog','information_schema')) AS indices,
            (SELECT count(*) FROM pg_constraint co
               JOIN pg_namespace n ON n.oid = co.connamespace
              WHERE co.contype = 'f'
                AND n.nspname NOT IN ('pg_catalog','information_schema')) AS foraneas,
            (SELECT count(*) FROM pg_constraint co
               JOIN pg_namespace n ON n.oid = co.connamespace
              WHERE co.contype = 'c'
                AND n.nspname NOT IN ('pg_catalog','information_schema')) AS checks,
            (SELECT count(*) FROM pg_constraint co
               JOIN pg_namespace n ON n.oid = co.connamespace
              WHERE co.contype = 'u'
                AND n.nspname NOT IN ('pg_catalog','information_schema')) AS unicos
    """)).mappings().first()

    # --- 3. Triggers de auditoría duplicados ---
    dup = session.exec(text("""
        SELECT n.nspname AS esquema, c.relname AS tabla, count(*) AS cantidad
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE NOT t.tgisinternal AND p.proname = 'fn_auditoria_general'
        GROUP BY n.nspname, c.relname
        HAVING count(*) > 1
        ORDER BY c.relname
    """)).mappings().all()
    duplicados = [{"esquema": r["esquema"], "tabla": r["tabla"], "cantidad": int(r["cantidad"])} for r in dup]

    # --- 4. Volumen de datos ---
    vol = session.exec(text("""
        SELECT
            (SELECT count(*) FROM personas.docentes)                      AS docentes,
            (SELECT count(*) FROM personas.docentes WHERE estatus='A')    AS docentes_act,
            (SELECT count(*) FROM personas.estudiantes)                   AS estudiantes,
            (SELECT count(*) FROM personas.estudiantes WHERE estatus='A') AS estudiantes_act,
            (SELECT count(*) FROM academico.materias)                     AS materias,
            (SELECT count(*) FROM academico.malla_curricular)             AS malla,
            (SELECT count(*) FROM academico.notas)                        AS notas,
            (SELECT count(*) FROM academico.notas WHERE estatus='A')      AS notas_act,
            (SELECT count(*) FROM horarios.asig_carga_horarias)           AS asignaciones,
            (SELECT count(*) FROM infraestructura.espacios_fis)           AS espacios,
            (SELECT count(*) FROM general.municipios)                     AS municipios,
            (SELECT count(*) FROM general.aud_mov)                        AS auditoria,
            (SELECT count(*) FROM general.roles)                          AS roles,
            (SELECT count(*) FROM general.modulos)                        AS modulos,
            (SELECT count(*) FROM general.permisos_rol)                   AS permisos_rol,
            (SELECT count(*) FROM general.usuarios)                       AS usuarios
    """)).mappings().first()
    volumen = {k: int(v or 0) for k, v in dict(vol).items()}

    # --- 5. Salud de integridad (cada prueba debe dar 0) ---
    # Nota: el rol 5 (ESTUDIANTE) está reservado sin permisos por diseño → se excluye.
    salud_rows = session.exec(text("""
        SELECT 'Horas disponibles inconsistentes' AS prueba, count(*) AS fallas
        FROM personas.docentes
        WHERE horas_disponibles <> (horas_max_sem - horas_asignadas)
        UNION ALL
        SELECT 'Notas en trayecto distinto al del estudiante', count(*)
        FROM academico.notas n
        JOIN personas.estudiantes e ON e.id_est = n.id_est
        JOIN academico.malla_curricular mc ON mc.id_malla = n.id_malla
        WHERE mc.trayecto <> e.trayecto AND n.estatus = 'A'
        UNION ALL
        SELECT 'Notas de programa distinto al del estudiante', count(*)
        FROM academico.notas n
        JOIN personas.estudiantes e ON e.id_est = n.id_est
        JOIN academico.malla_curricular mc ON mc.id_malla = n.id_malla
        WHERE mc.id_pro <> e.id_pro AND n.estatus = 'A'
        UNION ALL
        SELECT 'Períodos fuera del rango de su sistema', count(*)
        FROM academico.malla_curricular mc
        JOIN academico.programas p ON p.id_pro = mc.id_pro
        WHERE mc.periodo > CASE p.tipo_sistema WHEN 'Trimestral' THEN 3 ELSE 2 END
        UNION ALL
        SELECT 'Movimientos de auditoría sin autor', count(*)
        FROM general.aud_mov WHERE id_usu IS NULL
        UNION ALL
        SELECT 'Movimientos de auditoría sin IP', count(*)
        FROM general.aud_mov WHERE dir_ip IS NULL
        UNION ALL
        SELECT 'Roles operativos sin permisos', count(*)
        FROM general.roles r
        WHERE r.estatus = 'A' AND r.id_rol <> 5
          AND NOT EXISTS (SELECT 1 FROM general.permisos_rol pr
                          WHERE pr.id_rol = r.id_rol AND pr.estatus = 'A')
    """)).mappings().all()
    salud = [{"prueba": r["prueba"], "fallas": int(r["fallas"]), "ok": int(r["fallas"]) == 0} for r in salud_rows]

    # --- 6. Motor ---
    motor = session.exec(text("""
        SELECT current_database() AS bd,
               pg_size_pretty(pg_database_size(current_database())) AS tamano,
               (SELECT count(*) FROM pg_stat_activity
                 WHERE datname = current_database()) AS conexiones
    """)).mappings().first()
    version = session.exec(text("SELECT version()")).first()

    return {
        "motor": {
            "base_datos": motor["bd"],
            "version": str(version[0]).split(" on ")[0] if version else "PostgreSQL",
            "tamano": motor["tamano"],
            "conexiones": int(motor["conexiones"]),
        },
        "estructura": {"esquemas": len(esquemas), "tablas": total_tablas, "vistas": total_vistas, "desglose": esquemas},
        "catalogo": {
            "triggers": int(cat["triggers"]), "indices": int(cat["indices"]),
            "foraneas": int(cat["foraneas"]), "checks": int(cat["checks"]),
            "unicos": int(cat["unicos"]), "triggers_duplicados": duplicados,
        },
        "volumen": volumen,
        "salud": salud,
        "salud_ok": all(s["ok"] for s in salud),
    }

    # ============================================================
# ANALYTICS AVANZADO (v5.7) — Opción 2
# Tendencias, comparativas por trayecto/eje, ocupación por día,
# distribución geográfica e histograma fino de notas.
# ============================================================

_CTE_DEFINITIVAS = """
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


@router.get("/tendencia-academica")
def tendencia_academica(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Evolución del promedio y % de aprobación por período académico (serie temporal)."""
    rows = session.exec(text(_CTE_DEFINITIVAS + """
        SELECT pa.id_per, pa.nombre AS periodo, pa.anio, pa.numero_periodo, pa.tipo,
               pa.fecha_inicio,
               count(*)                          AS evaluaciones,
               count(DISTINCT d.id_est)          AS estudiantes,
               round(avg(d.nota), 2)             AS promedio,
               count(CASE WHEN d.nota >= 10 THEN 1 END) AS aprobados,
               round(count(CASE WHEN d.nota >= 10 THEN 1 END)::numeric
                     / NULLIF(count(*), 0) * 100, 2)    AS pct_aprobacion
        FROM definitivas d
        JOIN academico.periodos_academicos pa ON pa.id_per = d.id_per
        GROUP BY pa.id_per, pa.nombre, pa.anio, pa.numero_periodo, pa.tipo, pa.fecha_inicio
        ORDER BY pa.fecha_inicio
    """)).mappings().all()
    return [
        {
            "id_per": r["id_per"], "periodo": r["periodo"], "anio": int(r["anio"]),
            "numero_periodo": int(r["numero_periodo"]), "tipo": r["tipo"],
            "fecha_inicio": str(r["fecha_inicio"]),
            "evaluaciones": int(r["evaluaciones"]), "estudiantes": int(r["estudiantes"]),
            "promedio": float(r["promedio"] or 0), "aprobados": int(r["aprobados"]),
            "pct_aprobacion": float(r["pct_aprobacion"] or 0),
        } for r in rows
    ]


@router.get("/desempeno-por-trayecto")
def desempeno_por_trayecto(
    id_pro: Optional[int] = Query(None, description="Filtrar por programa"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Comparativa de rendimiento por trayecto dentro de cada programa."""
    filtro = " AND p.id_pro = :id_pro" if id_pro else ""
    params = {"id_pro": id_pro} if id_pro else {}
    rows = session.exec(text(_CTE_DEFINITIVAS + """
        SELECT p.codigo AS cod_programa, p.nombre AS programa, mc.trayecto,
               count(*)                          AS evaluaciones,
               count(DISTINCT d.id_est)          AS estudiantes,
               round(avg(d.nota), 2)             AS promedio,
               count(CASE WHEN d.nota >= 10 THEN 1 END) AS aprobados,
               round(count(CASE WHEN d.nota >= 10 THEN 1 END)::numeric
                     / NULLIF(count(*), 0) * 100, 2)    AS pct_aprobacion
        FROM definitivas d
        JOIN academico.malla_curricular mc ON mc.id_malla = d.id_malla
        JOIN academico.programas p         ON p.id_pro  = mc.id_pro
        WHERE 1=1
    """ + filtro + """
        GROUP BY p.codigo, p.nombre, mc.trayecto
        ORDER BY p.codigo, mc.trayecto
    """).params(**params)).mappings().all()
    return [
        {
            "cod_programa": r["cod_programa"], "programa": r["programa"],
            "trayecto": int(r["trayecto"]),
            "evaluaciones": int(r["evaluaciones"]), "estudiantes": int(r["estudiantes"]),
            "promedio": float(r["promedio"] or 0), "aprobados": int(r["aprobados"]),
            "pct_aprobacion": float(r["pct_aprobacion"] or 0),
        } for r in rows
    ]


@router.get("/desempeno-por-eje")
def desempeno_por_eje(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Rendimiento agregado por eje formativo (Proyecto, Socio-Crítico, etc.)."""
    rows = session.exec(text(_CTE_DEFINITIVAS + """
        SELECT eje.codigo AS cod_eje, eje.nombre AS eje,
               count(DISTINCT m.id_mat)          AS materias,
               count(*)                          AS evaluaciones,
               round(avg(d.nota), 2)             AS promedio,
               count(CASE WHEN d.nota >= 10 THEN 1 END) AS aprobados,
               round(count(CASE WHEN d.nota >= 10 THEN 1 END)::numeric
                     / NULLIF(count(*), 0) * 100, 2)    AS pct_aprobacion
        FROM definitivas d
        JOIN academico.malla_curricular mc ON mc.id_malla = d.id_malla
        JOIN academico.materias m          ON m.id_mat  = mc.id_mat
        JOIN academico.ejes_formativos eje ON eje.id_eje = m.id_eje
        GROUP BY eje.codigo, eje.nombre
        ORDER BY promedio DESC
    """)).mappings().all()
    return [
        {
            "cod_eje": r["cod_eje"], "eje": r["eje"], "materias": int(r["materias"]),
            "evaluaciones": int(r["evaluaciones"]),
            "promedio": float(r["promedio"] or 0), "aprobados": int(r["aprobados"]),
            "pct_aprobacion": float(r["pct_aprobacion"] or 0),
        } for r in rows
    ]


@router.get("/ocupacion-sabado")
def ocupacion_sabado(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Ocupación de las aulas rotativas los sábados (requisito Vicerrectora)."""
    rows = session.exec(text("""
        SELECT aula, nombre_centro, total_asignaciones_sabado,
               COALESCE(horas_ocupadas, 0) AS horas_ocupadas
        FROM general.vw_ocupacion_aulas_sabado
        ORDER BY horas_ocupadas DESC NULLS LAST, aula
    """)).mappings().all()
    return [
        {
            "aula": r["aula"], "nombre_centro": r["nombre_centro"],
            "total_asignaciones_sabado": int(r["total_asignaciones_sabado"] or 0),
            "horas_ocupadas": round(float(r["horas_ocupadas"] or 0), 2),
        } for r in rows
    ]


@router.get("/ocupacion-por-dia")
def ocupacion_por_dia(
    id_dia: int = Query(..., ge=1, le=7, description="Día laboral (5=Viernes, 6=Sábado…)"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Ocupación de aulas para un día específico."""
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
        {
            "id_esp": r["id_esp"], "aula": r["aula"], "nombre_centro": r["nombre_centro"],
            "capacidad": int(r["capacidad"]), "total_asignaciones": int(r["total_asignaciones"]),
            "horas_ocupadas": round(float(r["horas_ocupadas"]), 2),
        } for r in rows
    ]


@router.get("/distribucion-geografica")
def distribucion_geografica(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual),
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
        {
            "id_mun": r["id_mun"], "municipio": r["municipio"],
            "estudiantes": int(r["estudiantes"]), "docentes": int(r["docentes"]),
            "espacios": int(r["espacios"]),
        } for r in rows
    ]


@router.get("/histograma-notas")
def histograma_notas(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """Histograma fino de notas oficiales en 10 bins de 2 puntos (0-20)."""
    rows = session.exec(text(_CTE_DEFINITIVAS + """
        SELECT LEAST(width_bucket(d.nota, 0, 20, 10), 10) AS bin, count(*) AS cantidad
        FROM definitivas d
        GROUP BY bin
        ORDER BY bin
    """)).mappings().all()
    return [{"bin": int(r["bin"]), "cantidad": int(r["cantidad"])} for r in rows]