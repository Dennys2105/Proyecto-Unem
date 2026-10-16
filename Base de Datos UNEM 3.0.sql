SET check_function_bodies = false;
-- ddl-end --

-- object: academico | type: SCHEMA --
-- DROP SCHEMA IF EXISTS academico CASCADE;
CREATE SCHEMA academico;
-- ddl-end --
ALTER SCHEMA academico OWNER TO postgres;
-- ddl-end --
COMMENT ON SCHEMA academico IS E'Esquema para todo lo relacionado con los programas y mallas curriculares';
-- ddl-end --

-- object: personas | type: SCHEMA --
-- DROP SCHEMA IF EXISTS personas CASCADE;
CREATE SCHEMA personas;
-- ddl-end --
ALTER SCHEMA personas OWNER TO postgres;
-- ddl-end --
COMMENT ON SCHEMA personas IS E'Esquema para todo lo referente a docentes y estudiantes';
-- ddl-end --

-- object: infraestructura | type: SCHEMA --
-- DROP SCHEMA IF EXISTS infraestructura CASCADE;
CREATE SCHEMA infraestructura;
-- ddl-end --
ALTER SCHEMA infraestructura OWNER TO postgres;
-- ddl-end --
COMMENT ON SCHEMA infraestructura IS E'Esquema para todo lo referente a espacios físicos de la universidad';
-- ddl-end --

-- object: horarios | type: SCHEMA --
-- DROP SCHEMA IF EXISTS horarios CASCADE;
CREATE SCHEMA horarios;
-- ddl-end --
ALTER SCHEMA horarios OWNER TO postgres;
-- ddl-end --
COMMENT ON SCHEMA horarios IS E'Esquema para todo lo referente a la carga horaria';
-- ddl-end --

-- object: general | type: SCHEMA --
-- DROP SCHEMA IF EXISTS general CASCADE;
CREATE SCHEMA general;
-- ddl-end --
ALTER SCHEMA general OWNER TO postgres;
-- ddl-end --
COMMENT ON SCHEMA general IS E'Esquema para almacenar las tablas generales';
-- ddl-end --

SET search_path TO pg_catalog,public,academico,personas,infraestructura,horarios,general;
-- ddl-end --

-- object: general.roles | type: TABLE --
-- DROP TABLE IF EXISTS general.roles CASCADE;
CREATE TABLE general.roles (
	id_rol smallserial NOT NULL,
	rol varchar(255) NOT NULL,
	descripcion varchar(500) NOT NULL,
	estatus char(1) NOT NULL DEFAULT 'A',
	CONSTRAINT pk_id_rol PRIMARY KEY (id_rol),
	CONSTRAINT chk_rol_est CHECK (   estatus IN ('A', 'I'))
);
-- ddl-end --
COMMENT ON TABLE general.roles IS E'Tabla para almacenar los roles del sistema';
-- ddl-end --
COMMENT ON COLUMN general.roles.id_rol IS E'Identificador serializado para los roles, Ej: 1,2,3,4';
-- ddl-end --
COMMENT ON COLUMN general.roles.rol IS E'Columna para almacenar el tipo de rol que se le da al usuario';
-- ddl-end --
COMMENT ON COLUMN general.roles.descripcion IS E'Columna para explicar el funcionamiento de cada rol';
-- ddl-end --
COMMENT ON COLUMN general.roles.estatus IS E'Columna para borrado lógico en el que: A => Activo, I => Inactivo';
-- ddl-end --
COMMENT ON CONSTRAINT pk_id_rol ON general.roles  IS E'Llave primaria para el identificador del rol';
-- ddl-end --
COMMENT ON CONSTRAINT chk_rol_est ON general.roles  IS E'Revisa el estado del rol';
-- ddl-end --
ALTER TABLE general.roles OWNER TO postgres;
-- ddl-end --

-- object: general.municipios | type: TABLE --
-- DROP TABLE IF EXISTS general.municipios CASCADE;
CREATE TABLE general.municipios (
	id_mun serial NOT NULL,
	nombre varchar(255) NOT NULL,
	estatus char(1) NOT NULL DEFAULT 'A',
	CONSTRAINT pk_mun PRIMARY KEY (id_mun),
	CONSTRAINT chk_municipios_est CHECK (estatus IN ('A', 'I')),
	CONSTRAINT mun_nom UNIQUE (nombre)
);
-- ddl-end --
COMMENT ON TABLE general.municipios IS E'Tabla para saber los municipios del estado Táchira donde opera la universidad';
-- ddl-end --
COMMENT ON COLUMN general.municipios.id_mun IS E'Identificador serializado de los municipios, Ej:1,2,3,4';
-- ddl-end --
COMMENT ON COLUMN general.municipios.nombre IS E'Nombre del municipio Ej: San Cristóbal';
-- ddl-end --
COMMENT ON COLUMN general.municipios.estatus IS E'Columna para borrado lógico en el que: A => Activo, I => Inactivo';
-- ddl-end --
COMMENT ON CONSTRAINT pk_mun ON general.municipios  IS E'Llave primaria del municipio';
-- ddl-end --
COMMENT ON CONSTRAINT mun_nom ON general.municipios  IS E'Regla que hace unico cadaa nombre del municipio para que no se repitan';
-- ddl-end --
ALTER TABLE general.municipios OWNER TO postgres;
-- ddl-end --

-- object: general.dias_laborales | type: TABLE --
-- DROP TABLE IF EXISTS general.dias_laborales CASCADE;
CREATE TABLE general.dias_laborales (
	id_dia smallserial NOT NULL,
	dia varchar(10) NOT NULL,
	orden smallint NOT NULL,
	estatus char(1) NOT NULL DEFAULT 'A',
	CONSTRAINT pk_id PRIMARY KEY (id_dia),
	CONSTRAINT chk_dias_est CHECK (estatus IN('A','I')),
	CONSTRAINT dia_lab_unq UNIQUE (dia)
);
-- ddl-end --
COMMENT ON TABLE general.dias_laborales IS E'Dias laborables de la semana en la universidad';
-- ddl-end --
COMMENT ON COLUMN general.dias_laborales.id_dia IS E'Identificador serializado Ej:1,2,3,4';
-- ddl-end --
COMMENT ON COLUMN general.dias_laborales.dia IS E'Dia de la semana';
-- ddl-end --
COMMENT ON COLUMN general.dias_laborales.orden IS E'Orden en de los dias';
-- ddl-end --
COMMENT ON COLUMN general.dias_laborales.estatus IS E'Columna para borrado lógico en el que: A => Activo, I => Inactivo';
-- ddl-end --
COMMENT ON CONSTRAINT pk_id ON general.dias_laborales  IS E'Llave primaria del Identificador';
-- ddl-end --
COMMENT ON CONSTRAINT dia_lab_unq ON general.dias_laborales  IS E'Comprobación única para que no se repitan los días';
-- ddl-end --
ALTER TABLE general.dias_laborales OWNER TO postgres;
-- ddl-end --

-- object: general.usuarios | type: TABLE --
-- DROP TABLE IF EXISTS general.usuarios CASCADE;
CREATE TABLE general.usuarios (
	id_usu serial NOT NULL,
	username varchar(255) NOT NULL,
	id_rol smallint NOT NULL,
	estatus char(1) NOT NULL DEFAULT 'A',
	creado timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	actualizar timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_id_usu PRIMARY KEY (id_usu),
	CONSTRAINT chk_usu_est CHECK (estatus IN ('A','I'))
);
-- ddl-end --
COMMENT ON TABLE general.usuarios IS E'Tabla para los usuarios del sistema con autentificación';
-- ddl-end --
COMMENT ON COLUMN general.usuarios.id_usu IS E'Identificador serializado para el usuario Ej: 1,2,3,4,5';
-- ddl-end --
COMMENT ON COLUMN general.usuarios.username IS E'Nombre del usuario';
-- ddl-end --
COMMENT ON COLUMN general.usuarios.id_rol IS E'Identificador del rol de usuario como entero';
-- ddl-end --
COMMENT ON COLUMN general.usuarios.estatus IS E'Columna para borrado lógico en el que: A => Activo, I => Inactivo';
-- ddl-end --
COMMENT ON COLUMN general.usuarios.creado IS E'Columna para saber en que momento se creo el usuario';
-- ddl-end --
COMMENT ON COLUMN general.usuarios.actualizar IS E'Columna para averiguar en que momento actualizaron al usuario';
-- ddl-end --
COMMENT ON CONSTRAINT pk_id_usu ON general.usuarios  IS E'Llave primaria del identificador de usuario';
-- ddl-end --
COMMENT ON CONSTRAINT chk_usu_est ON general.usuarios  IS E'Regla para revisar el estado del usuario Activo o Inactivo';
-- ddl-end --
ALTER TABLE general.usuarios OWNER TO postgres;
-- ddl-end --

