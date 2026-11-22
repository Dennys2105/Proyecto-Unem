from sqlmodel import Session, text
from typing import Optional, List, Dict, Any
from app.models.unem_db_models import Nota, Estudiante, MallaCurricular, PeriodoAcademico
from app.schemas.esq_notas import NotasCreate, NotasUpdate, ActaCreate
from app.service.base_services import obtener_por_id
from app.service.notas_reglas import SQL_NOTA_MINIMA_APROBATORIA, nota_minima_aprobatoria
from fastapi import HTTPException, status


_SELECT_ENRIQUECIDO = """
    SELECT
        n.id_nota, n.id_est, n.id_malla, n.id_per,
        n.nota, n.tipo_evaluacion, n.observaciones,
        n.fecha_registro, n.estatus, n.creado, n.actualizar,
        e.cedula,
        (e.nombre || ' ' || e.apellido) AS estudiante,
        m.codigo  AS cod_materia,
        m.nombre  AS materia,
        eje.nombre AS eje_formativo,
        p.codigo  AS cod_programa,
        p.nombre  AS programa,
        mc.trayecto, mc.periodo,
        pa.nombre AS periodo_academico,
        s.codigo  AS cod_seccion
    FROM academico.notas n
    JOIN personas.estudiantes e        ON e.id_est  = n.id_est
    JOIN academico.malla_curricular mc ON mc.id_malla = n.id_malla
    JOIN academico.materias m          ON m.id_mat  = mc.id_mat
    JOIN academico.ejes_formativos eje ON eje.id_eje = m.id_eje
    JOIN academico.programas p         ON p.id_pro  = mc.id_pro
    JOIN academico.periodos_academicos pa ON pa.id_per = n.id_per
    LEFT JOIN academico.secciones s    ON s.id_sec  = e.id_sec
"""


def _fila_a_dict(row) -> Dict[str, Any]:
    d = dict(row)
    d["nota"] = float(d["nota"])
    for campo in ("fecha_registro", "creado", "actualizar"):
        if d.get(campo) is not None:
            d[campo] = str(d[campo])
    return d


def leer_todos(session: Session) -> List[Dict[str, Any]]:
    statement = text(_SELECT_ENRIQUECIDO + " ORDER BY n.id_nota DESC")
    rows = session.exec(statement).mappings().all()
    return [_fila_a_dict(r) for r in rows]


def leer_todos_filtrado_por_mallas(
    session: Session, mallas: list[int]
) -> list[dict]:
    if not mallas:
        return []
    placeholders = ", ".join(f":m{i}" for i in range(len(mallas)))
    params = {f"m{i}": m for i, m in enumerate(mallas)}
    statement = text(
        _SELECT_ENRIQUECIDO
        + f" WHERE n.id_malla IN ({placeholders}) ORDER BY n.id_nota DESC"
    ).params(**params)
    rows = session.exec(statement).mappings().all()
    return [_fila_a_dict(r) for r in rows]


