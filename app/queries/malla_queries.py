LEER_MALLAS ="""
        SELECT 
            mc.id_malla, mc.id_pro, mc.id_mat, mc.trayecto, mc.periodo, 
            mc.orden, mc.perequisito_id_mat,
            -- Datos del Programa
            p.id_pro as prog_id, p.codigo as prog_codigo, p.nombre as prog_nombre,
            -- Datos de la Materia
            m.id_mat as mat_id, m.codigo as mat_codigo, m.nombre as mat_nombre, 
            m.unidades_creditos as mat_uc, e.nombre as eje_nombre,
            -- Datos del Prerrequisito (si existe)
            pre.id_mat as pre_id, pre.codigo as pre_codigo, pre.nombre as pre_nombre, pre.unidades_creditos as pre_uc
        FROM academico.malla_curricular mc
        JOIN academico.programas p ON p.id_pro = mc.id_pro
        JOIN academico.materias m ON m.id_mat = mc.id_mat
        LEFT JOIN academico.ejes_formativos e ON e.id_eje = m.id_eje
        LEFT JOIN academico.materias pre ON pre.id_mat = mc.perequisito_id_mat
        WHERE mc.estatus = 'A'
    """