-- object: general.credenciales | type: TABLE --
-- DROP TABLE IF EXISTS general.credenciales CASCADE;
CREATE TABLE general.credenciales (
	id_cre serial NOT NULL,
	id_usu integer NOT NULL,
	password_hash varchar(255) NOT NULL,
	ultimo_acceso timestamp with time zone,
	intentos_fallidos smallint DEFAULT 0,
	bloqueado_hasta timestamp with time zone,
	CONSTRAINT pk_id_cre PRIMARY KEY (id_cre),
	CONSTRAINT id_usu_unq UNIQUE (id_usu)
);
-- ddl-end --
COMMENT ON TABLE general.credenciales IS E'Tabla para las credenciales de autentificación';
-- ddl-end --
COMMENT ON COLUMN general.credenciales.id_cre IS E'Identificador serializado para las credenciales, Ej: 1,2,3,4';
-- ddl-end --
COMMENT ON COLUMN general.credenciales.id_usu IS E'Identificador númerico de los usuarios';
-- ddl-end --
COMMENT ON COLUMN general.credenciales.password_hash IS E'contraseña del hash';
-- ddl-end --
COMMENT ON COLUMN general.credenciales.ultimo_acceso IS E'Columna para ver el último acceso del usuario';
-- ddl-end --
COMMENT ON COLUMN general.credenciales.intentos_fallidos IS E'Cantidad de intentos fallidos';
-- ddl-end --
COMMENT ON COLUMN general.credenciales.bloqueado_hasta IS E'Bloquer usuario hasta un tiempo determindo';
-- ddl-end --
COMMENT ON CONSTRAINT pk_id_cre ON general.credenciales  IS E'Llave primaria de los identificadores de credenciales';
-- ddl-end --
COMMENT ON CONSTRAINT id_usu_unq ON general.credenciales  IS E'Regla para que el identificador del usuario sea único';
-- ddl-end --
ALTER TABLE general.credenciales OWNER TO postgres;
-- ddl-end --

-- object: general.aud_mov | type: TABLE --
-- DROP TABLE IF EXISTS general.aud_mov CASCADE;
CREATE TABLE general.aud_mov (
	id_aud bigserial NOT NULL,
	id_usu integer NOT NULL,
	tabla_mod varchar(50) NOT NULL,
	accion varchar(10) NOT NULL,
	val_antes jsonb,
	val_despues jsonb,
	fec_hor timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	dir_ip varchar(45),
	estatus char(1) NOT NULL DEFAULT 'A',
	CONSTRAINT pk_id_aud PRIMARY KEY (id_aud),
	CONSTRAINT chk_aud_est CHECK (estatus IN ('A','I'))
);
-- ddl-end --
COMMENT ON TABLE general.aud_mov IS E'Tabla Auditoría para mantener una bitacora del sistema';
-- ddl-end --
COMMENT ON COLUMN general.aud_mov.id_aud IS E'Identificador único autoincremental del registro de auditoría. Ej: 1,2,3,4';
-- ddl-end --
COMMENT ON COLUMN general.aud_mov.id_usu IS E'Identificador del usuario que ejecutó la operación. Permite rastrear la autoría de cada cambio.';
-- ddl-end --
COMMENT ON COLUMN general.aud_mov.tabla_mod IS E'Nombre de la tabla que fue modificada. Indica el módulo o entidad del sistema donde ocurrió el cambio.';
-- ddl-end --
COMMENT ON COLUMN general.aud_mov.accion IS E'Tipo de operación SQL realizada: INSERT (creación), UPDATE (modificación) o DELETE (eliminación).';
-- ddl-end --
COMMENT ON COLUMN general.aud_mov.val_antes IS E'Estado completo del registro antes de la modificación, almacenado en formato JSONB. Es NULL para operaciones INSERT. Permite auditoría forense y reversión de cambios.';
-- ddl-end --
COMMENT ON COLUMN general.aud_mov.val_despues IS E'Estado completo del registro después de la modificación, almacenado en formato JSONB. Es NULL para operaciones DELETE. Documenta el resultado final del cambio.';
-- ddl-end --
COMMENT ON COLUMN general.aud_mov.fec_hor IS E'Marca de tiempo exacta de la operación con zona horaria. Se registra automáticamente mediante CURRENT_TIMESTAMP.';
-- ddl-end --
COMMENT ON COLUMN general.aud_mov.dir_ip IS E'Dirección IP del cliente que realizó la operación. Permite identificar el origen de red del cambio para fines de seguridad.';
-- ddl-end --
COMMENT ON COLUMN general.aud_mov.estatus IS E'Estado del registro de auditoría: ''A'' (Activo) o ''I'' (Inactivo). Implementa borrado lógico para mantener integridad histórica.';
-- ddl-end --
COMMENT ON CONSTRAINT pk_id_aud ON general.aud_mov  IS E'Llave primaria del id serializado de auditoria';
-- ddl-end --
COMMENT ON CONSTRAINT chk_aud_est ON general.aud_mov  IS E'Regla para verificar, si esta activo o inactivo en el borrado lógico';
-- ddl-end --
ALTER TABLE general.aud_mov OWNER TO postgres;
-- ddl-end --

-- object: personas.docentes | type: TABLE --
-- DROP TABLE IF EXISTS personas.docentes CASCADE;
CREATE TABLE personas.docentes (
	id_doc serial NOT NULL,
	id_usu integer,
	cedula varchar(20) NOT NULL,
	nombre varchar(150) NOT NULL,
	apellido varchar(150) NOT NULL,
	id_mun integer NOT NULL,
	especialidad varchar(150) NOT NULL,
	tipo_contrato varchar(20) NOT NULL DEFAULT 'Estipendio',
	horas_max_sem smallint NOT NULL DEFAULT 20,
	horas_asignadas smallint NOT NULL DEFAULT 0,
	horas_disponibles smallint NOT NULL DEFAULT 0,
	telefono varchar(20),
	estatus char(1) NOT NULL DEFAULT 'A',
	creado timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	actualizar timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_id_docentes PRIMARY KEY (id_doc),
	CONSTRAINT chk_docentes_est CHECK (estatus IN ('A','I')),
	CONSTRAINT chk_docentes_contrato CHECK (tipo_contrato IN ('Estipendio','Contratado')),
	CONSTRAINT chk_docentes_horas CHECK (horas_asignadas <=horas_max_sem),
	CONSTRAINT unq_docentes_cedula UNIQUE (cedula),
	CONSTRAINT unq_docentes_usuario UNIQUE (id_usu)
);
-- ddl-end --
COMMENT ON TABLE personas.docentes IS E'Tabla en la qe se almacenan los docentes de la universidad';
-- ddl-end --
COMMENT ON COLUMN personas.docentes.id_doc IS E'Identificador serializado de los docentes, Ej:1,2,3,4';
-- ddl-end --
COMMENT ON COLUMN personas.docentes.id_usu IS E'identificador entero del usuario del docente';
-- ddl-end --
COMMENT ON COLUMN personas.docentes.cedula IS E'Cedula de identidad del docente';
-- ddl-end --
COMMENT ON COLUMN personas.docentes.nombre IS E'Nombre del docente';
-- ddl-end --
COMMENT ON COLUMN personas.docentes.apellido IS E'Apellido del docente';
-- ddl-end --
COMMENT ON COLUMN personas.docentes.id_mun IS E'Identificador entero del municipio en el que se encuentra el docente';
-- ddl-end --
COMMENT ON COLUMN personas.docentes.tipo_contrato IS E'Tipo de contrato que tiene el docente';
-- ddl-end --
COMMENT ON COLUMN personas.docentes.horas_max_sem IS E'Horas máximas del docente a la semana';
-- ddl-end --
COMMENT ON COLUMN personas.docentes.horas_asignadas IS E'Horas asignadas al docente';
-- ddl-end --
COMMENT ON COLUMN personas.docentes.horas_disponibles IS E'Horas disponibles del docente a la semana';
-- ddl-end --
COMMENT ON COLUMN personas.docentes.telefono IS E'Telefono cellular del docente';
-- ddl-end --
COMMENT ON CONSTRAINT pk_id_docentes ON personas.docentes  IS E'Llave primaria del identificador serializado de los docentes';
-- ddl-end --
COMMENT ON CONSTRAINT chk_docentes_est ON personas.docentes  IS E'Chequea si el estado del docente es activo o inactivo';
-- ddl-end --
COMMENT ON CONSTRAINT chk_docentes_contrato ON personas.docentes  IS E'Revisa el tipo de contrato que tiene el docente';
-- ddl-end --
COMMENT ON CONSTRAINT chk_docentes_horas ON personas.docentes  IS E'Revisa las horas asiganadas al docente';
-- ddl-end --
COMMENT ON CONSTRAINT unq_docentes_cedula ON personas.docentes  IS E'Identificar que la cedula del docente sea única';
-- ddl-end --
COMMENT ON CONSTRAINT unq_docentes_usuario ON personas.docentes  IS E'Identificcar que el identificador del usuario del docente sea único';
-- ddl-end --
ALTER TABLE personas.docentes OWNER TO postgres;
-- ddl-end --

