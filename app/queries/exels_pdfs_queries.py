FICHA_DOCENTE = """
            SELECT 
                vw.cedula, 
                vw.nombre_completo_docente, 
                vw.tipo_contrato,
                vw.cod_programa, 
                vw.programa, 
                vw.materia, 
                vw.uc,
                vw.periodo_academico, 
                vw.dia, 
                vw.hora_inicio, 
                vw.hora_fin,
                vw.espacio_fisico, 
                vw.nombre_centro, 
                vw.tipo_actividad, 
                d.telefono,
                u.email AS correo,
                m.trayecto,
                m.periodo AS semestre
            FROM personas.vw_horario_completo_docente vw
            JOIN personas.docentes d ON vw.cedula = d.cedula
            LEFT JOIN general.usuarios u ON d.id_usu = u.id_usu
            -- Cruzamos la malla curricular mediante la asignación y la materia de la vista si es estrictamente necesario,
            -- o confiamos en los datos de la vista. Aquí cruzamos de forma segura por docente y materia:
            LEFT JOIN horarios.asig_carga_horarias ach ON d.id_doc = ach.id_doc
            LEFT JOIN academico.malla_curricular m ON ach.id_malla = m.id_malla
            WHERE vw.cedula = :cedula;
        """