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