-- object: personas.estudiantes | type: TABLE --
-- DROP TABLE IF EXISTS personas.estudiantes CASCADE;
CREATE TABLE personas.estudiantes (
	id_est serial NOT NULL,
	id_usu integer,
	cedula varchar(20) NOT NULL,
	id_mun integer NOT NULL,
	nombre varchar(150) NOT NULL,
	apellido varchar(150) NOT NULL,
	id_pro integer,
	id_sec integer,
	trayecto smallint NOT NULL,
	estatus char(1) NOT NULL DEFAULT 'A',
	creado timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	actualizar timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_estudiantes PRIMARY KEY (id_est),
	CONSTRAINT chk_estudiantes_est CHECK (estatus IN ('A','I')),
	CONSTRAINT unq_estudiantes_cedula UNIQUE (cedula),
	CONSTRAINT unq_estudiantes_usuario UNIQUE (id_usu)
);
-- ddl-end --
COMMENT ON TABLE personas.estudiantes IS E'Tabla para almacenar la información de los estudiantes';
-- ddl-end --
COMMENT ON COLUMN personas.estudiantes.id_est IS E'identificador serializado de los estudiantes. Ej:1,2,3,4,5';
-- ddl-end --
COMMENT ON COLUMN personas.estudiantes.id_usu IS E'Identificador del usuario como entero';
-- ddl-end --
COMMENT ON COLUMN personas.estudiantes.cedula IS E'cedula de identidad del estudiante';
-- ddl-end --
COMMENT ON COLUMN personas.estudiantes.id_mun IS E'Identificador del municipio como entero';
-- ddl-end --
COMMENT ON COLUMN personas.estudiantes.id_pro IS E'Identificador entero de los programas academicos';
-- ddl-end --
COMMENT ON COLUMN personas.estudiantes.id_sec IS E'Identificador entero de las secciones';
-- ddl-end --
COMMENT ON COLUMN personas.estudiantes.trayecto IS E'Trayecto en el que se encuentra el estudiante';
-- ddl-end --
COMMENT ON CONSTRAINT pk_estudiantes ON personas.estudiantes  IS E'Llave primaria para el identificador de los estudiantes';
-- ddl-end --
COMMENT ON CONSTRAINT chk_estudiantes_est ON personas.estudiantes  IS E'revisa si el estatus del estudiantes es activo o inactivo';
-- ddl-end --
COMMENT ON CONSTRAINT unq_estudiantes_cedula ON personas.estudiantes  IS E'Las cedulas de los estudiantes son únicas';
-- ddl-end --
COMMENT ON CONSTRAINT unq_estudiantes_usuario ON personas.estudiantes  IS E'llave única del usuario del estudiante';
-- ddl-end --
ALTER TABLE personas.estudiantes OWNER TO postgres;
-- ddl-end --

-- object: personas.disponibilidad_docente | type: TABLE --
-- DROP TABLE IF EXISTS personas.disponibilidad_docente CASCADE;
CREATE TABLE personas.disponibilidad_docente (
	id_disp serial NOT NULL,
	id_doc integer NOT NULL,
	id_dia smallint NOT NULL,
	hora_inicio time NOT NULL,
	hora_fin time NOT NULL,
	estatus char(1) NOT NULL DEFAULT 'A',
	CONSTRAINT pk_disponibilidad PRIMARY KEY (id_disp),
	CONSTRAINT chk_disp_est CHECK (estatus IN ('A','I')),
	CONSTRAINT chk_disp_horarios CHECK (hora_inicio < hora_fin)
);
-- ddl-end --
COMMENT ON TABLE personas.disponibilidad_docente IS E'Tabla para ver la disponibilidad de los docentes';
-- ddl-end --
COMMENT ON COLUMN personas.disponibilidad_docente.id_disp IS E'Identificador serializado de la disponibilidad para os docentes.Ej:1,2,3,4,5,';
-- ddl-end --
COMMENT ON COLUMN personas.disponibilidad_docente.id_doc IS E'Identificador entero del docente como un entero';
-- ddl-end --
COMMENT ON COLUMN personas.disponibilidad_docente.id_dia IS E'Identificador del dia';
-- ddl-end --
COMMENT ON COLUMN personas.disponibilidad_docente.hora_inicio IS E'Hora en la que inicia el ciclo';
-- ddl-end --
COMMENT ON COLUMN personas.disponibilidad_docente.hora_fin IS E'Hora de fin';
-- ddl-end --
COMMENT ON CONSTRAINT pk_disponibilidad ON personas.disponibilidad_docente  IS E'Llave primaria de la disponibilidad de los docentes';
-- ddl-end --
COMMENT ON CONSTRAINT chk_disp_est ON personas.disponibilidad_docente  IS E'Revisa el estado de la disponibilidad';
-- ddl-end --
COMMENT ON CONSTRAINT chk_disp_horarios ON personas.disponibilidad_docente  IS E'revisa las horas';
-- ddl-end --
ALTER TABLE personas.disponibilidad_docente OWNER TO postgres;
-- ddl-end --

-- object: idx_docentes_cedulas | type: INDEX --
-- DROP INDEX IF EXISTS personas.idx_docentes_cedulas CASCADE;
CREATE INDEX idx_docentes_cedulas ON personas.docentes
USING btree
(
	cedula
);
-- ddl-end --

-- object: idx_docentes_municipio | type: INDEX --
-- DROP INDEX IF EXISTS personas.idx_docentes_municipio CASCADE;
CREATE INDEX idx_docentes_municipio ON personas.docentes
USING btree
(
	id_mun
);
-- ddl-end --

-- object: idx_docentes_contrato | type: INDEX --
-- DROP INDEX IF EXISTS personas.idx_docentes_contrato CASCADE;
CREATE INDEX idx_docentes_contrato ON personas.docentes
USING btree
(
	tipo_contrato
);
-- ddl-end --

-- object: idx_estudiantes_cedula | type: INDEX --
-- DROP INDEX IF EXISTS personas.idx_estudiantes_cedula CASCADE;
CREATE INDEX idx_estudiantes_cedula ON personas.estudiantes
USING btree
(
	cedula
);
-- ddl-end --

