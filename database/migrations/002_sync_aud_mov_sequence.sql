-- Pause application writes while running this repair.
SELECT setval(
    pg_get_serial_sequence('general.aud_mov', 'id_aud')::regclass,
    COALESCE(MAX(id_aud), 1),
    MAX(id_aud) IS NOT NULL
)
FROM general.aud_mov;
