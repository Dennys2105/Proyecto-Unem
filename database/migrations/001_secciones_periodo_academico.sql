ALTER TABLE academico.secciones
    ADD COLUMN IF NOT EXISTS id_per integer;

-- Existing rows remain unassigned until an administrator selects their period.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_secciones_periodo'
          AND conrelid = 'academico.secciones'::regclass
    ) THEN
        ALTER TABLE academico.secciones
            ADD CONSTRAINT fk_secciones_periodo
            FOREIGN KEY (id_per)
            REFERENCES academico.periodos_academicos (id_per)
            ON UPDATE CASCADE
            ON DELETE RESTRICT;
    END IF;
END;
$$;
