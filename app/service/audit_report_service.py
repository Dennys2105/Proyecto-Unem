"""
════════════════════════════════════════════════════════════════
 UNEM · SERVICE DE REPORTES DE SEGURIDAD Y AUDITORÍA (v5.4)
────────────────────────────────────────────────────────────────
 Consolida la bitácora forense (general.aud_mov) en reportes
 accionables para el administrador:

   1. reporte_diario        → resumen operativo de una fecha
   2. detectar_anomalias    → patrones sospechosos (ráfagas,
                               horarios atípicos, multi-IP, etc.)
   3. cambios_de_notas      → trazabilidad anti-fraude académico
   4. cambios_de_privilegios→ escalada/modificación de permisos
   5. eventos_de_acceso     → logins, intentos fallidos, bloqueos
   6. reporte_ejecutivo     → paquete consolidado para dirección

 Todas las consultas son de SOLO LECTURA sobre la bitácora y
 catálogos de seguridad. No modifican datos.
════════════════════════════════════════════════════════════════
"""
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlmodel import Session, text

# ── Tablas consideradas sensibles para privilegios (constantes,
#    sin entrada del usuario → sin riesgo de inyección) ──
_TABLAS_PRIVILEGIO = (
    'permisos_rol', 'permisos_usuario', 'roles',
    'modulos', 'permisos', 'usuarios',
)
_IN_PRIVILEGIO = ", ".join(f"'{t}'" for t in _TABLAS_PRIVILEGIO)

_BASE_MOV = """
    FROM general.aud_mov m
    LEFT JOIN general.usuarios u ON u.id_usu = m.id_usu
"""


# ════════════════════════════════════════════════════════════
#  HELPERS
# ════════════════════════════════════════════════════════════
def _rango(
    columna: str,
    desde: Optional[date],
    hasta: Optional[date],
) -> Tuple[str, Dict[str, Any]]:
    """Construye el filtro de rango de fechas y sus parámetros."""
    conds: List[str] = []
    params: Dict[str, Any] = {}
    if desde:
        conds.append(f"{columna}::date >= :desde")
        params["desde"] = desde
    if hasta:
        conds.append(f"{columna}::date <= :hasta")
        params["hasta"] = hasta
    sql = (" AND " + " AND ".join(conds)) if conds else ""
    return sql, params


def _filas(session: Session, sql: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows = session.exec(text(sql).params(**params)).mappings().all()
    return [dict(r) for r in rows]


def _una(session: Session, sql: str, params: Dict[str, Any]) -> Dict[str, Any]:
    row = session.exec(text(sql).params(**params)).mappings().first()
    return dict(row) if row else {}


def _serializar(reg: Dict[str, Any]) -> Dict[str, Any]:
    """Convierte tipos de Postgres a JSON-seguros."""
    out: Dict[str, Any] = {}
    for k, v in reg.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, date):
            out[k] = v.isoformat()
        elif hasattr(v, "as_integer_ratio"):  # Decimal / float / int
            out[k] = float(v) if not isinstance(v, int) else v
        else:
            out[k] = v
    return out