-- object: idx_disp_docente_dia | type: INDEX --
-- DROP INDEX IF EXISTS personas.idx_disp_docente_dia CASCADE;
CREATE INDEX idx_disp_docente_dia ON personas.disponibilidad_docente
USING btree
(
	id_doc,
	id_dia
);
-- ddl-end --

-- object: infraestructura.espacios_fis | type: TABLE --
-- DROP TABLE IF EXISTS infraestructura.espacios_fis CASCADE;
CREATE TABLE infraestructura.espacios_fis (
	id_esp serial NOT NULL,
	id_mun integer NOT NULL,
	nombre_centro varchar(100) NOT NULL DEFAULT 'Escuela Bustamante',
	ubicacion varchar(100) NOT NULL,
	tipo_espacio varchar(100) NOT NULL DEFAULT 'Aula',
	capacidad smallint NOT NULL DEFAULT 30,
	equipamiento text,
	disponibilidad boolean DEFAULT TRUE,
	estatus char(1) NOT NULL DEFAULT 'A',
	creado timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	actualizar timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_espacios PRIMARY KEY (id_esp),
	CONSTRAINT chk_espacios_est CHECK (estatus IN ('A','I')),
	CONSTRAINT chk_espaciios_tipo CHECK (tipo_espacio IN ('Aula'))
);
-- ddl-end --
COMMENT ON TABLE infraestructura.espacios_fis IS E'Tabla para almacenar los espacios físicos de la universidad';
-- ddl-end --
COMMENT ON COLUMN infraestructura.espacios_fis.id_mun IS E'Identificador como entero del municipio';
-- ddl-end --
COMMENT ON COLUMN infraestructura.espacios_fis.nombre_centro IS E'Nombre de donde estan viendo clases los estudiantes';
-- ddl-end --
COMMENT ON COLUMN infraestructura.espacios_fis.ubicacion IS E'Lugar en el que estan';
-- ddl-end --
COMMENT ON COLUMN infraestructura.espacios_fis.tipo_espacio IS E'Tipo de espacio en el que se encuentran los alumnos';
-- ddl-end --
COMMENT ON COLUMN infraestructura.espacios_fis.capacidad IS E'Capacidad máxima de las aulas por estudiante';
-- ddl-end --
COMMENT ON COLUMN infraestructura.espacios_fis.equipamiento IS E'Espacio para colocar como se encuentra el aula que tienen';
-- ddl-end --
COMMENT ON COLUMN infraestructura.espacios_fis.disponibilidad IS E'Mostar la disponibilidad que tiene el aula como un booleano. Ej: TRUE=> si, FALSE =>no';
-- ddl-end --
COMMENT ON CONSTRAINT pk_espacios ON infraestructura.espacios_fis  IS E'Llave primaria para identificar los espacios físicos disponibles';
-- ddl-end --
ALTER TABLE infraestructura.espacios_fis OWNER TO postgres;
-- ddl-end --

-- object: idx_espacios_municipio | type: INDEX --
-- DROP INDEX IF EXISTS infraestructura.idx_espacios_municipio CASCADE;
CREATE INDEX idx_espacios_municipio ON infraestructura.espacios_fis
USING btree
(
	id_mun
);
-- ddl-end --

-- object: idx_espacios_centro | type: INDEX --
-- DROP INDEX IF EXISTS infraestructura.idx_espacios_centro CASCADE;
CREATE INDEX idx_espacios_centro ON infraestructura.espacios_fis
USING btree
(
	nombre_centro
);
-- ddl-end --

-- object: horarios.bloques_horarios | type: TABLE --
-- DROP TABLE IF EXISTS horarios.bloques_horarios CASCADE;
CREATE TABLE horarios.bloques_horarios (
	id_bloq smallserial NOT NULL,
	nombre varchar(50) NOT NULL,
	hora_inicio time NOT NULL,
	hora_fin time NOT NULL,
	tipo varchar(20) NOT NULL,
	estatus char(1) NOT NULL DEFAULT 'A',
	CONSTRAINT pk_bloques PRIMARY KEY (id_bloq),
	CONSTRAINT chk_bloques_tipo CHECK (tipo IN('Académico', 'Almuerzo', 'Asesoría', 'Preparación')),
	CONSTRAINT chk_bloques_est CHECK (estatus IN ('A','I')),
	CONSTRAINT chk_bloques_horario CHECK (hora_inicio < hora_fin)
);
-- ddl-end --
COMMENT ON TABLE horarios.bloques_horarios IS E'Tabla para los Bloques de horario establecidos por la universidad';
-- ddl-end --
COMMENT ON COLUMN horarios.bloques_horarios.id_bloq IS E'Identificador único del bloque horario Ej:1,2,3,4,5';
-- ddl-end --
COMMENT ON COLUMN horarios.bloques_horarios.nombre IS E'Nombre descriptivo del bloque Ej: Blque Mañana';
-- ddl-end --
COMMENT ON COLUMN horarios.bloques_horarios.hora_inicio IS E'Hora en la que inicia el bloque';
-- ddl-end --
COMMENT ON COLUMN horarios.bloques_horarios.hora_fin IS E'Hora de fin del bloque';
-- ddl-end --
COMMENT ON COLUMN horarios.bloques_horarios.tipo IS E'Tipo de bloque: Académico, Almuerzo, Asesoría o Preparación';
-- ddl-end --
COMMENT ON COLUMN horarios.bloques_horarios.estatus IS E'Borrado lógico del bloque: A = Activo, I = Inactivo';
-- ddl-end --
COMMENT ON CONSTRAINT pk_bloques ON horarios.bloques_horarios  IS E'Llave primaria para idntificar los bloques de horarios';
-- ddl-end --
COMMENT ON CONSTRAINT chk_bloques_tipo ON horarios.bloques_horarios  IS E'revisa';
-- ddl-end --
ALTER TABLE horarios.bloques_horarios OWNER TO postgres;
-- ddl-end --

-- object: horarios.asig_carga_horarias | type: TABLE --
-- DROP TABLE IF EXISTS horarios.asig_carga_horarias CASCADE;
CREATE TABLE horarios.asig_carga_horarias (
	id_asig serial NOT NULL,
	id_doc integer,
	id_esp integer,
	id_dia smallint NOT NULL,
	id_bloq smallint,
	id_malla integer,
	id_per integer,
	hora_inicio time NOT NULL,
	hora_fin time NOT NULL,
	tipo_actividad varchar(20) DEFAULT 'Carga Académica',
	observaciones text,
	estatus char(1) NOT NULL DEFAULT 'A',
	creado timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	actualizar timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_asig PRIMARY KEY (id_asig),
	CONSTRAINT chk_asig_est CHECK (estatus IN ('A','I')),
	CONSTRAINT chk_asig_horario CHECK (hora_inicio <hora_fin),
	CONSTRAINT chk_asig_actividad CHECK (tipo_actividad IN ('Carga Académica','Asesoría','Preparación'))
);
-- ddl-end --
COMMENT ON TABLE horarios.asig_carga_horarias IS E'Tabla para la Asignación de carga horaria: qué docente, en qué espacio, qué día y a qué hora';
-- ddl-end --
COMMENT ON COLUMN horarios.asig_carga_horarias.id_asig IS E'Identificador único de la asignación de horario';
-- ddl-end --
COMMENT ON COLUMN horarios.asig_carga_horarias.id_doc IS E'Identificador como entero del docente asignado';
-- ddl-end --
COMMENT ON COLUMN horarios.asig_carga_horarias.id_esp IS E'Identificador entero del espacio físico asignado';
-- ddl-end --
COMMENT ON COLUMN horarios.asig_carga_horarias.id_dia IS E'Identificador del día de la semana';
-- ddl-end --
COMMENT ON COLUMN horarios.asig_carga_horarias.id_bloq IS E'Identificador del bloque horario';
-- ddl-end --
COMMENT ON COLUMN horarios.asig_carga_horarias.id_malla IS E'Identificador de la malla curricular (materia específica)';
-- ddl-end --
COMMENT ON COLUMN horarios.asig_carga_horarias.id_per IS E'Identificador del período académico';
-- ddl-end --
COMMENT ON COLUMN horarios.asig_carga_horarias.hora_inicio IS E'Hora exacta de inicio de la clase';
-- ddl-end --
COMMENT ON COLUMN horarios.asig_carga_horarias.hora_fin IS E'Hora exacta de fin de la clase';
-- ddl-end --
COMMENT ON COLUMN horarios.asig_carga_horarias.tipo_actividad IS E'Tipode actividad: Carga Académica, Asesoría, Preparación';
-- ddl-end --
COMMENT ON COLUMN horarios.asig_carga_horarias.observaciones IS E'Notas adicionales sobre la asignación';
-- ddl-end --
COMMENT ON COLUMN horarios.asig_carga_horarias.estatus IS E'Estado de borrado: A = Activo, I = Inactivo';
-- ddl-end --
ALTER TABLE horarios.asig_carga_horarias OWNER TO postgres;
-- ddl-end --

