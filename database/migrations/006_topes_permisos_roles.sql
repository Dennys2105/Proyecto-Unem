-- UNEM 1.0 / Base de Datos UNEM 4.3
-- Protección de sobreasignación de permisos. EJECUTAR SOLO TRAS RESPALDO.
-- No modifica las reglas base de Vicerrector, Coordinador ni Docente.
-- Idempotente: vuelve a crear funciones y trigger; desciende overrides inválidos.
BEGIN;

CREATE OR REPLACE FUNCTION general.max_alcance_personalizable(
    p_id_usu INTEGER, p_id_mod SMALLINT, p_id_perm SMALLINT
) RETURNS VARCHAR(10)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_rol SMALLINT;
    v_modulo VARCHAR;
    v_maximo VARCHAR(10);
BEGIN
    SELECT u.id_rol, m.codigo, COALESCE(pr.alcance, 'NAD')
      INTO v_rol, v_modulo, v_maximo
      FROM general.usuarios u
      JOIN general.modulos m ON m.id_mod = p_id_mod AND m.estatus = 'A'
      LEFT JOIN general.permisos_rol pr
        ON pr.id_rol = u.id_rol
       AND pr.id_mod = m.id_mod
       AND pr.id_perm = p_id_perm
       AND pr.estatus = 'A'
     WHERE u.id_usu = p_id_usu;
    IF NOT FOUND THEN
        RETURN 'NAD';
    END IF;
    IF (v_rol <> 1 AND v_modulo = 'usuarios')
       OR (v_rol = 2 AND v_modulo IN ('notas', 'secciones'))
       OR (v_rol = 3 AND v_modulo IN ('asig_carga', 'dias'))
       OR v_rol = 4 THEN
        RETURN 'NAD';
    END IF;
    RETURN v_maximo;
END;
$$;

-- Si hubiese overrides antiguos superiores al rol, los rebaja a su máximo.
-- NO toca los permisos heredados del rol.
UPDATE general.permisos_usuario pu
   SET alcance = general.max_alcance_personalizable(pu.id_usu, pu.id_mod, pu.id_perm)
 WHERE pu.estatus = 'A'
   AND pu.alcance IS NOT NULL
   AND array_position(ARRAY['NAD','SP','LIM','TODO']::TEXT[], pu.alcance::TEXT)
     > array_position(ARRAY['NAD','SP','LIM','TODO']::TEXT[],
                      general.max_alcance_personalizable(pu.id_usu, pu.id_mod, pu.id_perm)::TEXT);

CREATE OR REPLACE FUNCTION general.validar_maximo_permiso_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_maximo VARCHAR(10);
BEGIN
    IF NEW.estatus = 'A' AND NEW.alcance IS NOT NULL THEN
        v_maximo := general.max_alcance_personalizable(NEW.id_usu, NEW.id_mod, NEW.id_perm);
        IF array_position(ARRAY['NAD','SP','LIM','TODO']::TEXT[], NEW.alcance::TEXT)
           > array_position(ARRAY['NAD','SP','LIM','TODO']::TEXT[], v_maximo::TEXT) THEN
            RAISE EXCEPTION 'Permiso % supera el máximo % del rol (usuario %, módulo %, acción %)',
                NEW.alcance, v_maximo, NEW.id_usu, NEW.id_mod, NEW.id_perm
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maximo_permiso_usuario ON general.permisos_usuario;
CREATE TRIGGER trg_maximo_permiso_usuario
BEFORE INSERT OR UPDATE OF id_usu, id_mod, id_perm, alcance, estatus
ON general.permisos_usuario
FOR EACH ROW EXECUTE FUNCTION general.validar_maximo_permiso_usuario();

COMMIT;
