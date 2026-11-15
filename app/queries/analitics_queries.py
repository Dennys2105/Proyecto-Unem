SQL_CONSULTAR_AUDITORIA_AVANZADA = """
    SELECT 
        am.id_aud,
        am.fec_hor AS fecha,
        COALESCE(u.username, 'Sistema') AS usuario,
        am.tabla_mod AS tabla_afectada,
        am.accion,
        CASE
            WHEN am.tabla_mod = 'docentes' THEN
                COALESCE(CONCAT(d.cedula, ' - ', d.nombre, ' ', d.apellido),
                        vl.registro_identificador, 'N/A')
            WHEN am.tabla_mod = 'estudiantes' THEN
                COALESCE(CONCAT(e.cedula, ' - ', e.nombre, ' ', e.apellido),
                        vl.registro_identificador, 'N/A')
            WHEN am.tabla_mod = 'notas' THEN
                COALESCE(
                    CONCAT(e.nombre, ' ', e.apellido, ' | ', m_n.nombre, ' | Nota: ', n.nota),
                    CONCAT('NotaID:', COALESCE(am.val_despues->>'id_nota', am.val_antes->>'id_nota', '?'))
                )
            WHEN am.tabla_mod = 'credenciales' THEN
                COALESCE(CONCAT('Usuario: ', u_c.username),
                        CONCAT('CreID:', COALESCE(am.val_despues->>'id_cre', am.val_antes->>'id_cre', '?')))
            WHEN am.tabla_mod = 'asig_carga_horarias' THEN
                COALESCE(CONCAT(d.nombre, ' ', d.apellido, ' | ', dia.dia),
                        vl.registro_identificador, 'N/A')
            WHEN am.tabla_mod = 'secciones' THEN
                COALESCE(CONCAT(s.codigo, ' (', p2.nombre, ')'),
                        CONCAT('SecID:', COALESCE(am.val_despues->>'id_sec', am.val_antes->>'id_sec', '?')))
            WHEN am.tabla_mod = 'materias' THEN
                COALESCE(mat.nombre, vl.registro_identificador, 'N/A')
            WHEN am.tabla_mod = 'programas' THEN
                COALESCE(p.nombre, vl.registro_identificador, 'N/A')
            WHEN am.tabla_mod = 'municipios' THEN
                COALESCE(mun.nombre, vl.registro_identificador, 'N/A')
            WHEN am.tabla_mod = 'dias_laborales' THEN
                COALESCE(dia.dia, vl.registro_identificador, 'N/A')
            WHEN am.tabla_mod = 'espacios_fis' THEN
                COALESCE(CONCAT(esp.nombre_centro, ' - ', esp.ubicacion),
                        vl.registro_identificador, 'N/A')
            WHEN am.tabla_mod = 'usuarios' THEN
                COALESCE(vl.registro_identificador, 'N/A')
            ELSE COALESCE(vl.registro_identificador, 'N/A')
        END AS registro_identificador,
        vl.resumen_cambio AS resumen_cambios,
        am.dir_ip AS ip_origen
    FROM general.aud_mov am
    LEFT JOIN general.usuarios u ON u.id_usu = am.id_usu
    LEFT JOIN general.vw_auditoria_legible vl ON vl.id_aud = am.id_aud
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

SQL_HORARIO_DOCENTE ="""
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