-- object: idx_asig_docente | type: INDEX --
-- DROP INDEX IF EXISTS horarios.idx_asig_docente CASCADE;
CREATE INDEX idx_asig_docente ON horarios.asig_carga_horarias
USING btree
(
	id_doc
);
-- ddl-end --

-- object: idx_asig_espacio | type: INDEX --
-- DROP INDEX IF EXISTS horarios.idx_asig_espacio CASCADE;
CREATE INDEX idx_asig_espacio ON horarios.asig_carga_horarias
USING btree
(
	id_esp
);
-- ddl-end --

-- object: idx_asig_dia | type: INDEX --
-- DROP INDEX IF EXISTS horarios.idx_asig_dia CASCADE;
CREATE INDEX idx_asig_dia ON horarios.asig_carga_horarias
USING btree
(
	id_dia
);
-- ddl-end --

-- object: idx_unq_doc_dia_hora | type: INDEX --
-- DROP INDEX IF EXISTS horarios.idx_unq_doc_dia_hora CASCADE;
CREATE UNIQUE INDEX idx_unq_doc_dia_hora ON horarios.asig_carga_horarias
USING btree
(
	id_doc,
	id_dia,
	hora_inicio
)
WHERE (estatus = 'A' AND id_doc IS NOT NULL);
-- ddl-end --

-- object: idx_unq_esp_dia_hora | type: INDEX --
-- DROP INDEX IF EXISTS horarios.idx_unq_esp_dia_hora CASCADE;
CREATE UNIQUE INDEX idx_unq_esp_dia_hora ON horarios.asig_carga_horarias
USING btree
(
	id_esp,
	id_dia,
	hora_inicio
)
WHERE (estatus = 'A' AND id_esp IS NOT NULL);
-- ddl-end --

-- object: idx_aud_mov_usu | type: INDEX --
-- DROP INDEX IF EXISTS general.idx_aud_mov_usu CASCADE;
CREATE INDEX idx_aud_mov_usu ON general.aud_mov
USING btree
(
	id_usu
);
-- ddl-end --
COMMENT ON INDEX general.idx_aud_mov_usu IS E'Índice para buscar auditoría por usuario';
-- ddl-end --

-- object: idx_aud_mov_tabla | type: INDEX --
-- DROP INDEX IF EXISTS general.idx_aud_mov_tabla CASCADE;
CREATE INDEX idx_aud_mov_tabla ON general.aud_mov
USING btree
(
	tabla_mod
);
-- ddl-end --
COMMENT ON INDEX general.idx_aud_mov_tabla IS E'Índice para filtrar por tabla modificada';
-- ddl-end --

-- object: idx_aud_mov_fecha | type: INDEX --
-- DROP INDEX IF EXISTS general.idx_aud_mov_fecha CASCADE;
CREATE INDEX idx_aud_mov_fecha ON general.aud_mov
USING btree
(
	fec_hor
);
-- ddl-end --
COMMENT ON INDEX general.idx_aud_mov_fecha IS E'Índice para consultar por rango de fechas';
-- ddl-end --

-- object: general.fn_auditoria_general | type: FUNCTION --
-- DROP FUNCTION IF EXISTS general.fn_auditoria_general() CASCADE;
CREATE FUNCTION general.fn_auditoria_general ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY DEFINER
	PARALLEL UNSAFE
	COST 1
	AS $$
DECLARE
    v_usuario_id INTEGER;
    v_ip_address VARCHAR(45);
BEGIN
    v_usuario_id := current_setting('app.current_user_id', TRUE)::INTEGER;
    v_ip_address := current_setting('app.client_ip', TRUE);
    
    IF v_usuario_id IS NULL THEN v_usuario_id := 0; END IF;
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO general.aud_mov (id_usu, tabla_mod, accion, val_antes, val_despues, dir_ip)
        VALUES (v_usuario_id, TG_TABLE_NAME, 'INSERT', NULL, to_jsonb(NEW), v_ip_address);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW IS DISTINCT FROM OLD THEN
            INSERT INTO general.aud_mov (id_usu, tabla_mod, accion, val_antes, val_despues, dir_ip)
            VALUES (v_usuario_id, TG_TABLE_NAME, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_ip_address);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO general.aud_mov (id_usu, tabla_mod, accion, val_antes, val_despues, dir_ip)
        VALUES (v_usuario_id, TG_TABLE_NAME, 'DELETE', to_jsonb(OLD), NULL, v_ip_address);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;
-- ddl-end --
ALTER FUNCTION general.fn_auditoria_general() OWNER TO postgres;
-- ddl-end --
COMMENT ON FUNCTION general.fn_auditoria_general() IS E'Función para registrar automáticamente cambios en la bitácora de auditoría';
-- ddl-end --

-- object: general.f_actualizar_timestamp | type: FUNCTION --
-- DROP FUNCTION IF EXISTS general.f_actualizar_timestamp() CASCADE;
CREATE FUNCTION general.f_actualizar_timestamp ()
	RETURNS trigger
	LANGUAGE plpgsql
	VOLATILE 
	CALLED ON NULL INPUT
	SECURITY INVOKER
	PARALLEL UNSAFE
	COST 1
	AS $$
BEGIN
    NEW.actualizar = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
-- ddl-end --
ALTER FUNCTION general.f_actualizar_timestamp() OWNER TO postgres;
-- ddl-end --
COMMENT ON FUNCTION general.f_actualizar_timestamp() IS E'Función para actualizar automáticamente el campo actualizar con CURRENT_TIMESTAMP';
-- ddl-end --

-- object: trg_aud_docentes | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_aud_docentes ON personas.docentes CASCADE;
CREATE TRIGGER trg_aud_docentes
	AFTER INSERT OR DELETE OR UPDATE
	ON personas.docentes
	FOR EACH ROW
	EXECUTE PROCEDURE general.fn_auditoria_general();
-- ddl-end --
COMMENT ON TRIGGER trg_aud_docentes ON personas.docentes IS E'Trigger de auditoría para docentes';
-- ddl-end --

-- object: trg_docentes_actualizar | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_docentes_actualizar ON personas.docentes CASCADE;
CREATE TRIGGER trg_docentes_actualizar
	BEFORE UPDATE
	ON personas.docentes
	FOR EACH ROW
	EXECUTE PROCEDURE general.f_actualizar_timestamp();
-- ddl-end --

-- object: academico.programas | type: TABLE --
-- DROP TABLE IF EXISTS academico.programas CASCADE;
CREATE TABLE academico.programas (
	id_pro serial NOT NULL,
	codigo varchar(10) NOT NULL,
	nombre varchar(255) NOT NULL,
	tipo_sistema varchar NOT NULL,
	total_trayectos smallint NOT NULL,
	total_uc smallint NOT NULL,
	estatus char(1) NOT NULL DEFAULT 'A',
	creado timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	actualizar timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_programas PRIMARY KEY (id_pro),
	CONSTRAINT chk_programas_est CHECK (estatus  IN ('A','I')),
	CONSTRAINT chk_programas_sistema CHECK (tipo_sistema IN ('Trimestral', 'Semestral')),
	CONSTRAINT unq_programas_codigo UNIQUE (codigo)
);
-- ddl-end --
COMMENT ON TABLE academico.programas IS E'Programas académicos de la universidad (Inicial, Primaria, Especial)';
-- ddl-end --
COMMENT ON COLUMN academico.programas.codigo IS E'Código único del programa (Ej: LPRI, LESP)';
-- ddl-end --
COMMENT ON COLUMN academico.programas.tipo_sistema IS E'Tipo de sistema: Trimestral o Semestral';
-- ddl-end --
COMMENT ON COLUMN academico.programas.total_trayectos IS E'Número total de trayectos del programa';
-- ddl-end --
COMMENT ON COLUMN academico.programas.total_uc IS E'Total de unidades crédito del programa completo';
-- ddl-end --
ALTER TABLE academico.programas OWNER TO postgres;
-- ddl-end --