def analisis_notas_filtrado(
    session: Session, mallas: list[int],
    cod_programa: Optional[str] = None, id_per: Optional[int] = None,
) -> list[dict]:
    if not mallas:
        return []
    placeholders = ", ".join(f":m{i}" for i in range(len(mallas)))
    params = {f"m{i}": m for i, m in enumerate(mallas)}

    query = f"""
        WITH definitivas AS (
            SELECT DISTINCT ON (n.id_est, n.id_malla, n.id_per)
                n.id_est, n.id_malla, n.id_per, n.nota, n.tipo_evaluacion
            FROM academico.notas n
            WHERE n.estatus = 'A'
              AND n.tipo_evaluacion IN ('Final', 'Recuperación')
            ORDER BY n.id_est, n.id_malla, n.id_per,
                CASE n.tipo_evaluacion
                    WHEN 'Recuperación' THEN 1
                    ELSE 2
                END
        )
        SELECT
            p.codigo AS cod_programa,
            p.nombre AS programa,
            mc.trayecto,
            mc.periodo,
            pa.nombre AS periodo_academico,
            m.codigo AS cod_materia,
            m.nombre AS materia,
            eje.codigo AS cod_eje,
            eje.nombre AS eje_formativo,
            count(*) AS total_estudiantes_evaluados,
            round(avg(d.nota), 2) AS promedio,
            min(d.nota) AS nota_minima,
            max(d.nota) AS nota_maxima,
            round(stddev(d.nota), 2) AS desviacion_estandar,
            count(CASE WHEN d.nota >= {SQL_NOTA_MINIMA_APROBATORIA} THEN 1 ELSE NULL END) AS aprobados,
            count(CASE WHEN d.nota < {SQL_NOTA_MINIMA_APROBATORIA} THEN 1 ELSE NULL END) AS reprobados,
            round(
                count(CASE WHEN d.nota >= {SQL_NOTA_MINIMA_APROBATORIA} THEN 1 ELSE NULL END)::numeric
                / count(*)::numeric * 100,
                2
            ) AS porcentaje_aprobacion
        FROM definitivas d
        JOIN personas.estudiantes e ON e.id_est = d.id_est
        JOIN academico.malla_curricular mc ON mc.id_malla = d.id_malla
        JOIN academico.materias m ON m.id_mat = mc.id_mat
        JOIN academico.ejes_formativos eje ON eje.id_eje = m.id_eje
        JOIN academico.programas p ON p.id_pro = mc.id_pro
        JOIN academico.periodos_academicos pa ON pa.id_per = d.id_per
        WHERE e.estatus = 'A'
          AND mc.estatus = 'A'
          AND d.id_malla IN ({placeholders})
    """
    if cod_programa:
        query += " AND p.codigo = :cod_programa"
        params["cod_programa"] = cod_programa
    if id_per:
        query += " AND d.id_per = :id_per"
        params["id_per"] = id_per
    query += """
        GROUP BY p.codigo, p.nombre, mc.trayecto, mc.periodo, pa.nombre,
            m.codigo, m.nombre, eje.codigo, eje.nombre
        ORDER BY programa, trayecto, periodo, materia
    """

    rows = session.exec(text(query).params(**params)).mappings().all()
    resultado = []
    for r in rows:
        d = dict(r)
        for campo in (
            "promedio", "nota_minima", "nota_maxima",
            "desviacion_estandar", "porcentaje_aprobacion",
        ):
            d[campo] = float(d[campo]) if d.get(campo) is not None else None
        resultado.append(d)
    return resultado


def obtener_enriquecida(session: Session, nota_id: int) -> Optional[Dict[str, Any]]:
    statement = text(_SELECT_ENRIQUECIDO + " WHERE n.id_nota = :id").params(id=nota_id)
    row = session.exec(statement).mappings().first()
    return _fila_a_dict(row) if row else None


def obtener_dato_por_id(dato_id: int, session: Session) -> Optional[Nota]:
    return obtener_por_id(db=session, modelo=Nota, id=dato_id)


def validar_unicidad_compuesta(
    session: Session, id_est: int, id_malla: int, id_per: int,
    tipo_evaluacion: str, excluir_id: Optional[int] = None,
) -> None:
    query = """
        SELECT id_nota FROM academico.notas
        WHERE id_est = :id_est AND id_malla = :id_malla
          AND id_per = :id_per AND tipo_evaluacion = :tipo
    """
    params = {"id_est": id_est, "id_malla": id_malla, "id_per": id_per, "tipo": tipo_evaluacion}
    if excluir_id is not None:
        query += " AND id_nota <> :excluir"
        params["excluir"] = excluir_id
    if session.exec(text(query).params(**params)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una nota para este estudiante, materia, período y tipo de evaluación.",
        )


# ============================================================
# ✅ REGLAS DE INTEGRIDAD ACADÉMICA
# ============================================================
def _nota_existente(session: Session, id_est: int, id_malla: int, id_per: int, tipo: str):
    return session.exec(text("""
        SELECT id_nota, nota FROM academico.notas
        WHERE id_est = :e AND id_malla = :m AND id_per = :p
          AND tipo_evaluacion = :t AND estatus = 'A'
    """).params(e=id_est, m=id_malla, p=id_per, t=tipo)).first()


def validar_reglas_academicas(
    session: Session, id_est: int, id_malla: int, id_per: int,
    tipo: str, es_anulacion: bool = False,
) -> None:
    """
    1) Solo se modifican notas de períodos VIGENTES (actas cerradas son inmutables).
    2) Recuperación solo procede si existe una Final reprobada según el eje.
    3) Si existe Recuperación, la Final queda congelada.
    """
    # Regla 1: período vigente
    per = session.exec(text("""
        SELECT nombre, activo, estatus FROM academico.periodos_academicos WHERE id_per = :p
    """).params(p=id_per)).first()

    if not per:
        raise HTTPException(status_code=404, detail="El período académico no existe")
    if not es_anulacion and (per[1] is not True or per[2] != 'A'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El acta de '{per[0]}' está cerrada (período no vigente). "
                   "Las calificaciones históricas son inmutables.",
        )

    # Regla 2: Recuperación requiere Final reprobada
    if tipo == 'Recuperación':
        final = _nota_existente(session, id_est, id_malla, id_per, 'Final')
        if not final:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No existe nota Final registrada. La recuperación solo aplica a estudiantes que reprobaron la Final.",
            )
        eje_nombre = session.exec(text("""
            SELECT eje.nombre
            FROM academico.malla_curricular mc
            JOIN academico.materias m ON m.id_mat = mc.id_mat
            JOIN academico.ejes_formativos eje ON eje.id_eje = m.id_eje
            WHERE mc.id_malla = :id_malla
        """).params(id_malla=id_malla)).first()
        minimo = nota_minima_aprobatoria(eje_nombre[0] if eje_nombre else None)
        if float(final[1]) >= minimo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El estudiante ya aprobó la Final ({float(final[1]):.2f}; mínimo {minimo}). No procede recuperación.",
            )

    # Regla 3: Final congelada si hay Recuperación
    if tipo == 'Final':
        if _nota_existente(session, id_est, id_malla, id_per, 'Recuperación'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Existe una Recuperación registrada para este estudiante. La nota Final queda congelada.",
            )


