MATERIAS_READ =  """
        SELECT 
            m.id_mat,
            m.codigo,
            m.nombre,
            m.unidades_creditos,
            m.id_eje,
            e.nombre AS eje_nombre,
            m.descripcion,
            m.estatus,
            COUNT(DISTINCT mc.id_pro) AS programas_count,
            STRING_AGG(DISTINCT p.nombre, ', ') AS programas_nombres
        FROM academico.materias m
        LEFT JOIN academico.ejes_formativos e ON e.id_eje = m.id_eje
        LEFT JOIN academico.malla_curricular mc ON mc.id_mat = m.id_mat AND mc.estatus = 'A'
        LEFT JOIN academico.programas p ON p.id_pro = mc.id_pro AND p.estatus = 'A'
        WHERE m.estatus = 'A'
    """