-- object: academico.ejes_formativos | type: TABLE --
-- DROP TABLE IF EXISTS academico.ejes_formativos CASCADE;
CREATE TABLE academico.ejes_formativos (
	id_eje smallserial NOT NULL,
	codigo varchar(5) NOT NULL,
	nombre varchar(100) NOT NULL,
	descripcion varchar(255) NOT NULL,
	estatus char(1) NOT NULL DEFAULT 'A',
	CONSTRAINT pk_ejes PRIMARY KEY (id_eje),
	CONSTRAINT chk_ejes_est CHECK (estatus  IN ('A','I')),
	CONSTRAINT unq_ejes_codigo UNIQUE (codigo)
);
-- ddl-end --
COMMENT ON TABLE academico.ejes_formativos IS E'Catálogo de ejes formativos (Proyecto, Socio-crítico, Disciplinario, etc.)';
-- ddl-end --
ALTER TABLE academico.ejes_formativos OWNER TO postgres;
-- ddl-end --

-- object: academico.materias | type: TABLE --
-- DROP TABLE IF EXISTS academico.materias CASCADE;
CREATE TABLE academico.materias (
	id_mat serial NOT NULL,
	codigo varchar(20) NOT NULL,
	nombre varchar(250) NOT NULL,
	id_eje smallint NOT NULL,
	unidades_creditos smallint NOT NULL,
	descripcion text,
	estatus char(1) NOT NULL DEFAULT 'A',
	creado timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	actualizar timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_materias PRIMARY KEY (id_mat),
	CONSTRAINT chk_materias_est CHECK (estatus IN ('A','I')),
	CONSTRAINT unq_materias_codigo UNIQUE (codigo)
);
-- ddl-end --
COMMENT ON TABLE academico.materias IS E'Catálogo de unidades curriculares (materias) de todos los programas';
-- ddl-end --
COMMENT ON COLUMN academico.materias.codigo IS E'Código único de la materia (Ej: PRIT1PDC, EDUESPT1PSI1)';
-- ddl-end --
COMMENT ON COLUMN academico.materias.unidades_creditos IS E'Unidades crédito de la materia';
-- ddl-end --
ALTER TABLE academico.materias OWNER TO postgres;
-- ddl-end --

-- object: academico.malla_curricular | type: TABLE --
-- DROP TABLE IF EXISTS academico.malla_curricular CASCADE;
CREATE TABLE academico.malla_curricular (
	id_malla serial NOT NULL,
	id_pro integer NOT NULL,
	id_mat integer NOT NULL,
	trayecto smallint NOT NULL,
	periodo smallint NOT NULL,
	orden smallint NOT NULL DEFAULT 1,
	perequisito_id_mat integer,
	estatus char(1) NOT NULL DEFAULT 'A',
	creado timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	actualizar timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_malla PRIMARY KEY (id_malla),
	CONSTRAINT chk_malla_est CHECK (estatus IN ('A', 'I')),
	CONSTRAINT chk_malla_trayecto CHECK (trayecto > 0),
	CONSTRAINT chk_malla_periodo CHECK (periodo > 0)
);
-- ddl-end --
COMMENT ON TABLE academico.malla_curricular IS E'Pensum académico: define qué materias se cursan en cada trayecto y período';
-- ddl-end --
COMMENT ON COLUMN academico.malla_curricular.trayecto IS E'Número de trayecto (1-4)';
-- ddl-end --
COMMENT ON COLUMN academico.malla_curricular.periodo IS E'Número de período dentro del trayecto (1-3 para trimestral, 1-2 para semestral)';
-- ddl-end --
COMMENT ON COLUMN academico.malla_curricular.orden IS E'Orden de la materia dentro del período';
-- ddl-end --
COMMENT ON COLUMN academico.malla_curricular.perequisito_id_mat IS E'Materia prerequisito (NULL si no tiene)';
-- ddl-end --
ALTER TABLE academico.malla_curricular OWNER TO postgres;
-- ddl-end --

-- object: academico.periodos_academicos | type: TABLE --
-- DROP TABLE IF EXISTS academico.periodos_academicos CASCADE;
CREATE TABLE academico.periodos_academicos (
	id_per serial NOT NULL,
	nombre varchar(50) NOT NULL,
	anio smallint NOT NULL,
	numero_periodo smallint NOT NULL,
	tipo varchar(20) NOT NULL,
	fecha_inicio date NOT NULL,
	fecha_fin date NOT NULL,
	activo boolean NOT NULL DEFAULT FALSE,
	estatus char(1) NOT NULL DEFAULT 'A',
	creado timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	actualizar timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_periodos PRIMARY KEY (id_per),
	CONSTRAINT chk_periodos_est CHECK (estatus IN ('A','I')),
	CONSTRAINT chk_periodos_fechas CHECK (fecha_inicio < fecha_fin),
	CONSTRAINT chk_periodos_tipo CHECK (tipo IN ('Trimestre', 'Semestre')),
	CONSTRAINT chk_periodos_numero CHECK (numero_periodo > 0 AND numero_periodo <= 12)
);
-- ddl-end --
COMMENT ON TABLE academico.periodos_academicos IS E'Períodos académicos (trimestres o semestres) con fechas de inicio y fin';
-- ddl-end --
COMMENT ON COLUMN academico.periodos_academicos.numero_periodo IS E'Número del período (1-12 para trimestres, 1-8 para semestres)';
-- ddl-end --
COMMENT ON COLUMN academico.periodos_academicos.activo IS E'Indica si este es el período académico vigente';
-- ddl-end --
ALTER TABLE academico.periodos_academicos OWNER TO postgres;
-- ddl-end --

-- object: academico.secciones | type: TABLE --
-- DROP TABLE IF EXISTS academico.secciones CASCADE;
CREATE TABLE academico.secciones (
	id_sec serial NOT NULL,
	codigo varchar(20) NOT NULL,
	id_pro integer NOT NULL,
	trayecto smallint NOT NULL,
	periodo smallint NOT NULL,
	capacidad_maxima smallint NOT NULL DEFAULT 40,
	estatus char(1) NOT NULL DEFAULT 'A',
	creado timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	actualizar timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_secciones PRIMARY KEY (id_sec),
	CONSTRAINT chk_secciones_est CHECK (estatus IN ('A','I')),
	CONSTRAINT chk_secciones_trayecto CHECK (trayecto > 0),
	CONSTRAINT chk_secciones_periodo CHECK (periodo > 0),
	CONSTRAINT chk_secciones_capacidad CHECK (capacidad_maxima > 0),
	CONSTRAINT unq_secciones_codigo UNIQUE (codigo)
);
-- ddl-end --
ALTER TABLE academico.secciones OWNER TO postgres;
-- ddl-end --

-- object: idx_programas_codigo | type: INDEX --
-- DROP INDEX IF EXISTS academico.idx_programas_codigo CASCADE;
CREATE INDEX idx_programas_codigo ON academico.programas
USING btree
(
	codigo
);
-- ddl-end --

-- object: idx_materias_codigo | type: INDEX --
-- DROP INDEX IF EXISTS academico.idx_materias_codigo CASCADE;
CREATE INDEX idx_materias_codigo ON academico.materias
USING btree
(
	codigo
);
-- ddl-end --