def crear(session: Session, datos_in: NotasCreate) -> Dict[str, Any]:
    tipo = datos_in.tipo_evaluacion.value
    validar_unicidad_compuesta(session, datos_in.id_est, datos_in.id_malla, datos_in.id_per, tipo)
    validar_reglas_academicas(session, datos_in.id_est, datos_in.id_malla, datos_in.id_per, tipo)
    db_obj = Nota.model_validate(datos_in)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return obtener_enriquecida(session, db_obj.id_nota)


def actualizar(
    session: Session, db_dato: Nota, dato_in: NotasUpdate, parcial: bool = True
) -> Dict[str, Any]:
    datos = dato_in.model_dump(exclude_unset=parcial)

    tipo_actual = db_dato.tipo_evaluacion
    tipo_actual = tipo_actual.value if hasattr(tipo_actual, "value") else tipo_actual
    tipo_nuevo = datos.get("tipo_evaluacion", tipo_actual)
    tipo_nuevo = tipo_nuevo.value if hasattr(tipo_nuevo, "value") else tipo_nuevo

    id_est = datos.get("id_est", db_dato.id_est)
    id_malla = datos.get("id_malla", db_dato.id_malla)
    id_per = datos.get("id_per", db_dato.id_per)

    # Anular/restaurar se permite incluso en períodos cerrados (corrección administrativa)
    es_anulacion = set(datos.keys()) <= {"estatus", "observaciones"}

    if not es_anulacion:
        validar_reglas_academicas(session, id_est, id_malla, id_per, tipo_nuevo)

    if {"id_est", "id_malla", "id_per", "tipo_evaluacion"} & datos.keys():
        validar_unicidad_compuesta(session, id_est, id_malla, id_per, tipo_nuevo, excluir_id=db_dato.id_nota)

    for llave, valor in datos.items():
        setattr(db_dato, llave, valor.value if hasattr(valor, "value") else valor)

    session.add(db_dato)
    session.commit()
    session.refresh(db_dato)
    return obtener_enriquecida(session, db_dato.id_nota)


def eliminar(session: Session, db_dato: Nota) -> None:
    db_dato.estatus = "I"
    session.add(db_dato)
    session.commit()


# ============================================================
# ACTA
# ============================================================
def obtener_acta(
    session: Session, id_sec: int, id_malla: int, id_per: int, tipo_evaluacion: str
) -> List[Dict[str, Any]]:
    # ✅ En Recuperación solo aparecen quienes reprobaron la Final
    filtro_recuperacion = ""
    if tipo_evaluacion == 'Recuperación':
        eje_nombre = session.exec(text("""
            SELECT eje.nombre
            FROM academico.malla_curricular mc
            JOIN academico.materias m ON m.id_mat = mc.id_mat
            JOIN academico.ejes_formativos eje ON eje.id_eje = m.id_eje
            WHERE mc.id_malla = :id_malla
        """).params(id_malla=id_malla)).first()
        minimo = nota_minima_aprobatoria(eje_nombre[0] if eje_nombre else None)
        filtro_recuperacion = """
          AND EXISTS (
              SELECT 1 FROM academico.notas f
              WHERE f.id_est = e.id_est AND f.id_malla = :id_malla
                AND f.id_per = :id_per AND f.tipo_evaluacion = 'Final'
                AND f.estatus = 'A' AND f.nota < :nota_minima
          )
        """

    statement = text(f"""
        SELECT
            e.id_est, e.cedula, e.nombre, e.apellido,
            n.id_nota, n.nota, n.observaciones,
            COALESCE(n.estatus, 'S') AS estado_nota
        FROM personas.estudiantes e
        LEFT JOIN academico.notas n
            ON  n.id_est = e.id_est
            AND n.id_malla = :id_malla
            AND n.id_per = :id_per
            AND n.tipo_evaluacion = :tipo
        WHERE e.id_sec = :id_sec AND e.estatus = 'A'
        {filtro_recuperacion}
        ORDER BY e.apellido, e.nombre
    """).params(
        id_sec=id_sec, id_malla=id_malla, id_per=id_per, tipo=tipo_evaluacion,
        **({"nota_minima": minimo} if tipo_evaluacion == 'Recuperación' else {}),
    )

    rows = session.exec(statement).mappings().all()

    if not rows and tipo_evaluacion == 'Recuperación':
        raise HTTPException(
            status_code=404,
            detail="Ningún estudiante reprobó la Final de esta materia. No hay recuperaciones pendientes.",
        )

    return [
        {
            "id_est": r["id_est"], "cedula": r["cedula"],
            "nombre": r["nombre"], "apellido": r["apellido"],
            "id_nota": r["id_nota"],
            "nota": float(r["nota"]) if r["nota"] is not None else None,
            "observaciones": r["observaciones"], "estado_nota": r["estado_nota"],
        }
        for r in rows
    ]