# ════════════════════════════════════════════════════════════
#  SERVICE
# ════════════════════════════════════════════════════════════
class AuditReportService:
    """Reportes de seguridad construidos sobre la bitácora forense."""

    # ────────────────────────────────────────────────────────
    # 1) REPORTE DIARIO
    # ────────────────────────────────────────────────────────
    @staticmethod
    def reporte_diario(session: Session, fecha: date) -> Dict[str, Any]:
        """Resumen operativo de un día: volumen, autores, tablas y accesos."""
        p: Dict[str, Any] = {"fecha": fecha}

        totales = _una(session, f"""
            SELECT
                count(*)                                            AS total_movimientos,
                count(*) FILTER (WHERE m.accion = 'INSERT')         AS inserciones,
                count(*) FILTER (WHERE m.accion = 'UPDATE')         AS actualizaciones,
                count(*) FILTER (WHERE m.accion = 'DELETE')         AS eliminaciones,
                count(*) FILTER (WHERE m.id_usu IS NULL)            AS sin_autor,
                count(DISTINCT m.id_usu)                            AS usuarios_activos,
                count(DISTINCT m.dir_ip)                            AS ips_distintas
            {_BASE_MOV}
            WHERE m.estatus = 'A' AND m.fec_hor::date = :fecha
        """, p)

        por_tabla = _filas(session, f"""
            SELECT m.tabla_mod AS tabla, count(*) AS movimientos
            {_BASE_MOV}
            WHERE m.estatus = 'A' AND m.fec_hor::date = :fecha
            GROUP BY m.tabla_mod
            ORDER BY movimientos DESC
        """, p)

        por_usuario = _filas(session, f"""
            SELECT COALESCE(u.username, 'Sistema/Script') AS usuario,
                   count(*) AS movimientos
            {_BASE_MOV}
            WHERE m.estatus = 'A' AND m.fec_hor::date = :fecha
            GROUP BY 1
            ORDER BY movimientos DESC
        """, p)

        por_hora = _filas(session, f"""
            SELECT EXTRACT(HOUR FROM m.fec_hor)::int AS hora, count(*) AS movimientos
            {_BASE_MOV}
            WHERE m.estatus = 'A' AND m.fec_hor::date = :fecha
            GROUP BY 1
            ORDER BY 1
        """, p)

        accesos = _una(session, f"""
            SELECT
                count(*) FILTER (
                    WHERE (m.val_despues->>'ultimo_acceso') IS DISTINCT FROM
                          (m.val_antes->>'ultimo_acceso')
                ) AS logins_exitosos,
                count(*) FILTER (
                    WHERE (m.val_despues->>'intentos_fallidos')::int >
                          COALESCE((m.val_antes->>'intentos_fallidos')::int, 0)
                ) AS intentos_fallidos,
                count(*) FILTER (
                    WHERE (m.val_despues->>'bloqueado_hasta') IS NOT NULL
                      AND (m.val_antes->>'bloqueado_hasta') IS NULL
                ) AS cuentas_bloqueadas
            {_BASE_MOV}
            WHERE m.estatus = 'A' AND m.fec_hor::date = :fecha
              AND m.tabla_mod = 'credenciales'
        """, p)

        return {
            "fecha": fecha.isoformat(),
            "totales": _serializar(totales),
            "por_tabla": [_serializar(r) for r in por_tabla],
            "por_usuario": [_serializar(r) for r in por_usuario],
            "por_hora": [_serializar(r) for r in por_hora],
            "accesos": _serializar(accesos),
        }

    # ────────────────────────────────────────────────────────
    # 2) DETECCIÓN DE ANOMALÍAS
    # ────────────────────────────────────────────────────────
    @staticmethod
    def detectar_anomalias(
        session: Session,
        fecha: Optional[date] = None,
        ventana_min: int = 10,
        umbral_rafaga: int = 3,
        umbral_borrados: int = 5,
        hora_min: int = 7,
        hora_max: int = 21,
    ) -> List[Dict[str, Any]]:
        """
        Barrido de patrones sospechosos. Cada hallazgo devuelve:
        tipo, severidad (alta/media/baja), descripcion y evidencia.
        """
        ventana_min = max(1, int(ventana_min))          # saneado: evita inyección
        umbral_rafaga = max(2, int(umbral_rafaga))
        umbral_borrados = max(1, int(umbral_borrados))
        filtro, p = _rango("m.fec_hor", fecha, fecha)
        p.update({"ventana": ventana_min, "umbral": umbral_rafaga,
                  "umbral_b": umbral_borrados,
                  "hmin": int(hora_min), "hmax": int(hora_max)})
        anomalias: List[Dict[str, Any]] = []

        # ── A) Ráfaga de cambios en NOTAS (posible manipulación de actas) ──
        rafagas = _filas(session, f"""
            WITH mov_notas AS (
                SELECT m.id_usu, m.fec_hor,
                       COALESCE(u.username, 'Sistema/Script') AS usuario,
                       count(*) OVER (
                           PARTITION BY m.id_usu
                           ORDER BY m.fec_hor
                           RANGE BETWEEN (:ventana || ' minutes')::interval
                                     PRECEDING AND CURRENT ROW
                       ) AS racha
                {_BASE_MOV}
                WHERE m.estatus = 'A' AND m.tabla_mod = 'notas'
                  AND m.accion IN ('INSERT', 'UPDATE') {filtro}
            )
            SELECT usuario,
                   date_trunc('hour', fec_hor) AS ventana_inicio,
                   max(racha) AS movimientos_en_ventana
            FROM mov_notas
            WHERE racha >= :umbral
            GROUP BY 1, 2
            ORDER BY 3 DESC
        """, p)
        for r in rafagas:
            anomalias.append({
                "tipo": "RAFAGA_NOTAS",
                "severidad": "alta",
                "descripcion": (
                    f"El usuario '{r['usuario']}' realizó {r['movimientos_en_ventana']} "
                    f"cambios de notas en {ventana_min} min."
                ),
                "evidencia": _serializar(r),
            })

        # ── B) Movimientos sin autor atribuido (sesión sin inyectar) ──
        sin_autor = _una(session, f"""
            SELECT count(*) AS cantidad
            {_BASE_MOV}
            WHERE m.estatus = 'A' AND m.id_usu IS NULL {filtro}
        """, p)
        if sin_autor.get("cantidad", 0) > 0:
            anomalias.append({
                "tipo": "SIN_AUTOR",
                "severidad": "media",
                "descripcion": (
                    f"{sin_autor['cantidad']} movimiento(s) sin usuario atribuido "
                    "(ejecutados fuera de la aplicación o antes de la inyección de sesión)."
                ),
                "evidencia": _serializar(sin_autor),
            })

        # ── C) Actividad fuera del horario operativo ──
        fuera_horario = _filas(session, f"""
            SELECT COALESCE(u.username, 'Sistema/Script') AS usuario,
                   m.fec_hor::date AS dia,
                   EXTRACT(HOUR FROM m.fec_hor)::int AS hora,
                   count(*) AS movimientos
            {_BASE_MOV}
            WHERE m.estatus = 'A'
              AND EXTRACT(HOUR FROM m.fec_hor) NOT BETWEEN :hmin AND :hmax {filtro}
            GROUP BY 1, 2, 3
            ORDER BY 2 DESC, 3
        """, p)
        for r in fuera_horario:
            anomalias.append({
                "tipo": "FUERA_DE_HORARIO",
                "severidad": "media",
                "descripcion": (
                    f"'{r['usuario']}' operó a las {r['hora']}:00 del {r['dia']} "
                    f"({r['movimientos']} movimientos) fuera del rango {hora_min}:00–{hora_max}:00."
                ),
                "evidencia": _serializar(r),
            })

        # ── D) Mismo usuario desde varias IPs en un día ──
        multi_ip = _filas(session, f"""
            SELECT COALESCE(u.username, 'Sistema/Script') AS usuario,
                   m.fec_hor::date AS dia,
                   count(DISTINCT m.dir_ip) AS ips,
                   array_agg(DISTINCT m.dir_ip) AS direcciones
            {_BASE_MOV}
            WHERE m.estatus = 'A' AND m.dir_ip IS NOT NULL {filtro}
            GROUP BY 1, 2
            HAVING count(DISTINCT m.dir_ip) > 1
            ORDER BY 3 DESC
        """, p)
        for r in multi_ip:
            anomalias.append({
                "tipo": "MULTI_IP",
                "severidad": "media",
                "descripcion": (
                    f"'{r['usuario']}' registró movimientos desde {r['ips']} IPs "
                    f"distintas el {r['dia']}."
                ),
                "evidencia": _serializar(r),
            })

        # ── E) Borrado lógico masivo (anulaciones en bloque) ──
        borrados = _filas(session, f"""
            SELECT COALESCE(u.username, 'Sistema/Script') AS usuario,
                   m.tabla_mod AS tabla,
                   m.fec_hor::date AS dia,
                   count(*) AS anulaciones
            {_BASE_MOV}
            WHERE m.estatus = 'A' AND m.accion = 'UPDATE'
              AND m.val_antes->>'estatus' = 'A'
              AND m.val_despues->>'estatus' = 'I' {filtro}
            GROUP BY 1, 2, 3
            HAVING count(*) > :umbral_b
            ORDER BY 4 DESC
        """, p)
        for r in borrados:
            anomalias.append({
                "tipo": "BORRADO_MASIVO",
                "severidad": "media",
                "descripcion": (
                    f"'{r['usuario']}' anuló {r['anulaciones']} registros de "
                    f"'{r['tabla']}' el {r['dia']}."
                ),
                "evidencia": _serializar(r),
            })

        # ── F) Bloqueos de cuenta ──
        bloqueos = _filas(session, f"""
            SELECT COALESCE(u2.username, 'Sistema/Script') AS usuario_afectado,
                   m.fec_hor, m.dir_ip
            {_BASE_MOV}
            LEFT JOIN general.usuarios u2
                   ON u2.id_usu = (m.val_despues->>'id_usu')::int
            WHERE m.estatus = 'A' AND m.tabla_mod = 'credenciales'
              AND (m.val_despues->>'bloqueado_hasta') IS NOT NULL
              AND (m.val_antes->>'bloqueado_hasta') IS NULL {filtro}
            ORDER BY m.fec_hor DESC
        """, p)
        for r in bloqueos:
            anomalias.append({
                "tipo": "BLOQUEO_CUENTA",
                "severidad": "alta",
                "descripcion": (
                    f"La cuenta '{r['usuario_afectado']}' fue bloqueada por intentos fallidos."
                ),
                "evidencia": _serializar(r),
            })

        # ── G) Cambios de privilegios (se listan aparte, aquí solo conteo) ──
        priv = _una(session, f"""
            SELECT count(*) AS cantidad
            {_BASE_MOV}
            WHERE m.estatus = 'A' AND m.tabla_mod IN ({_IN_PRIVILEGIO}) {filtro}
        """, p)
        if priv.get("cantidad", 0) > 0:
            anomalias.append({
                "tipo": "CAMBIO_PRIVILEGIOS",
                "severidad": "alta",
                "descripcion": (
                    f"{priv['cantidad']} modificación(es) en la matriz de permisos/roles. "
                    "Revise el detalle en /reportes-seguridad/permisos."
                ),
                "evidencia": _serializar(priv),
            })

        return anomalias

    # ────────────────────────────────────────────────────────
    # 3) CAMBIOS DE NOTAS (anti-fraude académico)
    # ────────────────────────────────────────────────────────
    @staticmethod
    def cambios_de_notas(
        session: Session,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
        limite: int = 100,
    ) -> Dict[str, Any]:
        """Trazabilidad completa de cada calificación modificada."""
        filtro, p = _rango("m.fec_hor", desde, hasta)
        p["limite"] = max(1, min(int(limite), 500))

        detalle = _filas(session, f"""
            SELECT m.id_aud, m.fec_hor, m.accion, m.dir_ip,
                   COALESCE(u.username, 'Sistema/Script') AS usuario,
                   COALESCE((m.val_despues->>'id_nota')::int,
                            (m.val_antes->>'id_nota')::int)          AS id_nota,
                   (m.val_antes->>'nota')::numeric                   AS nota_antes,
                   (m.val_despues->>'nota')::numeric                 AS nota_despues,
                   m.val_antes->>'estatus'                           AS estatus_antes,
                   m.val_despues->>'estatus'                         AS estatus_despues,
                   m.val_antes->>'tipo_evaluacion'                   AS tipo_evaluacion,
                   e.cedula                                          AS cedula,
                   (e.nombre || ' ' || e.apellido)                   AS estudiante,
                   mat.codigo                                        AS cod_materia,
                   mat.nombre                                        AS materia,
                   pa.nombre                                         AS periodo
            {_BASE_MOV}
            LEFT JOIN personas.estudiantes e
                   ON e.id_est = COALESCE((m.val_despues->>'id_est')::int,
                                          (m.val_antes->>'id_est')::int)
            LEFT JOIN academico.malla_curricular mc
                   ON mc.id_malla = COALESCE((m.val_despues->>'id_malla')::int,
                                             (m.val_antes->>'id_malla')::int)
            LEFT JOIN academico.materias mat ON mat.id_mat = mc.id_mat
            LEFT JOIN academico.periodos_academicos pa
                   ON pa.id_per = COALESCE((m.val_despues->>'id_per')::int,
                                           (m.val_antes->>'id_per')::int)
            WHERE m.estatus = 'A' AND m.tabla_mod = 'notas' {filtro}
            ORDER BY m.fec_hor DESC
            LIMIT :limite
        """, p)

        resumen = _una(session, f"""
            SELECT
                count(*)                                              AS total_cambios,
                count(*) FILTER (WHERE (m.val_despues->>'nota')::numeric >
                                         (m.val_antes->>'nota')::numeric)   AS notas_subieron,
                count(*) FILTER (WHERE (m.val_despues->>'nota')::numeric <
                                         (m.val_antes->>'nota')::numeric)   AS notas_bajaron,
                count(*) FILTER (WHERE m.val_antes->>'estatus' = 'A'
                                  AND m.val_despues->>'estatus' = 'I')      AS anuladas,
                count(*) FILTER (WHERE m.val_antes->>'estatus' = 'I'
                                  AND m.val_despues->>'estatus' = 'A')      AS restauradas,
                count(DISTINCT m.id_usu)                              AS usuarios_involucrados
            {_BASE_MOV}
            WHERE m.estatus = 'A' AND m.tabla_mod = 'notas'
              AND m.accion = 'UPDATE' {filtro}
        """, p)

        return {
            "resumen": _serializar(resumen),
            "detalle": [_serializar(r) for r in detalle],
        }

    # ────────────────────────────────────────────────────────
    # 4) CAMBIOS DE PRIVILEGIOS
    # ────────────────────────────────────────────────────────
    @staticmethod
    def cambios_de_privilegios(
        session: Session,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """Quién cambió qué permiso, rol o acceso de usuario."""
        filtro, p = _rango("m.fec_hor", desde, hasta)

        return [
            _serializar(r) for r in _filas(session, f"""
                SELECT m.id_aud, m.fec_hor, m.accion, m.tabla_mod, m.dir_ip,
                       COALESCE(u.username, 'Sistema/Script') AS ejecutado_por,
                       r.rol                                  AS rol_afectado,
                       mod.codigo                             AS modulo,
                       per.codigo                             AS permiso,
                       m.val_antes->>'alcance'                AS alcance_antes,
                       m.val_despues->>'alcance'              AS alcance_despues,
                       m.val_antes->>'estatus'                AS estatus_antes,
                       m.val_despues->>'estatus'              AS estatus_despues
                {_BASE_MOV}
                LEFT JOIN general.roles r
                       ON r.id_rol = COALESCE((m.val_despues->>'id_rol')::int,
                                              (m.val_antes->>'id_rol')::int)
                LEFT JOIN general.modulos mod
                       ON mod.id_mod = COALESCE((m.val_despues->>'id_mod')::int,
                                                (m.val_antes->>'id_mod')::int)
                LEFT JOIN general.permisos per
                       ON per.id_perm = COALESCE((m.val_despues->>'id_perm')::int,
                                                 (m.val_antes->>'id_perm')::int)
                WHERE m.estatus = 'A'
                  AND m.tabla_mod IN ({_IN_PRIVILEGIO})
                  AND (m.tabla_mod <> 'usuarios'
                       OR (m.val_antes->>'id_rol') IS DISTINCT FROM (m.val_despues->>'id_rol')
                       OR (m.val_antes->>'estatus') IS DISTINCT FROM (m.val_despues->>'estatus'))
                  {filtro}
                ORDER BY m.fec_hor DESC
            """, p)
        ]

    # ────────────────────────────────────────────────────────
    # 5) EVENTOS DE ACCESO
    # ────────────────────────────────────────────────────────
    @staticmethod
    def eventos_de_acceso(
        session: Session,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Logins exitosos, intentos fallidos, bloqueos y cambios de contraseña."""
        filtro, p = _rango("m.fec_hor", desde, hasta)

        eventos = _filas(session, f"""
            SELECT m.id_aud, m.fec_hor, m.dir_ip,
                   COALESCE(u2.username, 'Sistema/Script') AS usuario,
                   CASE
                     WHEN (m.val_despues->>'bloqueado_hasta') IS NOT NULL
                      AND (m.val_antes->>'bloqueado_hasta') IS NULL
                          THEN 'BLOQUEO_CUENTA'
                     WHEN COALESCE((m.val_despues->>'intentos_fallidos')::int, 0) >
                          COALESCE((m.val_antes->>'intentos_fallidos')::int, 0)
                          THEN 'INTENTO_FALLIDO'
                     WHEN (m.val_despues->>'password_hash') IS DISTINCT FROM
                          (m.val_antes->>'password_hash')
                          THEN 'CAMBIO_PASSWORD'
                     WHEN (m.val_despues->>'ultimo_acceso') IS DISTINCT FROM
                          (m.val_antes->>'ultimo_acceso')
                          THEN 'LOGIN_EXITOSO'
                     ELSE 'OTRO'
                   END AS evento,
                   (m.val_antes->>'intentos_fallidos')::int AS intentos_antes,
                   (m.val_despues->>'intentos_fallidos')::int AS intentos_despues
            {_BASE_MOV}
            LEFT JOIN general.usuarios u2
                   ON u2.id_usu = COALESCE((m.val_despues->>'id_usu')::int, m.id_usu)
            WHERE m.estatus = 'A' AND m.tabla_mod = 'credenciales' {filtro}
            ORDER BY m.fec_hor DESC
        """, p)

        resumen = _una(session, f"""
            SELECT
                count(*) FILTER (WHERE evento = 'LOGIN_EXITOSO')  AS logins,
                count(*) FILTER (WHERE evento = 'INTENTO_FALLIDO') AS fallidos,
                count(*) FILTER (WHERE evento = 'BLOQUEO_CUENTA')  AS bloqueos,
                count(*) FILTER (WHERE evento = 'CAMBIO_PASSWORD') AS cambios_password
            FROM (
                SELECT CASE
                         WHEN (m.val_despues->>'bloqueado_hasta') IS NOT NULL
                          AND (m.val_antes->>'bloqueado_hasta') IS NULL THEN 'BLOQUEO_CUENTA'
                         WHEN COALESCE((m.val_despues->>'intentos_fallidos')::int, 0) >
                              COALESCE((m.val_antes->>'intentos_fallidos')::int, 0) THEN 'INTENTO_FALLIDO'
                         WHEN (m.val_despues->>'password_hash') IS DISTINCT FROM
                              (m.val_antes->>'password_hash') THEN 'CAMBIO_PASSWORD'
                         WHEN (m.val_despues->>'ultimo_acceso') IS DISTINCT FROM
                              (m.val_antes->>'ultimo_acceso') THEN 'LOGIN_EXITOSO'
                         ELSE 'OTRO'
                       END AS evento
                {_BASE_MOV}
                WHERE m.estatus = 'A' AND m.tabla_mod = 'credenciales' {filtro}
            ) t
        """, p)

        return {
            "resumen": _serializar(resumen),
            "eventos": [_serializar(r) for r in eventos],
        }

    # ────────────────────────────────────────────────────────
    # 6) REPORTE EJECUTIVO (paquete consolidado)
    # ────────────────────────────────────────────────────────
    @staticmethod
    def reporte_ejecutivo(session: Session, fecha: date) -> Dict[str, Any]:
        """Paquete único para dirección: diario + anomalías + accesos + notas."""
        anomalias = AuditReportService.detectar_anomalias(session, fecha=fecha)
        severidades: Dict[str, int] = {"alta": 0, "media": 0, "baja": 0}
        for a in anomalias:
            severidades[a["severidad"]] = severidades.get(a["severidad"], 0) + 1

        return {
            "generado_el": datetime.now().isoformat(),
            "fecha_analizada": fecha.isoformat(),
            "nivel_de_riesgo": (
                "CRÍTICO" if severidades["alta"] > 0
                else "MODERADO" if severidades["media"] > 0
                else "BAJO"
            ),
            "diario": AuditReportService.reporte_diario(session, fecha),
            "anomalias": anomalias,
            "conteo_anomalias_por_severidad": severidades,
            "accesos": AuditReportService.eventos_de_acceso(session, desde=fecha, hasta=fecha),
            "notas": AuditReportService.cambios_de_notas(session, desde=fecha, hasta=fecha, limite=25),
        }