-- object: idx_materias_eje | type: INDEX --
-- DROP INDEX IF EXISTS academico.idx_materias_eje CASCADE;
CREATE INDEX idx_materias_eje ON academico.materias
USING btree
(
	id_eje
);
-- ddl-end --

-- object: idx_malla_programa | type: INDEX --
-- DROP INDEX IF EXISTS academico.idx_malla_programa CASCADE;
CREATE INDEX idx_malla_programa ON academico.malla_curricular
USING btree
(
	id_pro
);
-- ddl-end --

-- object: idx_malla_materia | type: INDEX --
-- DROP INDEX IF EXISTS academico.idx_malla_materia CASCADE;
CREATE INDEX idx_malla_materia ON academico.malla_curricular
USING btree
(
	id_mat
);
-- ddl-end --

-- object: idx_malla_trayecto_periodo | type: INDEX --
-- DROP INDEX IF EXISTS academico.idx_malla_trayecto_periodo CASCADE;
CREATE INDEX idx_malla_trayecto_periodo ON academico.malla_curricular
USING btree
(
	trayecto,
	periodo
);
-- ddl-end --

-- object: idx_periodos_activo | type: INDEX --
-- DROP INDEX IF EXISTS academico.idx_periodos_activo CASCADE;
CREATE INDEX idx_periodos_activo ON academico.periodos_academicos
USING btree
(
	activo
)
WHERE (activo = TRUE);
-- ddl-end --

-- object: idx_secciones_programa | type: INDEX --
-- DROP INDEX IF EXISTS academico.idx_secciones_programa CASCADE;
CREATE INDEX idx_secciones_programa ON academico.secciones
USING btree
(
	id_pro
);
-- ddl-end --

-- object: trg_aud_estudiantes | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_aud_estudiantes ON personas.estudiantes CASCADE;
CREATE TRIGGER trg_aud_estudiantes
	AFTER INSERT OR DELETE OR UPDATE
	ON personas.estudiantes
	FOR EACH ROW
	EXECUTE PROCEDURE general.fn_auditoria_general();
-- ddl-end --

-- object: trg_aud_asig | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_aud_asig ON horarios.asig_carga_horarias CASCADE;
CREATE TRIGGER trg_aud_asig
	AFTER INSERT OR DELETE OR UPDATE
	ON horarios.asig_carga_horarias
	FOR EACH ROW
	EXECUTE PROCEDURE general.fn_auditoria_general();
-- ddl-end --

-- object: trg_aud_espacios | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_aud_espacios ON infraestructura.espacios_fis CASCADE;
CREATE TRIGGER trg_aud_espacios
	AFTER INSERT OR DELETE OR UPDATE
	ON infraestructura.espacios_fis
	FOR EACH ROW
	EXECUTE PROCEDURE general.fn_auditoria_general();
-- ddl-end --

-- object: trg_aud_disponibilidad | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_aud_disponibilidad ON personas.disponibilidad_docente CASCADE;
CREATE TRIGGER trg_aud_disponibilidad
	AFTER INSERT OR DELETE OR UPDATE
	ON personas.disponibilidad_docente
	FOR EACH ROW
	EXECUTE PROCEDURE general.fn_auditoria_general();
-- ddl-end --

-- object: trg_estudiantes_actualizar | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_estudiantes_actualizar ON personas.estudiantes CASCADE;
CREATE TRIGGER trg_estudiantes_actualizar
	BEFORE UPDATE
	ON personas.estudiantes
	FOR EACH ROW
	EXECUTE PROCEDURE general.f_actualizar_timestamp();
-- ddl-end --

-- object: trg_asig_actualizar | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_asig_actualizar ON horarios.asig_carga_horarias CASCADE;
CREATE TRIGGER trg_asig_actualizar
	BEFORE UPDATE
	ON horarios.asig_carga_horarias
	FOR EACH ROW
	EXECUTE PROCEDURE general.f_actualizar_timestamp();
-- ddl-end --

-- object: trg_espacios_actualizar | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_espacios_actualizar ON infraestructura.espacios_fis CASCADE;
CREATE TRIGGER trg_espacios_actualizar
	BEFORE UPDATE
	ON infraestructura.espacios_fis
	FOR EACH ROW
	EXECUTE PROCEDURE general.f_actualizar_timestamp();
-- ddl-end --

-- object: trg_bloques_actualizar | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_bloques_actualizar ON horarios.bloques_horarios CASCADE;
CREATE TRIGGER trg_bloques_actualizar
	BEFORE UPDATE
	ON horarios.bloques_horarios
	FOR EACH ROW
	EXECUTE PROCEDURE general.f_actualizar_timestamp();
-- ddl-end --

-- object: trg_programas_actualizar | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_programas_actualizar ON academico.programas CASCADE;
CREATE TRIGGER trg_programas_actualizar
	BEFORE UPDATE
	ON academico.programas
	FOR EACH ROW
	EXECUTE PROCEDURE general.f_actualizar_timestamp();
-- ddl-end --

-- object: trg_materias_actualizar | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_materias_actualizar ON academico.materias CASCADE;
CREATE TRIGGER trg_materias_actualizar
	BEFORE UPDATE
	ON academico.materias
	FOR EACH ROW
	EXECUTE PROCEDURE general.f_actualizar_timestamp();
-- ddl-end --

-- object: trg_malla_curricular | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_malla_curricular ON academico.malla_curricular CASCADE;
CREATE TRIGGER trg_malla_curricular
	BEFORE UPDATE
	ON academico.malla_curricular
	FOR EACH ROW
	EXECUTE PROCEDURE general.f_actualizar_timestamp();
-- ddl-end --

-- object: trg_periodos_actualizar | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_periodos_actualizar ON academico.periodos_academicos CASCADE;
CREATE TRIGGER trg_periodos_actualizar
	BEFORE UPDATE
	ON academico.periodos_academicos
	FOR EACH ROW
	EXECUTE PROCEDURE general.f_actualizar_timestamp();
-- ddl-end --

-- object: trg_secciones_actualizar | type: TRIGGER --
-- DROP TRIGGER IF EXISTS trg_secciones_actualizar ON academico.secciones CASCADE;
CREATE TRIGGER trg_secciones_actualizar
	BEFORE UPDATE
	ON academico.secciones
	FOR EACH ROW
	EXECUTE PROCEDURE general.f_actualizar_timestamp();
-- ddl-end --

-- object: fk_rol_id | type: CONSTRAINT --
-- ALTER TABLE general.usuarios DROP CONSTRAINT IF EXISTS fk_rol_id CASCADE;
ALTER TABLE general.usuarios ADD CONSTRAINT fk_rol_id FOREIGN KEY (id_rol)
REFERENCES general.roles (id_rol) MATCH SIMPLE
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --
COMMENT ON CONSTRAINT fk_rol_id ON general.usuarios  IS E'Llave foranea del identificador de los roles';
-- ddl-end --


-- object: fk_credendiales_usuario | type: CONSTRAINT --
-- ALTER TABLE general.credenciales DROP CONSTRAINT IF EXISTS fk_credendiales_usuario CASCADE;
ALTER TABLE general.credenciales ADD CONSTRAINT fk_credendiales_usuario FOREIGN KEY (id_usu)
REFERENCES general.usuarios (id_usu) MATCH SIMPLE
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --
COMMENT ON CONSTRAINT fk_credendiales_usuario ON general.credenciales  IS E'Llave foranea del identificador del usuario';
-- ddl-end --


-- object: fk_aud_mov_usuario | type: CONSTRAINT --
-- ALTER TABLE general.aud_mov DROP CONSTRAINT IF EXISTS fk_aud_mov_usuario CASCADE;
ALTER TABLE general.aud_mov ADD CONSTRAINT fk_aud_mov_usuario FOREIGN KEY (id_usu)
REFERENCES general.usuarios (id_usu) MATCH SIMPLE
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --
COMMENT ON CONSTRAINT fk_aud_mov_usuario ON general.aud_mov  IS E'Llave foranea que viene de la tabla usuarios y trae el identificador de usuarios';
-- ddl-end --


