-- Migración 004. Revisión académica de calificaciones por Coordinación.
-- ¡Ejecutar antes de reiniciar la API modificada! Respaldar PostgreSQL.
-- Calificaciones históricas se consideran validadas (A) para no cambiar históricos.
-- Las NUEVAS calificaciones entran pendientes (P); rechazadas (R) requieren corrección.
BEGIN;
ALTER TABLE academico.notas
    ADD COLUMN IF NOT EXISTS estado_revision varchar(1) NOT NULL DEFAULT 'A',
    ADD COLUMN IF NOT EXISTS revisado_por integer REFERENCES general.usuarios(id_usu),
    ADD COLUMN IF NOT EXISTS fecha_revision timestamptz,
    ADD COLUMN IF NOT EXISTS motivo_rechazo varchar(1000);
ALTER TABLE academico.notas ALTER COLUMN estado_revision SET DEFAULT 'P';
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_notas_revision_estado'
                   AND conrelid='academico.notas'::regclass) THEN
        ALTER TABLE academico.notas ADD CONSTRAINT chk_notas_revision_estado
            CHECK (estado_revision IN ('P','A','R'));
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS ix_notas_revision_pendiente
    ON academico.notas (estado_revision, estatus);
COMMIT;

-- A partir de aquí la vista estadística solo incorpora notas validadas.
BEGIN;


CREATE OR REPLACE VIEW academico.vw_analisis_notas AS
WITH definitivas AS (
    SELECT DISTINCT ON (n.id_est, n.id_malla, n.id_per)
        n.id_est,
        n.id_malla,
        n.id_per,
        n.nota,
        n.tipo_evaluacion
    FROM academico.notas n
    WHERE n.estatus = 'A' AND n.estado_revision = 'A'
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
    count(CASE
        WHEN d.nota >= CASE
            WHEN lower(btrim(eje.nombre)) = 'proyecto' THEN 16
            ELSE 12
        END THEN 1
    END) AS aprobados,
    count(CASE
        WHEN d.nota < CASE
            WHEN lower(btrim(eje.nombre)) = 'proyecto' THEN 16
            ELSE 12
        END THEN 1
    END) AS reprobados,
    round(
        count(CASE
            WHEN d.nota >= CASE
                WHEN lower(btrim(eje.nombre)) = 'proyecto' THEN 16
                ELSE 12
            END THEN 1
        END)::numeric / count(*)::numeric * 100,
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
GROUP BY
    p.codigo, p.nombre, mc.trayecto, mc.periodo, pa.nombre,
    m.codigo, m.nombre, eje.codigo, eje.nombre;



COMMIT;
