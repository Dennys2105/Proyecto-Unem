-- ==========================================
-- 1. ROLES DEL SISTEMA (Esquema general)
-- ==========================================
INSERT INTO general.roles (id_rol, rol, descripcion, estatus) VALUES
(1, 'Administrador', 'Control total y acceso global a todos los módulos del sistema', 'A'),
(2, 'Operador', 'Usuario con permisos limitados, gestiona ciertos módulos según asignación', 'A'),
(3, 'Docente', 'Profesor de la universidad, gestiona notas y carga académica propia', 'A'),
(4, 'Usuario', 'Alumno inscrito, consulta su propio récord y notas', 'A');

-- ==========================================
-- 2. MÓDULOS DEL SISTEMA (Esquema general)
-- ==========================================
INSERT INTO general.modulos (id_mod, codigo, nombre, descripcion, estatus) VALUES
(1, 'docentes', 'Gestion de Docentes', 'Módulo de gestión del profesorado y contratos', 'A'),
(2, 'estudiantes', 'Gestion de Estudiantes', 'Módulo de gestión de alumnos, trayectos y seciones', 'A'),
(3, 'notas', 'Gestion de Notas', 'Módulo de calificaciones y analíticas de rendimiento', 'A'),
(4, 'malla', 'Gestion de Malla Curricular', 'Módulo de planes de estudio y unidades curriculares', 'A');
(5, 'infraestructura', 'Gestion de Infraestructura', 'Módulo de gestión de aulas, laboratorios y recursos físicos', 'A');
(6, 'usuarios', 'Gestion de Usuarios', 'Módulo de administración de cuentas y roles del sistema', 'A');
(7, 'analiticas','Analisis de Datos' , 'Mostrar los analisis del los datos del sistema','A')
(8, 'horarios','Gestion de Horarios', 'Asignar la carga horaria de los profesores y crear los horarios', 'A')
(9, 'dias','Gestion de Dias Laborables', 'Manejo de los dias laborales de la semana', 'A')
(10, 'municipios','Gestion de los Municipios','Modulo de gestion de los municipios avtivos','A')
(11, 'roles', 'Gestion de Roles y Permisos', 'Modulo paara gestionar los permisos que tiene cada usuario','A')

-- ==========================================
-- 3. PERMISOS / ACCIONES ATÓMICAS (Esquema general)
-- ==========================================
INSERT INTO general.permisos (id_perm, codigo, nombre, descripcion) VALUES
(1, 'CRE', 'Crear', 'Permite registrar nuevos elementos en el módulo'),
(2, 'ACT', 'Actualizar', 'Permite modificar registros existentes'),
(3, 'LEC', 'Leer', 'Permite consultar o listar registros del módulo'),
(4, 'BOR', 'Borrar', 'Permite realizar borrado lógico o eliminación');

-- ==========================================
-- 4. PERMISOS BASE POR ROL (Plantilla / general.permisos_rol)
-- ==========================================

-- Ejemplo para el Rol 3 (Docentes): Solo Lectura (SP - Solo Propietario) en notas y estudiantes
INSERT INTO general.permisos_rol (id_rol, id_mod, id_perm, alcance, estatus) VALUES
(3, 3, 2, 'LIM', 'A'), -- Operador puede leer (LEC) notas de sus secciones asignadas
(3, 3, 3, 'LIM', 'A'); -- Operador puede actualizar (ACT) notas de sus secciones/propias

INSERT INTO general.municipios (id_mun, nombre, estatus) VALUES
(1, 'San Cristóbal', 'A'),
(2, 'Junín', 'A'),
(3, 'Cárdenas', 'A');

INSERT INTO general.dias_laborales (id_dia, dia, orden, estatus) VALUES
(1, 'Lunes', 1, 'A'),
(2, 'Martes', 2, 'A'),
(3, 'Miércoles', 3, 'A'),
(4, 'Jueves', 4, 'A'),
(5, 'Viernes', 5, 'A'),
(6, 'Sábado', 6, 'A');

INSERT INTO infraestructura.espacios_fis (id_esp, id_mun, nombre_centro, ubicacion, tipo_espacio, capacidad, equipamiento, disponibilidad, estatus) VALUES
(1, 1, 'Escuela Bustamante', 'Av. 1항 San Cristóbal', 'Aula', 35, 'Pizarrón acrílico, 35pupitres, iluminación LED', true, 'A'),
(2, 1, 'Escuela Bustamante', 'Laboratorio de Computación B', 'Laboratorio', 25, '25 Computadoras Lenovo ThinkPad, Proyector', true, 'A');

INSERT INTO academico.ejes_formativos (id_eje, codigo, nombre, descripcion, estatus) VALUES
(1, 'PROY', 'Proyecto', 'Eje integrador de saberes sociotecnológicos', 'A'),
(2, 'DISC', 'Disciplinario', 'Unidades curriculares de formación técnica especializada', 'A');

-- Programas académicos (PNF)
INSERT INTO academico.programas (id_pro, codigo, nombre, tipo_sistema, total_trayectos, total_uc, estatus) VALUES
(1, 'PNFIN', 'PNF en Informática', 'Trimestral', 4, 160, 'A');

-- Materias (Unidades Curriculares)
INSERT INTO academico.materias (id_mat, codigo, nombre, id_eje, unidades_creditos, descripcion, estatus) VALUES
(1, 'PROY101', 'Proyecto Sociotecnológico I', 1, 6, 'Introducción al desarrollo de software comunitario', 'A'),
(2, 'PROG102', 'Algorítmica y Programación I', 2, 4, 'Fundamentos de programación estructurada en Python', 'A');

-- Malla curricular (Pensum)
INSERT INTO academico.malla_curricular (id_malla, id_pro, id_mat, trayecto, periodo, orden, perequisito_id_mat, estatus) VALUES
(1, 1, 1, 1, 1, 1, NULL, 'A'),
(2, 1, 2, 1, 1, 2, NULL, 'A');

-- Períodos académicos
INSERT INTO academico.periodos_academicos (id_per, nombre, anio, numero_periodo, tipo, fecha_inicio, fecha_fin, activo, estatus) VALUES
(1, 'Trimestre 2026-I', 2026, 1, 'Trimestre', '2026-02-01', '2026-05-15', true, 'A');

-- Secciones
INSERT INTO academico.secciones (id_sec, codigo, id_pro, trayecto, periodo, capacidad_maxima, estatus) VALUES
(1, 'INF-T1-S1', 1, 1, 1, 40, 'A');

-- Actualizar estudiante asignándole la sección creada
UPDATE personas.estudiantes SET id_sec = 1 WHERE id_est = 1;

-- Registro de Notas (Escala 0-20, tipo de evaluación permitido)
INSERT INTO academico.notas (id_nota, id_est, id_malla, id_per, nota, tipo_evaluacion, observaciones, estatus) VALUES
(1, 1, 2, 1, 18.50, 'Parcial 1', 'Excelente dominio de estructuras de control', 'A');
