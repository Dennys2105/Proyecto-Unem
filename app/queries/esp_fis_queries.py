ESPACIO_FISICO = """
        SELECT 
            e.id_esp,
            e.nombre_centro,
            e.ubicacion,
            e.tipo_espacio,
            e.capacidad,
            e.equipamiento,
            e.disponibilidad,
            m.nombre AS municipio,
            COUNT(a.id_asig) AS total_asignaciones,
            COALESCE(SUM(EXTRACT(EPOCH FROM (a.hora_fin - a.hora_inicio)) / 3600.0), 0) AS horas_ocupadas
        FROM infraestructura.espacios_fis e
        LEFT JOIN general.municipios m ON m.id_mun = e.id_mun
        LEFT JOIN horarios.asig_carga_horarias a ON a.id_esp = e.id_esp AND a.estatus = 'A'
        WHERE e.estatus = 'A'
    """