def guardar_acta(session: Session, acta: ActaCreate) -> Dict[str, Any]:
    tipo = acta.tipo_evaluacion.value

    # ✅ Validar TODAS las filas antes de escribir (atomicidad)
    errores: List[str] = []
    for fila in acta.filas:
        if fila.nota is None:
            continue
        try:
            validar_reglas_academicas(session, fila.id_est, acta.id_malla, acta.id_per, tipo)
        except HTTPException as exc:
            est = session.exec(text(
                "SELECT nombre || ' ' || apellido FROM personas.estudiantes WHERE id_est = :e"
            ).params(e=fila.id_est)).first()
            errores.append(f"{est[0] if est else f'ID {fila.id_est}'}: {exc.detail}")

    if errores:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se guardó el acta. " + " | ".join(errores[:5]),
        )

    creadas = actualizadas = omitidas = 0
    statement = text("""
        INSERT INTO academico.notas
            (id_est, id_malla, id_per, nota, tipo_evaluacion, observaciones, estatus)
        VALUES (:id_est, :id_malla, :id_per, :nota, :tipo, :obs, 'A')
        ON CONFLICT (id_est, id_malla, id_per, tipo_evaluacion)
        DO UPDATE SET
            nota = EXCLUDED.nota,
            observaciones = COALESCE(EXCLUDED.observaciones, academico.notas.observaciones),
            estatus = 'A',
            actualizar = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS insertada
    """)

    for fila in acta.filas:
        if fila.nota is None:
            omitidas += 1
            continue
        resultado = session.exec(statement.params(
            id_est=fila.id_est, id_malla=acta.id_malla, id_per=acta.id_per,
            nota=round(fila.nota, 2), tipo=tipo, obs=fila.observaciones,
        )).first()
        if resultado and resultado[0]:
            creadas += 1
        else:
            actualizadas += 1

    session.commit()
    total = creadas + actualizadas
    return {
        "creadas": creadas, "actualizadas": actualizadas,
        "omitidas": omitidas, "total_procesadas": total,
        "mensaje": f"{total} calificación(es) guardada(s): {creadas} nueva(s), {actualizadas} actualizada(s).",
    }


def analisis_notas(
    session: Session, cod_programa: Optional[str] = None, id_per: Optional[int] = None
) -> List[Dict[str, Any]]:
    query = "SELECT * FROM academico.vw_analisis_notas WHERE 1=1"
    params: Dict[str, Any] = {}
    if cod_programa:
        query += " AND cod_programa = :cod_programa"
        params["cod_programa"] = cod_programa
    if id_per:
        query += " AND periodo_academico = (SELECT nombre FROM academico.periodos_academicos WHERE id_per = :id_per)"
        params["id_per"] = id_per
    query += " ORDER BY programa, trayecto, periodo, materia"

    rows = session.exec(text(query).params(**params)).mappings().all()
    resultado = []
    for r in rows:
        d = dict(r)
        for campo in ("promedio", "nota_minima", "nota_maxima", "desviacion_estandar", "porcentaje_aprobacion"):
            d[campo] = float(d[campo]) if d.get(campo) is not None else None
        resultado.append(d)
    return resultado


def existe_llave_foranea_est(session: Session, id: int) -> Optional[Estudiante]:
    return obtener_por_id(session, Estudiante, id)


def existe_llave_foranea_malla(session: Session, id: int) -> Optional[MallaCurricular]:
    return obtener_por_id(session, MallaCurricular, id)


def existe_llave_foranea_per(session: Session, id: int) -> Optional[PeriodoAcademico]:
    return obtener_por_id(session, PeriodoAcademico, id)