-- object: fk_docentes_usuario | type: CONSTRAINT --
-- ALTER TABLE personas.docentes DROP CONSTRAINT IF EXISTS fk_docentes_usuario CASCADE;
ALTER TABLE personas.docentes ADD CONSTRAINT fk_docentes_usuario FOREIGN KEY (id_usu)
REFERENCES general.usuarios (id_usu) MATCH SIMPLE
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --
COMMENT ON CONSTRAINT fk_docentes_usuario ON personas.docentes  IS E'Llave foranea del identificador del usuario';
-- ddl-end --


-- object: fk_id_mun | type: CONSTRAINT --
-- ALTER TABLE personas.docentes DROP CONSTRAINT IF EXISTS fk_id_mun CASCADE;
ALTER TABLE personas.docentes ADD CONSTRAINT fk_id_mun FOREIGN KEY (id_mun)
REFERENCES general.municipios (id_mun) MATCH SIMPLE
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --
COMMENT ON CONSTRAINT fk_id_mun ON personas.docentes  IS E'Llave foranea del identificador del municipio';
-- ddl-end --


-- object: fk_estudiante_usuario | type: CONSTRAINT --
-- ALTER TABLE personas.estudiantes DROP CONSTRAINT IF EXISTS fk_estudiante_usuario CASCADE;
ALTER TABLE personas.estudiantes ADD CONSTRAINT fk_estudiante_usuario FOREIGN KEY (id_usu)
REFERENCES general.usuarios (id_usu) MATCH SIMPLE
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --
COMMENT ON CONSTRAINT fk_estudiante_usuario ON personas.estudiantes  IS E'Llave foranea del identificador del usuario';
-- ddl-end --


-- object: fk_estudiantes_municipio | type: CONSTRAINT --
-- ALTER TABLE personas.estudiantes DROP CONSTRAINT IF EXISTS fk_estudiantes_municipio CASCADE;
ALTER TABLE personas.estudiantes ADD CONSTRAINT fk_estudiantes_municipio FOREIGN KEY (id_mun)
REFERENCES general.municipios (id_mun) MATCH SIMPLE
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --
COMMENT ON CONSTRAINT fk_estudiantes_municipio ON personas.estudiantes  IS E'llave foranea del identificador del municipio';
-- ddl-end --


-- object: fk_dip_docente | type: CONSTRAINT --
-- ALTER TABLE personas.disponibilidad_docente DROP CONSTRAINT IF EXISTS fk_dip_docente CASCADE;
ALTER TABLE personas.disponibilidad_docente ADD CONSTRAINT fk_dip_docente FOREIGN KEY (id_doc)
REFERENCES personas.docentes (id_doc) MATCH SIMPLE
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_disp_dia | type: CONSTRAINT --
-- ALTER TABLE personas.disponibilidad_docente DROP CONSTRAINT IF EXISTS fk_disp_dia CASCADE;
ALTER TABLE personas.disponibilidad_docente ADD CONSTRAINT fk_disp_dia FOREIGN KEY (id_dia)
REFERENCES general.dias_laborales (id_dia) MATCH SIMPLE
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_espacios_municipio | type: CONSTRAINT --
-- ALTER TABLE infraestructura.espacios_fis DROP CONSTRAINT IF EXISTS fk_espacios_municipio CASCADE;
ALTER TABLE infraestructura.espacios_fis ADD CONSTRAINT fk_espacios_municipio FOREIGN KEY (id_mun)
REFERENCES general.municipios (id_mun) MATCH SIMPLE
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --
COMMENT ON CONSTRAINT fk_espacios_municipio ON infraestructura.espacios_fis  IS E'Llaveforanea que trae el identificador de los municipios';
-- ddl-end --


-- object: fk_asig_docente | type: CONSTRAINT --
-- ALTER TABLE horarios.asig_carga_horarias DROP CONSTRAINT IF EXISTS fk_asig_docente CASCADE;
ALTER TABLE horarios.asig_carga_horarias ADD CONSTRAINT fk_asig_docente FOREIGN KEY (id_doc)
REFERENCES personas.docentes (id_doc) MATCH SIMPLE
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_asig_espacio | type: CONSTRAINT --
-- ALTER TABLE horarios.asig_carga_horarias DROP CONSTRAINT IF EXISTS fk_asig_espacio CASCADE;
ALTER TABLE horarios.asig_carga_horarias ADD CONSTRAINT fk_asig_espacio FOREIGN KEY (id_esp)
REFERENCES infraestructura.espacios_fis (id_esp) MATCH SIMPLE
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_asig_dia | type: CONSTRAINT --
-- ALTER TABLE horarios.asig_carga_horarias DROP CONSTRAINT IF EXISTS fk_asig_dia CASCADE;
ALTER TABLE horarios.asig_carga_horarias ADD CONSTRAINT fk_asig_dia FOREIGN KEY (id_dia)
REFERENCES general.dias_laborales (id_dia) MATCH SIMPLE
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_asig_bloque | type: CONSTRAINT --
-- ALTER TABLE horarios.asig_carga_horarias DROP CONSTRAINT IF EXISTS fk_asig_bloque CASCADE;
ALTER TABLE horarios.asig_carga_horarias ADD CONSTRAINT fk_asig_bloque FOREIGN KEY (id_bloq)
REFERENCES horarios.bloques_horarios (id_bloq) MATCH SIMPLE
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_asig_malla | type: CONSTRAINT --
-- ALTER TABLE horarios.asig_carga_horarias DROP CONSTRAINT IF EXISTS fk_asig_malla CASCADE;
ALTER TABLE horarios.asig_carga_horarias ADD CONSTRAINT fk_asig_malla FOREIGN KEY (id_malla)
REFERENCES academico.malla_curricular (id_malla) MATCH SIMPLE
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_asig_periodo | type: CONSTRAINT --
-- ALTER TABLE horarios.asig_carga_horarias DROP CONSTRAINT IF EXISTS fk_asig_periodo CASCADE;
ALTER TABLE horarios.asig_carga_horarias ADD CONSTRAINT fk_asig_periodo FOREIGN KEY (id_per)
REFERENCES academico.periodos_academicos (id_per) MATCH SIMPLE
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: fk_materias_eje | type: CONSTRAINT --
-- ALTER TABLE academico.materias DROP CONSTRAINT IF EXISTS fk_materias_eje CASCADE;
ALTER TABLE academico.materias ADD CONSTRAINT fk_materias_eje FOREIGN KEY (id_eje)
REFERENCES academico.ejes_formativos (id_eje) MATCH SIMPLE
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_malla_programa | type: CONSTRAINT --
-- ALTER TABLE academico.malla_curricular DROP CONSTRAINT IF EXISTS fk_malla_programa CASCADE;
ALTER TABLE academico.malla_curricular ADD CONSTRAINT fk_malla_programa FOREIGN KEY (id_pro)
REFERENCES academico.programas (id_pro) MATCH SIMPLE
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_malla_materia | type: CONSTRAINT --
-- ALTER TABLE academico.malla_curricular DROP CONSTRAINT IF EXISTS fk_malla_materia CASCADE;
ALTER TABLE academico.malla_curricular ADD CONSTRAINT fk_malla_materia FOREIGN KEY (id_mat)
REFERENCES academico.materias (id_mat) MATCH SIMPLE
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_malla_prerequisito | type: CONSTRAINT --
-- ALTER TABLE academico.malla_curricular DROP CONSTRAINT IF EXISTS fk_malla_prerequisito CASCADE;
ALTER TABLE academico.malla_curricular ADD CONSTRAINT fk_malla_prerequisito FOREIGN KEY (perequisito_id_mat)
REFERENCES academico.materias (id_mat) MATCH SIMPLE
ON DELETE SET NULL ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_secciones_programa | type: CONSTRAINT --
-- ALTER TABLE academico.secciones DROP CONSTRAINT IF EXISTS fk_secciones_programa CASCADE;
ALTER TABLE academico.secciones ADD CONSTRAINT fk_secciones_programa FOREIGN KEY (id_pro)
REFERENCES academico.programas (id_pro) MATCH SIMPLE
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --


