--
-- PostgreSQL database dump
--

\restrict 3SLZr5KW0DkQF0rMXgFdP2Dnhmsvhg0yIo79fcajjyAWVmFoQKWiYQPFnWBvaz3

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-10-08 10:13:25

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 65631)
-- Name: academico; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA academico;


ALTER SCHEMA academico OWNER TO postgres;

--
-- TOC entry 5236 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA academico; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA academico IS 'Esquema para todo lo relacionado con los programas y mallas curriculares';


--
-- TOC entry 10 (class 2615 OID 65635)
-- Name: general; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA general;


ALTER SCHEMA general OWNER TO postgres;

--
-- TOC entry 5237 (class 0 OID 0)
-- Dependencies: 10
-- Name: SCHEMA general; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA general IS 'Esquema para almacenar las tablas generales';


--
-- TOC entry 9 (class 2615 OID 65634)
-- Name: horarios; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA horarios;


ALTER SCHEMA horarios OWNER TO postgres;

--
-- TOC entry 5238 (class 0 OID 0)
-- Dependencies: 9
-- Name: SCHEMA horarios; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA horarios IS 'Esquema para todo lo referente a la carga horaria';


--
-- TOC entry 8 (class 2615 OID 65633)
-- Name: infraestructura; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA infraestructura;


ALTER SCHEMA infraestructura OWNER TO postgres;

--
-- TOC entry 5239 (class 0 OID 0)
-- Dependencies: 8
-- Name: SCHEMA infraestructura; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA infraestructura IS 'Esquema para todo lo referente a espacios físicos de la universidad';


--
-- TOC entry 7 (class 2615 OID 65632)
-- Name: personas; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA personas;


ALTER SCHEMA personas OWNER TO postgres;

--
-- TOC entry 5240 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA personas; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA personas IS 'Esquema para todo lo referente a docentes y estudiantes';


--
-- TOC entry 263 (class 1255 OID 65886)
-- Name: f_actualizar_timestamp(); Type: FUNCTION; Schema: general; Owner: postgres
--

CREATE FUNCTION general.f_actualizar_timestamp() RETURNS trigger
    LANGUAGE plpgsql COST 1
    AS $$
BEGIN
    NEW.actualizar = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION general.f_actualizar_timestamp() OWNER TO postgres;

--
-- TOC entry 5241 (class 0 OID 0)
-- Dependencies: 263
-- Name: FUNCTION f_actualizar_timestamp(); Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON FUNCTION general.f_actualizar_timestamp() IS 'Función para actualizar automáticamente el campo actualizar con CURRENT_TIMESTAMP';


--
-- TOC entry 275 (class 1255 OID 65885)
-- Name: fn_auditoria_general(); Type: FUNCTION; Schema: general; Owner: postgres
--

CREATE FUNCTION general.fn_auditoria_general() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_usuario_id INTEGER;
    v_ip_address VARCHAR(45);
    v_setting_user TEXT;
    v_setting_ip TEXT;
BEGIN
    -- 1. Obtener variables de sesión de forma segura (sin EXCEPTION)
    v_setting_user := current_setting('app.current_user_id', TRUE);
    IF v_setting_user IS NOT NULL AND v_setting_user <> '' THEN
        v_usuario_id := v_setting_user::INTEGER;
    ELSE
        v_usuario_id := NULL;
    END IF;

    v_setting_ip := current_setting('app.client_ip', TRUE);
    IF v_setting_ip IS NOT NULL AND v_setting_ip <> '' THEN
        v_ip_address := v_setting_ip;
    ELSE
        v_ip_address := NULL;
    END IF;

    -- 2. Lógica de auditoría
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


ALTER FUNCTION general.fn_auditoria_general() OWNER TO postgres;

--
-- TOC entry 5242 (class 0 OID 0)
-- Dependencies: 275
-- Name: FUNCTION fn_auditoria_general(); Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON FUNCTION general.fn_auditoria_general() IS 'Función para registrar automáticamente cambios en la bitácora de auditoría';


--
-- TOC entry 276 (class 1255 OID 66156)
-- Name: fn_calcular_horas_docente(); Type: FUNCTION; Schema: horarios; Owner: postgres
--

CREATE FUNCTION horarios.fn_calcular_horas_docente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_doc INTEGER;
    v_total_horas NUMERIC;
BEGIN
    -- 1. Identificar al docente afectado (si es DELETE, usa OLD; si no, NEW)
    IF TG_OP = 'DELETE' THEN
        v_id_doc := OLD.id_doc;
    ELSE
        v_id_doc := NEW.id_doc;
    END IF;

    -- Si la asignación no tiene docente (ej. es un espacio reservado), no hacer nada
    IF v_id_doc IS NULL THEN 
        RETURN COALESCE(NEW, OLD); 
    END IF;

    -- 2. Calcular el total de horas reales asignadas (en horas decimales/enteras)
    -- Sumamos la diferencia entre hora_fin y hora_inicio de todas las asignaciones ACTIVAS
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 3600.0), 0)
    INTO v_total_horas
    FROM horarios.asig_carga_horarias
    WHERE id_doc = v_id_doc 
      AND estatus = 'A';

    -- 3. Actualizar la tabla de docentes (Redondeamos a entero si tu columna es smallint)
    UPDATE personas.docentes
    SET 
        horas_asignadas = ROUND(v_total_horas)::smallint,
        horas_disponibles = horas_max_sem - ROUND(v_total_horas)::smallint,
        actualizar = CURRENT_TIMESTAMP
    WHERE id_doc = v_id_doc;

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION horarios.fn_calcular_horas_docente() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 251 (class 1259 OID 65915)
-- Name: ejes_formativos; Type: TABLE; Schema: academico; Owner: postgres
--

CREATE TABLE academico.ejes_formativos (
    id_eje smallint NOT NULL,
    codigo character varying(5) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255) NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    CONSTRAINT chk_ejes_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE academico.ejes_formativos OWNER TO postgres;

--
-- TOC entry 5243 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE ejes_formativos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TABLE academico.ejes_formativos IS 'Catálogo de ejes formativos (Proyecto, Socio-crítico, Disciplinario, etc.)';


--
-- TOC entry 5244 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN ejes_formativos.id_eje; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.ejes_formativos.id_eje IS 'Identificador único serializado del eje formativo.';


--
-- TOC entry 5245 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN ejes_formativos.codigo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.ejes_formativos.codigo IS 'Código alfanumérico corto para identificar el eje (Ej: PROY, SOCR).';


--
-- TOC entry 5246 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN ejes_formativos.nombre; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.ejes_formativos.nombre IS 'Nombre completo del eje formativo (Ej: Proyecto, Epistemológico, Socio-crítico).';


--
-- TOC entry 5247 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN ejes_formativos.descripcion; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.ejes_formativos.descripcion IS 'Detalle extendido de los objetivos o enfoque del eje formativo.';


--
-- TOC entry 5248 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN ejes_formativos.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.ejes_formativos.estatus IS 'Indicador de borrado lógico en el sistema (A = Activo, I = Inactivo).';


--
-- TOC entry 5249 (class 0 OID 0)
-- Dependencies: 251
-- Name: CONSTRAINT chk_ejes_est ON ejes_formativos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_ejes_est ON academico.ejes_formativos IS 'Regla de validación para asegurar que el estatus solo sea ''A'' (Activo) o ''I'' (Inactivo).';


--
-- TOC entry 250 (class 1259 OID 65914)
-- Name: ejes_formativos_id_eje_seq; Type: SEQUENCE; Schema: academico; Owner: postgres
--

CREATE SEQUENCE academico.ejes_formativos_id_eje_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE academico.ejes_formativos_id_eje_seq OWNER TO postgres;

--
-- TOC entry 5250 (class 0 OID 0)
-- Dependencies: 250
-- Name: ejes_formativos_id_eje_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.ejes_formativos_id_eje_seq OWNED BY academico.ejes_formativos.id_eje;


--
-- TOC entry 255 (class 1259 OID 65954)
-- Name: malla_curricular; Type: TABLE; Schema: academico; Owner: postgres
--

CREATE TABLE academico.malla_curricular (
    id_malla integer NOT NULL,
    id_pro integer NOT NULL,
    id_mat integer NOT NULL,
    trayecto smallint NOT NULL,
    periodo smallint NOT NULL,
    orden smallint DEFAULT 1 NOT NULL,
    perequisito_id_mat integer,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_malla_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar]))),
    CONSTRAINT chk_malla_periodo CHECK ((periodo > 0)),
    CONSTRAINT chk_malla_trayecto CHECK ((trayecto > 0))
);


ALTER TABLE academico.malla_curricular OWNER TO postgres;

--
-- TOC entry 5251 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TABLE academico.malla_curricular IS 'Pensum académico: define qué materias se cursan en cada trayecto y período';


--
-- TOC entry 5252 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN malla_curricular.id_malla; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.id_malla IS 'Identificador único serializado del registro dentro de la malla.';


--
-- TOC entry 5253 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN malla_curricular.id_pro; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.id_pro IS 'Identificador del programa académico al que pertenece este registro de malla.';


--
-- TOC entry 5254 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN malla_curricular.id_mat; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.id_mat IS 'Identificador de la materia (unidad curricular) asignada a la malla.';


--
-- TOC entry 5255 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN malla_curricular.trayecto; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.trayecto IS 'Número de trayecto (1-4)';


--
-- TOC entry 5256 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN malla_curricular.periodo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.periodo IS 'Número de período dentro del trayecto (1-3 para trimestral, 1-2 para semestral)';


--
-- TOC entry 5257 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN malla_curricular.orden; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.orden IS 'Orden de la materia dentro del período';


--
-- TOC entry 5258 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN malla_curricular.perequisito_id_mat; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.perequisito_id_mat IS 'Materia prerequisito (NULL si no tiene)';


--
-- TOC entry 5259 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN malla_curricular.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5260 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN malla_curricular.creado; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.creado IS 'Fecha y hora exacta de creación de este registro en la malla.';


--
-- TOC entry 5261 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN malla_curricular.actualizar; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.actualizar IS 'Fecha y hora de la última modificación realizada a este registro.';


--
-- TOC entry 5262 (class 0 OID 0)
-- Dependencies: 255
-- Name: CONSTRAINT chk_malla_est ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_malla_est ON academico.malla_curricular IS 'Valida que el estatus de la materia en la malla sea ''A''=Activo o ''I''=Inactivo.';


--
-- TOC entry 5263 (class 0 OID 0)
-- Dependencies: 255
-- Name: CONSTRAINT chk_malla_periodo ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_malla_periodo ON academico.malla_curricular IS 'Garantiza que el número del período sea un valor positivo mayor a 0.';


--
-- TOC entry 5264 (class 0 OID 0)
-- Dependencies: 255
-- Name: CONSTRAINT chk_malla_trayecto ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_malla_trayecto ON academico.malla_curricular IS 'Garantiza que el número del trayecto sea un valor positivo mayor a 0.';


--
-- TOC entry 254 (class 1259 OID 65953)
-- Name: malla_curricular_id_malla_seq; Type: SEQUENCE; Schema: academico; Owner: postgres
--

CREATE SEQUENCE academico.malla_curricular_id_malla_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE academico.malla_curricular_id_malla_seq OWNER TO postgres;

--
-- TOC entry 5265 (class 0 OID 0)
-- Dependencies: 254
-- Name: malla_curricular_id_malla_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.malla_curricular_id_malla_seq OWNED BY academico.malla_curricular.id_malla;


--
-- TOC entry 253 (class 1259 OID 65931)
-- Name: materias; Type: TABLE; Schema: academico; Owner: postgres
--

CREATE TABLE academico.materias (
    id_mat integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(250) NOT NULL,
    id_eje smallint NOT NULL,
    unidades_creditos smallint NOT NULL,
    descripcion text,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_materias_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE academico.materias OWNER TO postgres;

--
-- TOC entry 5266 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE materias; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TABLE academico.materias IS 'Catálogo de unidades curriculares (materias) de todos los programas';


--
-- TOC entry 5267 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN materias.id_mat; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.id_mat IS 'Identificador único serializado de la unidad curricular (materia).';


--
-- TOC entry 5268 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN materias.codigo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.codigo IS 'Código único de la materia (Ej: PRIT1PDC, EDUESPT1PSI1)';


--
-- TOC entry 5269 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN materias.nombre; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.nombre IS 'Nombre completo de la unidad curricular.';


--
-- TOC entry 5270 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN materias.id_eje; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.id_eje IS 'Identificador del eje formativo al que pertenece la materia.';


--
-- TOC entry 5271 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN materias.unidades_creditos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.unidades_creditos IS 'Unidades crédito de la materia';


--
-- TOC entry 5272 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN materias.descripcion; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.descripcion IS 'Sinopsis o resumen del contenido y propósito de la unidad curricular.';


--
-- TOC entry 5273 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN materias.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5274 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN materias.creado; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.creado IS 'Fecha y hora de registro de la materia en el sistema.';


--
-- TOC entry 5275 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN materias.actualizar; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.actualizar IS 'Fecha y hora de la última actualización de los datos de la materia.';


--
-- TOC entry 5276 (class 0 OID 0)
-- Dependencies: 253
-- Name: CONSTRAINT chk_materias_est ON materias; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_materias_est ON academico.materias IS 'Regla para asegurar que la materia solo tenga estatus ''A''=Activo o ''I''=Inactivo.';


--
-- TOC entry 252 (class 1259 OID 65930)
-- Name: materias_id_mat_seq; Type: SEQUENCE; Schema: academico; Owner: postgres
--

CREATE SEQUENCE academico.materias_id_mat_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE academico.materias_id_mat_seq OWNER TO postgres;

--
-- TOC entry 5277 (class 0 OID 0)
-- Dependencies: 252
-- Name: materias_id_mat_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.materias_id_mat_seq OWNED BY academico.materias.id_mat;


--
-- TOC entry 257 (class 1259 OID 65977)
-- Name: periodos_academicos; Type: TABLE; Schema: academico; Owner: postgres
--

CREATE TABLE academico.periodos_academicos (
    id_per integer NOT NULL,
    nombre character varying(50) NOT NULL,
    anio smallint NOT NULL,
    numero_periodo smallint NOT NULL,
    tipo character varying(20) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    activo boolean DEFAULT false NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_periodos_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar]))),
    CONSTRAINT chk_periodos_fechas CHECK ((fecha_inicio < fecha_fin)),
    CONSTRAINT chk_periodos_numero CHECK (((numero_periodo > 0) AND (numero_periodo <= 12))),
    CONSTRAINT chk_periodos_tipo CHECK (((tipo)::text = ANY ((ARRAY['Trimestre'::character varying, 'Semestre'::character varying])::text[])))
);


ALTER TABLE academico.periodos_academicos OWNER TO postgres;

--
-- TOC entry 5278 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TABLE academico.periodos_academicos IS 'Períodos académicos (trimestres o semestres) con fechas de inicio y fin';


--
-- TOC entry 5279 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN periodos_academicos.id_per; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.id_per IS 'Identificador único serializado del período académico.';


--
-- TOC entry 5280 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN periodos_academicos.nombre; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.nombre IS 'Nombre descriptivo del lapso (Ej: Trimestre 2024-I, Semestre 2025-II).';


--
-- TOC entry 5281 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN periodos_academicos.anio; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.anio IS 'Año calendario al que corresponde el período académico.';


--
-- TOC entry 5282 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN periodos_academicos.numero_periodo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.numero_periodo IS 'Número del período (1-12 para trimestres, 1-8 para semestres)';


--
-- TOC entry 5283 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN periodos_academicos.tipo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.tipo IS 'Clasificación del período (Ej: Regular, Intensivo, Recuperación).';


--
-- TOC entry 5284 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN periodos_academicos.fecha_inicio; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.fecha_inicio IS 'Fecha oficial del inicio de clases para este período.';


--
-- TOC entry 5285 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN periodos_academicos.fecha_fin; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.fecha_fin IS 'Fecha oficial de culminación del período académico.';


--
-- TOC entry 5286 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN periodos_academicos.activo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.activo IS 'Indica si este es el período académico vigente';


--
-- TOC entry 5287 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN periodos_academicos.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5288 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN periodos_academicos.creado; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.creado IS 'Fecha y hora en la que se configuró el período en el sistema.';


--
-- TOC entry 5289 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN periodos_academicos.actualizar; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.actualizar IS 'Fecha y hora del último ajuste realizado al período académico.';


--
-- TOC entry 5290 (class 0 OID 0)
-- Dependencies: 257
-- Name: CONSTRAINT chk_periodos_est ON periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_periodos_est ON academico.periodos_academicos IS 'Restricción para validar el estado de borrado lógico (''A'' o ''I'').';


--
-- TOC entry 5291 (class 0 OID 0)
-- Dependencies: 257
-- Name: CONSTRAINT chk_periodos_fechas ON periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_periodos_fechas ON academico.periodos_academicos IS 'Lógica de validación que obliga a que la fecha de inicio sea estrictamente anterior a la fecha de fin.';


--
-- TOC entry 5292 (class 0 OID 0)
-- Dependencies: 257
-- Name: CONSTRAINT chk_periodos_numero ON periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_periodos_numero ON academico.periodos_academicos IS 'Asegura que el número de período se mantenga en el rango lógico de 1 a 12.';


--
-- TOC entry 5293 (class 0 OID 0)
-- Dependencies: 257
-- Name: CONSTRAINT chk_periodos_tipo ON periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_periodos_tipo ON academico.periodos_academicos IS 'Restricción que limita los tipos de período exclusivamente a ''Trimestre'' o ''Semestre''.';


--
-- TOC entry 256 (class 1259 OID 65976)
-- Name: periodos_academicos_id_per_seq; Type: SEQUENCE; Schema: academico; Owner: postgres
--

CREATE SEQUENCE academico.periodos_academicos_id_per_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE academico.periodos_academicos_id_per_seq OWNER TO postgres;

--
-- TOC entry 5294 (class 0 OID 0)
-- Dependencies: 256
-- Name: periodos_academicos_id_per_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.periodos_academicos_id_per_seq OWNED BY academico.periodos_academicos.id_per;


--
-- TOC entry 249 (class 1259 OID 65890)
-- Name: programas; Type: TABLE; Schema: academico; Owner: postgres
--

CREATE TABLE academico.programas (
    id_pro integer NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(255) NOT NULL,
    tipo_sistema character varying NOT NULL,
    total_trayectos smallint NOT NULL,
    total_uc smallint NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_programas_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar]))),
    CONSTRAINT chk_programas_sistema CHECK (((tipo_sistema)::text = ANY ((ARRAY['Trimestral'::character varying, 'Semestral'::character varying])::text[])))
);


ALTER TABLE academico.programas OWNER TO postgres;

--
-- TOC entry 5295 (class 0 OID 0)
-- Dependencies: 249
-- Name: TABLE programas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TABLE academico.programas IS 'Programas académicos de la universidad (Inicial, Primaria, Especial)';


--
-- TOC entry 5296 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN programas.id_pro; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.id_pro IS 'Identificador único serializado del programa académico o PNF.';


--
-- TOC entry 5297 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN programas.codigo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.codigo IS 'Código único del programa (Ej: LPRI, LESP)';


--
-- TOC entry 5298 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN programas.nombre; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.nombre IS 'Título oficial del programa (Ej: PNF en Informática, Licenciatura en Educación).';


--
-- TOC entry 5299 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN programas.tipo_sistema; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.tipo_sistema IS 'Tipo de sistema: Trimestral o Semestral';


--
-- TOC entry 5300 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN programas.total_trayectos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.total_trayectos IS 'Número total de trayectos del programa';


--
-- TOC entry 5301 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN programas.total_uc; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.total_uc IS 'Total de unidades crédito del programa completo';


--
-- TOC entry 5302 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN programas.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5303 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN programas.creado; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.creado IS 'Timestamp de creación del registro del programa en la base de datos.';


--
-- TOC entry 5304 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN programas.actualizar; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.actualizar IS 'Timestamp de la última vez que se editó la información del programa.';


--
-- TOC entry 5305 (class 0 OID 0)
-- Dependencies: 249
-- Name: CONSTRAINT chk_programas_est ON programas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_programas_est ON academico.programas IS 'Valida que el estatus insertado sea únicamente ''A'' o ''I''.';


--
-- TOC entry 5306 (class 0 OID 0)
-- Dependencies: 249
-- Name: CONSTRAINT chk_programas_sistema ON programas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_programas_sistema ON academico.programas IS 'Valida que el sistema educativo sea únicamente ''Trimestral'' o ''Semestral''.';


--
-- TOC entry 248 (class 1259 OID 65889)
-- Name: programas_id_pro_seq; Type: SEQUENCE; Schema: academico; Owner: postgres
--

CREATE SEQUENCE academico.programas_id_pro_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE academico.programas_id_pro_seq OWNER TO postgres;

--
-- TOC entry 5307 (class 0 OID 0)
-- Dependencies: 248
-- Name: programas_id_pro_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.programas_id_pro_seq OWNED BY academico.programas.id_pro;


--
-- TOC entry 259 (class 1259 OID 66003)
-- Name: secciones; Type: TABLE; Schema: academico; Owner: postgres
--

CREATE TABLE academico.secciones (
    id_sec integer NOT NULL,
    codigo character varying(20) NOT NULL,
    id_pro integer NOT NULL,
    trayecto smallint NOT NULL,
    periodo smallint NOT NULL,
    capacidad_maxima smallint DEFAULT 40 NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_secciones_capacidad CHECK ((capacidad_maxima > 0)),
    CONSTRAINT chk_secciones_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar]))),
    CONSTRAINT chk_secciones_periodo CHECK ((periodo > 0)),
    CONSTRAINT chk_secciones_trayecto CHECK ((trayecto > 0))
);


ALTER TABLE academico.secciones OWNER TO postgres;

--
-- TOC entry 5308 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN secciones.id_sec; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.id_sec IS 'Identificador único serializado de la sección.';


--
-- TOC entry 5309 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN secciones.codigo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.codigo IS 'Código identificador de la sección (Ej: INF-T1-S1, ADM-S3).';


--
-- TOC entry 5310 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN secciones.id_pro; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.id_pro IS 'Identificador del programa académico al que pertenece la sección.';


--
-- TOC entry 5311 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN secciones.trayecto; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.trayecto IS 'Número del trayecto académico en el que se abre la sección.';


--
-- TOC entry 5312 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN secciones.periodo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.periodo IS 'Período específico (trimestre o semestre) de esta sección.';


--
-- TOC entry 5313 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN secciones.capacidad_maxima; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.capacidad_maxima IS 'Límite máximo de estudiantes que se pueden inscribir en la sección.';


--
-- TOC entry 5314 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN secciones.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5315 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN secciones.creado; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.creado IS 'Fecha y hora de creación de la sección.';


--
-- TOC entry 5316 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN secciones.actualizar; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.actualizar IS 'Fecha y hora de la última modificación de la sección.';


--
-- TOC entry 5317 (class 0 OID 0)
-- Dependencies: 259
-- Name: CONSTRAINT chk_secciones_capacidad ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_secciones_capacidad ON academico.secciones IS 'Impide crear secciones con capacidad de 0 o números negativos.';


--
-- TOC entry 5318 (class 0 OID 0)
-- Dependencies: 259
-- Name: CONSTRAINT chk_secciones_est ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_secciones_est ON academico.secciones IS 'Garantiza que el estatus lógico de la sección sea ''A'' o ''I''.';


--
-- TOC entry 5319 (class 0 OID 0)
-- Dependencies: 259
-- Name: CONSTRAINT chk_secciones_periodo ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_secciones_periodo ON academico.secciones IS 'Verifica que el período de la sección sea mayor a 0.';


--
-- TOC entry 5320 (class 0 OID 0)
-- Dependencies: 259
-- Name: CONSTRAINT chk_secciones_trayecto ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_secciones_trayecto ON academico.secciones IS 'Verifica que el trayecto asignado a la sección sea mayor a 0.';


--
-- TOC entry 258 (class 1259 OID 66002)
-- Name: secciones_id_sec_seq; Type: SEQUENCE; Schema: academico; Owner: postgres
--

CREATE SEQUENCE academico.secciones_id_sec_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE academico.secciones_id_sec_seq OWNER TO postgres;

--
-- TOC entry 5321 (class 0 OID 0)
-- Dependencies: 258
-- Name: secciones_id_sec_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.secciones_id_sec_seq OWNED BY academico.secciones.id_sec;


--
-- TOC entry 235 (class 1259 OID 65711)
-- Name: aud_mov; Type: TABLE; Schema: general; Owner: postgres
--

CREATE TABLE general.aud_mov (
    id_aud bigint NOT NULL,
    id_usu integer,
    tabla_mod character varying(50) NOT NULL,
    accion character varying(10) NOT NULL,
    val_antes jsonb,
    val_despues jsonb,
    fec_hor timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    dir_ip character varying(45),
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    CONSTRAINT chk_aud_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE general.aud_mov OWNER TO postgres;

--
-- TOC entry 5322 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE aud_mov; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.aud_mov IS 'Tabla Auditoría para mantener una bitacora del sistema';


--
-- TOC entry 5323 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN aud_mov.id_aud; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.id_aud IS 'Identificador único autoincremental del registro de auditoría. Ej: 1,2,3,4';


--
-- TOC entry 5324 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN aud_mov.id_usu; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.id_usu IS 'Identificador del usuario que ejecutó la operación. Permite rastrear la autoría de cada cambio.';


--
-- TOC entry 5325 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN aud_mov.tabla_mod; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.tabla_mod IS 'Nombre de la tabla que fue modificada. Indica el módulo o entidad del sistema donde ocurrió el cambio.';


--
-- TOC entry 5326 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN aud_mov.accion; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.accion IS 'Tipo de operación SQL realizada: INSERT (creación), UPDATE (modificación) o DELETE (eliminación).';


--
-- TOC entry 5327 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN aud_mov.val_antes; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.val_antes IS 'Estado completo del registro antes de la modificación, almacenado en formato JSONB. Es NULL para operaciones INSERT. Permite auditoría forense y reversión de cambios.';


--
-- TOC entry 5328 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN aud_mov.val_despues; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.val_despues IS 'Estado completo del registro después de la modificación, almacenado en formato JSONB. Es NULL para operaciones DELETE. Documenta el resultado final del cambio.';


--
-- TOC entry 5329 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN aud_mov.fec_hor; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.fec_hor IS 'Marca de tiempo exacta de la operación con zona horaria. Se registra automáticamente mediante CURRENT_TIMESTAMP.';


--
-- TOC entry 5330 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN aud_mov.dir_ip; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.dir_ip IS 'Dirección IP del cliente que realizó la operación. Permite identificar el origen de red del cambio para fines de seguridad.';


--
-- TOC entry 5331 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN aud_mov.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.estatus IS 'Estado del registro de auditoría: ''A'' (Activo) o ''I'' (Inactivo). Implementa borrado lógico para mantener integridad histórica.';


--
-- TOC entry 5332 (class 0 OID 0)
-- Dependencies: 235
-- Name: CONSTRAINT chk_aud_est ON aud_mov; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_aud_est ON general.aud_mov IS 'Regla para verificar, si esta activo o inactivo en el borrado lógico';


--
-- TOC entry 234 (class 1259 OID 65710)
-- Name: aud_mov_id_aud_seq; Type: SEQUENCE; Schema: general; Owner: postgres
--

CREATE SEQUENCE general.aud_mov_id_aud_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE general.aud_mov_id_aud_seq OWNER TO postgres;

--
-- TOC entry 5333 (class 0 OID 0)
-- Dependencies: 234
-- Name: aud_mov_id_aud_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.aud_mov_id_aud_seq OWNED BY general.aud_mov.id_aud;


--
-- TOC entry 233 (class 1259 OID 65698)
-- Name: credenciales; Type: TABLE; Schema: general; Owner: postgres
--

CREATE TABLE general.credenciales (
    id_cre integer NOT NULL,
    id_usu integer NOT NULL,
    password_hash character varying(255) NOT NULL,
    ultimo_acceso timestamp with time zone,
    intentos_fallidos smallint DEFAULT 0,
    bloqueado_hasta timestamp with time zone
);


ALTER TABLE general.credenciales OWNER TO postgres;

--
-- TOC entry 5334 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE credenciales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.credenciales IS 'Tabla para las credenciales de autentificación';


--
-- TOC entry 5335 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN credenciales.id_cre; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.credenciales.id_cre IS 'Identificador serializado para las credenciales, Ej: 1,2,3,4';


--
-- TOC entry 5336 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN credenciales.id_usu; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.credenciales.id_usu IS 'Identificador númerico de los usuarios';


--
-- TOC entry 5337 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN credenciales.password_hash; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.credenciales.password_hash IS 'contraseña del hash';


--
-- TOC entry 5338 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN credenciales.ultimo_acceso; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.credenciales.ultimo_acceso IS 'Columna para ver el último acceso del usuario';


--
-- TOC entry 5339 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN credenciales.intentos_fallidos; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.credenciales.intentos_fallidos IS 'Cantidad de intentos fallidos';


--
-- TOC entry 5340 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN credenciales.bloqueado_hasta; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.credenciales.bloqueado_hasta IS 'Bloquer usuario hasta un tiempo determindo';


--
-- TOC entry 232 (class 1259 OID 65697)
-- Name: credenciales_id_cre_seq; Type: SEQUENCE; Schema: general; Owner: postgres
--

CREATE SEQUENCE general.credenciales_id_cre_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE general.credenciales_id_cre_seq OWNER TO postgres;

--
-- TOC entry 5341 (class 0 OID 0)
-- Dependencies: 232
-- Name: credenciales_id_cre_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.credenciales_id_cre_seq OWNED BY general.credenciales.id_cre;


--
-- TOC entry 229 (class 1259 OID 65666)
-- Name: dias_laborales; Type: TABLE; Schema: general; Owner: postgres
--

CREATE TABLE general.dias_laborales (
    id_dia smallint NOT NULL,
    dia character varying(10) NOT NULL,
    orden smallint NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    CONSTRAINT chk_dias_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE general.dias_laborales OWNER TO postgres;

--
-- TOC entry 5342 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE dias_laborales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.dias_laborales IS 'Dias laborables de la semana en la universidad';


--
-- TOC entry 5343 (class 0 OID 0)
-- Dependencies: 229
-- Name: COLUMN dias_laborales.id_dia; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.dias_laborales.id_dia IS 'Identificador serializado Ej:1,2,3,4';


--
-- TOC entry 5344 (class 0 OID 0)
-- Dependencies: 229
-- Name: COLUMN dias_laborales.dia; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.dias_laborales.dia IS 'Dia de la semana';


--
-- TOC entry 5345 (class 0 OID 0)
-- Dependencies: 229
-- Name: COLUMN dias_laborales.orden; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.dias_laborales.orden IS 'Orden en de los dias';


--
-- TOC entry 5346 (class 0 OID 0)
-- Dependencies: 229
-- Name: COLUMN dias_laborales.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.dias_laborales.estatus IS 'Columna para borrado lógico en el que: A => Activo, I => Inactivo';


--
-- TOC entry 5347 (class 0 OID 0)
-- Dependencies: 229
-- Name: CONSTRAINT chk_dias_est ON dias_laborales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_dias_est ON general.dias_laborales IS 'Regla de validación lógica para comprobar si el registro está ''A'' (Activo) o ''I'' (Inactivo).';


--
-- TOC entry 228 (class 1259 OID 65665)
-- Name: dias_laborales_id_dia_seq; Type: SEQUENCE; Schema: general; Owner: postgres
--

CREATE SEQUENCE general.dias_laborales_id_dia_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE general.dias_laborales_id_dia_seq OWNER TO postgres;

--
-- TOC entry 5348 (class 0 OID 0)
-- Dependencies: 228
-- Name: dias_laborales_id_dia_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.dias_laborales_id_dia_seq OWNED BY general.dias_laborales.id_dia;


--
-- TOC entry 227 (class 1259 OID 65652)
-- Name: municipios; Type: TABLE; Schema: general; Owner: postgres
--

CREATE TABLE general.municipios (
    id_mun integer NOT NULL,
    nombre character varying(255) NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    CONSTRAINT chk_municipios_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE general.municipios OWNER TO postgres;

--
-- TOC entry 5349 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE municipios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.municipios IS 'Tabla para saber los municipios del estado Táchira donde opera la universidad';


--
-- TOC entry 5350 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN municipios.id_mun; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.municipios.id_mun IS 'Identificador serializado de los municipios, Ej:1,2,3,4';


--
-- TOC entry 5351 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN municipios.nombre; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.municipios.nombre IS 'Nombre del municipio Ej: San Cristóbal';


--
-- TOC entry 5352 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN municipios.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.municipios.estatus IS 'Columna para borrado lógico en el que: A => Activo, I => Inactivo';


--
-- TOC entry 5353 (class 0 OID 0)
-- Dependencies: 227
-- Name: CONSTRAINT chk_municipios_est ON municipios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_municipios_est ON general.municipios IS 'Regla de validación para determinar si el municipio está disponible operativamente (''A'') o no (''I'').';


--
-- TOC entry 226 (class 1259 OID 65651)
-- Name: municipios_id_mun_seq; Type: SEQUENCE; Schema: general; Owner: postgres
--

CREATE SEQUENCE general.municipios_id_mun_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE general.municipios_id_mun_seq OWNER TO postgres;

--
-- TOC entry 5354 (class 0 OID 0)
-- Dependencies: 226
-- Name: municipios_id_mun_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.municipios_id_mun_seq OWNED BY general.municipios.id_mun;


--
-- TOC entry 225 (class 1259 OID 65637)
-- Name: roles; Type: TABLE; Schema: general; Owner: postgres
--

CREATE TABLE general.roles (
    id_rol smallint NOT NULL,
    rol character varying(255) NOT NULL,
    descripcion character varying(500) NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    CONSTRAINT chk_rol_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE general.roles OWNER TO postgres;

--
-- TOC entry 5355 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE roles; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.roles IS 'Tabla para almacenar los roles del sistema';


--
-- TOC entry 5356 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN roles.id_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.roles.id_rol IS 'Identificador serializado para los roles, Ej: 1,2,3,4';


--
-- TOC entry 5357 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN roles.rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.roles.rol IS 'Columna para almacenar el tipo de rol que se le da al usuario';


--
-- TOC entry 5358 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN roles.descripcion; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.roles.descripcion IS 'Columna para explicar el funcionamiento de cada rol';


--
-- TOC entry 5359 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN roles.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.roles.estatus IS 'Columna para borrado lógico en el que: A => Activo, I => Inactivo';


--
-- TOC entry 5360 (class 0 OID 0)
-- Dependencies: 225
-- Name: CONSTRAINT chk_rol_est ON roles; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_rol_est ON general.roles IS 'Revisa el estado del rol';


--
-- TOC entry 224 (class 1259 OID 65636)
-- Name: roles_id_rol_seq; Type: SEQUENCE; Schema: general; Owner: postgres
--

CREATE SEQUENCE general.roles_id_rol_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE general.roles_id_rol_seq OWNER TO postgres;

--
-- TOC entry 5361 (class 0 OID 0)
-- Dependencies: 224
-- Name: roles_id_rol_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.roles_id_rol_seq OWNED BY general.roles.id_rol;


--
-- TOC entry 231 (class 1259 OID 65681)
-- Name: usuarios; Type: TABLE; Schema: general; Owner: postgres
--

CREATE TABLE general.usuarios (
    id_usu integer NOT NULL,
    username character varying(255) NOT NULL,
    id_rol smallint NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_usu_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE general.usuarios OWNER TO postgres;

--
-- TOC entry 5362 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE usuarios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.usuarios IS 'Tabla para los usuarios del sistema con autentificación';


--
-- TOC entry 5363 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN usuarios.id_usu; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.id_usu IS 'Identificador serializado para el usuario Ej: 1,2,3,4,5';


--
-- TOC entry 5364 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN usuarios.username; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.username IS 'Nombre del usuario';


--
-- TOC entry 5365 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN usuarios.id_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.id_rol IS 'Identificador del rol de usuario como entero';


--
-- TOC entry 5366 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN usuarios.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.estatus IS 'Columna para borrado lógico en el que: A => Activo, I => Inactivo';


--
-- TOC entry 5367 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN usuarios.creado; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.creado IS 'Fecha y hora en la que el usuario fue registrado en el sistema.';


--
-- TOC entry 5368 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN usuarios.actualizar; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.actualizar IS 'Columna para averiguar en que momento actualizaron al usuario';


--
-- TOC entry 5369 (class 0 OID 0)
-- Dependencies: 231
-- Name: CONSTRAINT chk_usu_est ON usuarios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_usu_est ON general.usuarios IS 'Regla para revisar el estado del usuario Activo o Inactivo';


--
-- TOC entry 230 (class 1259 OID 65680)
-- Name: usuarios_id_usu_seq; Type: SEQUENCE; Schema: general; Owner: postgres
--

CREATE SEQUENCE general.usuarios_id_usu_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE general.usuarios_id_usu_seq OWNER TO postgres;

--
-- TOC entry 5370 (class 0 OID 0)
-- Dependencies: 230
-- Name: usuarios_id_usu_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.usuarios_id_usu_seq OWNED BY general.usuarios.id_usu;


--
-- TOC entry 262 (class 1259 OID 82014)
-- Name: vw_auditoria_legible; Type: VIEW; Schema: general; Owner: postgres
--

CREATE VIEW general.vw_auditoria_legible AS
 SELECT am.id_aud,
    am.fec_hor AS fecha_hora,
    COALESCE(u.username, 'Sistema/Script'::character varying) AS usuario,
    am.tabla_mod AS tabla_afectada,
    am.accion,
        CASE
            WHEN ((am.tabla_mod)::text = 'docentes'::text) THEN COALESCE((am.val_despues ->> 'cedula'::text), (am.val_antes ->> 'cedula'::text))
            WHEN ((am.tabla_mod)::text = 'asig_carga_horarias'::text) THEN concat('DocID:', COALESCE((am.val_despues ->> 'id_doc'::text), (am.val_antes ->> 'id_doc'::text)), ' | Día:', COALESCE((am.val_despues ->> 'id_dia'::text), (am.val_antes ->> 'id_dia'::text)))
            WHEN ((am.tabla_mod)::text = 'espacios_fis'::text) THEN COALESCE((am.val_despues ->> 'ubicacion'::text), (am.val_antes ->> 'ubicacion'::text))
            ELSE 'Ver detalle JSON'::text
        END AS registro_identificador,
        CASE
            WHEN ((am.accion)::text = 'UPDATE'::text) THEN 'Ver columnas modificadas en val_antes/val_despues'::text
            ELSE 'N/A'::text
        END AS resumen_cambio,
    am.dir_ip AS ip_origen
   FROM (general.aud_mov am
     LEFT JOIN general.usuarios u ON ((am.id_usu = u.id_usu)))
  ORDER BY am.fec_hor DESC;


ALTER VIEW general.vw_auditoria_legible OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 65855)
-- Name: asig_carga_horarias; Type: TABLE; Schema: horarios; Owner: postgres
--

CREATE TABLE horarios.asig_carga_horarias (
    id_asig integer NOT NULL,
    id_doc integer,
    id_esp integer,
    id_dia smallint NOT NULL,
    id_bloq smallint,
    id_malla integer,
    id_per integer,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    tipo_actividad character varying(20) DEFAULT 'Carga Académica'::character varying,
    observaciones text,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_asig_actividad CHECK (((tipo_actividad)::text = ANY ((ARRAY['Carga Académica'::character varying, 'Asesoría'::character varying, 'Preparación'::character varying])::text[]))),
    CONSTRAINT chk_asig_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar]))),
    CONSTRAINT chk_asig_horario CHECK ((hora_inicio < hora_fin))
);


ALTER TABLE horarios.asig_carga_horarias OWNER TO postgres;

--
-- TOC entry 5371 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON TABLE horarios.asig_carga_horarias IS 'Tabla para la Asignación de carga horaria: qué docente, en qué espacio, qué día y a qué hora';


--
-- TOC entry 5372 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.id_asig; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_asig IS 'Identificador único de la asignación de horario';


--
-- TOC entry 5373 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.id_doc; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_doc IS 'Identificador como entero del docente asignado';


--
-- TOC entry 5374 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.id_esp; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_esp IS 'Identificador entero del espacio físico asignado';


--
-- TOC entry 5375 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.id_dia; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_dia IS 'Identificador del día de la semana';


--
-- TOC entry 5376 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.id_bloq; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_bloq IS 'Identificador del bloque horario';


--
-- TOC entry 5377 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.id_malla; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_malla IS 'Identificador de la malla curricular (materia específica)';


--
-- TOC entry 5378 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.id_per; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_per IS 'Identificador del período académico';


--
-- TOC entry 5379 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.hora_inicio; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.hora_inicio IS 'Hora exacta de inicio de la clase';


--
-- TOC entry 5380 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.hora_fin; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.hora_fin IS 'Hora exacta de fin de la clase';


--
-- TOC entry 5381 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.tipo_actividad; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.tipo_actividad IS 'Tipode actividad: Carga Académica, Asesoría, Preparación';


--
-- TOC entry 5382 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.observaciones; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.observaciones IS 'Notas adicionales sobre la asignación';


--
-- TOC entry 5383 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.estatus; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.estatus IS 'Estado de borrado: A = Activo, I = Inactivo';


--
-- TOC entry 5384 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.creado; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.creado IS 'Fecha y hora exacta en la que se registró o creó la asignación de la carga horaria en el sistema.';


--
-- TOC entry 5385 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN asig_carga_horarias.actualizar; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.actualizar IS 'Fecha y hora de la última modificación o actualización realizada al registro de la asignación.';


--
-- TOC entry 5386 (class 0 OID 0)
-- Dependencies: 247
-- Name: CONSTRAINT chk_asig_actividad ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT chk_asig_actividad ON horarios.asig_carga_horarias IS 'Restricción que valida que el tipo de actividad asignada corresponda a los valores permitidos del catálogo de actividades (ej. docencia, investigación, tutoría).';


--
-- TOC entry 5387 (class 0 OID 0)
-- Dependencies: 247
-- Name: CONSTRAINT chk_asig_est ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT chk_asig_est ON horarios.asig_carga_horarias IS 'Restricción que valida el estado de la asignación, asegurando que solo admita valores permitidos (por ejemplo: Activo, Inactivo, Suspendido).';


--
-- TOC entry 5388 (class 0 OID 0)
-- Dependencies: 247
-- Name: CONSTRAINT chk_asig_horario ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT chk_asig_horario ON horarios.asig_carga_horarias IS 'Restricción que garantiza la coherencia lógica de las horas establecidas en la asignación (ej. que la hora de inicio sea estrictamente anterior a la hora de fin).';


--
-- TOC entry 246 (class 1259 OID 65854)
-- Name: asig_carga_horarias_id_asig_seq; Type: SEQUENCE; Schema: horarios; Owner: postgres
--

CREATE SEQUENCE horarios.asig_carga_horarias_id_asig_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE horarios.asig_carga_horarias_id_asig_seq OWNER TO postgres;

--
-- TOC entry 5389 (class 0 OID 0)
-- Dependencies: 246
-- Name: asig_carga_horarias_id_asig_seq; Type: SEQUENCE OWNED BY; Schema: horarios; Owner: postgres
--

ALTER SEQUENCE horarios.asig_carga_horarias_id_asig_seq OWNED BY horarios.asig_carga_horarias.id_asig;


--
-- TOC entry 245 (class 1259 OID 65838)
-- Name: bloques_horarios; Type: TABLE; Schema: horarios; Owner: postgres
--

CREATE TABLE horarios.bloques_horarios (
    id_bloq smallint NOT NULL,
    nombre character varying(50) NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    tipo character varying(20) NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    CONSTRAINT chk_bloques_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar]))),
    CONSTRAINT chk_bloques_horario CHECK ((hora_inicio < hora_fin)),
    CONSTRAINT chk_bloques_tipo CHECK (((tipo)::text = ANY ((ARRAY['Académico'::character varying, 'Almuerzo'::character varying, 'Asesoría'::character varying, 'Preparación'::character varying])::text[])))
);


ALTER TABLE horarios.bloques_horarios OWNER TO postgres;

--
-- TOC entry 5390 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE bloques_horarios; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON TABLE horarios.bloques_horarios IS 'Tabla para los Bloques de horario establecidos por la universidad';


--
-- TOC entry 5391 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN bloques_horarios.id_bloq; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.bloques_horarios.id_bloq IS 'Identificador único del bloque horario Ej:1,2,3,4,5';


--
-- TOC entry 5392 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN bloques_horarios.nombre; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.bloques_horarios.nombre IS 'Nombre descriptivo del bloque Ej: Blque Mañana';


--
-- TOC entry 5393 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN bloques_horarios.hora_inicio; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.bloques_horarios.hora_inicio IS 'Hora en la que inicia el bloque';


--
-- TOC entry 5394 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN bloques_horarios.hora_fin; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.bloques_horarios.hora_fin IS 'Hora de fin del bloque';


--
-- TOC entry 5395 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN bloques_horarios.tipo; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.bloques_horarios.tipo IS 'Tipo de bloque: Académico, Almuerzo, Asesoría o Preparación';


--
-- TOC entry 5396 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN bloques_horarios.estatus; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.bloques_horarios.estatus IS 'Borrado lógico del bloque: A = Activo, I = Inactivo';


--
-- TOC entry 5397 (class 0 OID 0)
-- Dependencies: 245
-- Name: CONSTRAINT chk_bloques_tipo ON bloques_horarios; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT chk_bloques_tipo ON horarios.bloques_horarios IS 'revisa';


--
-- TOC entry 244 (class 1259 OID 65837)
-- Name: bloques_horarios_id_bloq_seq; Type: SEQUENCE; Schema: horarios; Owner: postgres
--

CREATE SEQUENCE horarios.bloques_horarios_id_bloq_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE horarios.bloques_horarios_id_bloq_seq OWNER TO postgres;

--
-- TOC entry 5398 (class 0 OID 0)
-- Dependencies: 244
-- Name: bloques_horarios_id_bloq_seq; Type: SEQUENCE OWNED BY; Schema: horarios; Owner: postgres
--

ALTER SEQUENCE horarios.bloques_horarios_id_bloq_seq OWNED BY horarios.bloques_horarios.id_bloq;


--
-- TOC entry 243 (class 1259 OID 65809)
-- Name: espacios_fis; Type: TABLE; Schema: infraestructura; Owner: postgres
--

CREATE TABLE infraestructura.espacios_fis (
    id_esp integer NOT NULL,
    id_mun integer NOT NULL,
    nombre_centro character varying(100) DEFAULT 'Escuela Bustamante'::character varying NOT NULL,
    ubicacion character varying(100) NOT NULL,
    tipo_espacio character varying(100) DEFAULT 'Aula'::character varying NOT NULL,
    capacidad smallint DEFAULT 30 NOT NULL,
    equipamiento text,
    disponibilidad boolean DEFAULT true,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_espaciios_tipo CHECK (((tipo_espacio)::text = 'Aula'::text)),
    CONSTRAINT chk_espacios_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE infraestructura.espacios_fis OWNER TO postgres;

--
-- TOC entry 5399 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE espacios_fis; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON TABLE infraestructura.espacios_fis IS 'Tabla para almacenar los espacios físicos de la universidad';


--
-- TOC entry 5400 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN espacios_fis.id_mun; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.id_mun IS 'Identificador como entero del municipio';


--
-- TOC entry 5401 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN espacios_fis.nombre_centro; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.nombre_centro IS 'Nombre de donde estan viendo clases los estudiantes';


--
-- TOC entry 5402 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN espacios_fis.ubicacion; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.ubicacion IS 'Lugar en el que estan';


--
-- TOC entry 5403 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN espacios_fis.tipo_espacio; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.tipo_espacio IS 'Tipo de espacio en el que se encuentran los alumnos';


--
-- TOC entry 5404 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN espacios_fis.capacidad; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.capacidad IS 'Capacidad máxima de las aulas por estudiante';


--
-- TOC entry 5405 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN espacios_fis.equipamiento; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.equipamiento IS 'Espacio para colocar como se encuentra el aula que tienen';


--
-- TOC entry 5406 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN espacios_fis.disponibilidad; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.disponibilidad IS 'Mostar la disponibilidad que tiene el aula como un booleano. Ej: TRUE=> si, FALSE =>no';


--
-- TOC entry 242 (class 1259 OID 65808)
-- Name: espacios_fis_id_esp_seq; Type: SEQUENCE; Schema: infraestructura; Owner: postgres
--

CREATE SEQUENCE infraestructura.espacios_fis_id_esp_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE infraestructura.espacios_fis_id_esp_seq OWNER TO postgres;

--
-- TOC entry 5407 (class 0 OID 0)
-- Dependencies: 242
-- Name: espacios_fis_id_esp_seq; Type: SEQUENCE OWNED BY; Schema: infraestructura; Owner: postgres
--

ALTER SEQUENCE infraestructura.espacios_fis_id_esp_seq OWNED BY infraestructura.espacios_fis.id_esp;


--
-- TOC entry 241 (class 1259 OID 65788)
-- Name: disponibilidad_docente; Type: TABLE; Schema: personas; Owner: postgres
--

CREATE TABLE personas.disponibilidad_docente (
    id_disp integer NOT NULL,
    id_doc integer NOT NULL,
    id_dia smallint NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    CONSTRAINT chk_disp_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar]))),
    CONSTRAINT chk_disp_horarios CHECK ((hora_inicio < hora_fin))
);


ALTER TABLE personas.disponibilidad_docente OWNER TO postgres;

--
-- TOC entry 5408 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE disponibilidad_docente; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON TABLE personas.disponibilidad_docente IS 'Tabla para ver la disponibilidad de los docentes';


--
-- TOC entry 5409 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN disponibilidad_docente.id_disp; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.disponibilidad_docente.id_disp IS 'Identificador serializado de la disponibilidad para os docentes.Ej:1,2,3,4,5,';


--
-- TOC entry 5410 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN disponibilidad_docente.id_doc; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.disponibilidad_docente.id_doc IS 'Identificador entero del docente como un entero';


--
-- TOC entry 5411 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN disponibilidad_docente.id_dia; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.disponibilidad_docente.id_dia IS 'Identificador del dia';


--
-- TOC entry 5412 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN disponibilidad_docente.hora_inicio; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.disponibilidad_docente.hora_inicio IS 'Hora en la que inicia el ciclo';


--
-- TOC entry 5413 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN disponibilidad_docente.hora_fin; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.disponibilidad_docente.hora_fin IS 'Hora de fin';


--
-- TOC entry 5414 (class 0 OID 0)
-- Dependencies: 241
-- Name: CONSTRAINT chk_disp_est ON disponibilidad_docente; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_disp_est ON personas.disponibilidad_docente IS 'Revisa el estado de la disponibilidad';


--
-- TOC entry 5415 (class 0 OID 0)
-- Dependencies: 241
-- Name: CONSTRAINT chk_disp_horarios ON disponibilidad_docente; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_disp_horarios ON personas.disponibilidad_docente IS 'revisa las horas';


--
-- TOC entry 240 (class 1259 OID 65787)
-- Name: disponibilidad_docente_id_disp_seq; Type: SEQUENCE; Schema: personas; Owner: postgres
--

CREATE SEQUENCE personas.disponibilidad_docente_id_disp_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE personas.disponibilidad_docente_id_disp_seq OWNER TO postgres;

--
-- TOC entry 5416 (class 0 OID 0)
-- Dependencies: 240
-- Name: disponibilidad_docente_id_disp_seq; Type: SEQUENCE OWNED BY; Schema: personas; Owner: postgres
--

ALTER SEQUENCE personas.disponibilidad_docente_id_disp_seq OWNED BY personas.disponibilidad_docente.id_disp;


--
-- TOC entry 237 (class 1259 OID 65728)
-- Name: docentes; Type: TABLE; Schema: personas; Owner: postgres
--

CREATE TABLE personas.docentes (
    id_doc integer NOT NULL,
    id_usu integer,
    cedula character varying(20) NOT NULL,
    nombre character varying(150) NOT NULL,
    apellido character varying(150) NOT NULL,
    id_mun integer NOT NULL,
    especialidad character varying(150) NOT NULL,
    tipo_contrato character varying(20) DEFAULT 'Estipendio'::character varying NOT NULL,
    horas_max_sem smallint DEFAULT 20 NOT NULL,
    horas_asignadas smallint DEFAULT 0 NOT NULL,
    horas_disponibles smallint DEFAULT 0 NOT NULL,
    telefono character varying(20),
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_docentes_contrato CHECK (((tipo_contrato)::text = ANY ((ARRAY['Estipendio'::character varying, 'Contratado'::character varying])::text[]))),
    CONSTRAINT chk_docentes_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar]))),
    CONSTRAINT chk_docentes_horas CHECK ((horas_asignadas <= horas_max_sem))
);


ALTER TABLE personas.docentes OWNER TO postgres;

--
-- TOC entry 5417 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON TABLE personas.docentes IS 'Tabla en la qe se almacenan los docentes de la universidad';


--
-- TOC entry 5418 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN docentes.id_doc; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.id_doc IS 'Identificador serializado de los docentes, Ej:1,2,3,4';


--
-- TOC entry 5419 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN docentes.id_usu; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.id_usu IS 'identificador entero del usuario del docente';


--
-- TOC entry 5420 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN docentes.cedula; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.cedula IS 'Cedula de identidad del docente';


--
-- TOC entry 5421 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN docentes.nombre; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.nombre IS 'Nombre del docente';


--
-- TOC entry 5422 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN docentes.apellido; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.apellido IS 'Apellido del docente';


--
-- TOC entry 5423 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN docentes.id_mun; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.id_mun IS 'Identificador entero del municipio en el que se encuentra el docente';


--
-- TOC entry 5424 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN docentes.tipo_contrato; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.tipo_contrato IS 'Tipo de contrato que tiene el docente';


--
-- TOC entry 5425 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN docentes.horas_max_sem; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.horas_max_sem IS 'Horas máximas del docente a la semana';


--
-- TOC entry 5426 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN docentes.horas_asignadas; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.horas_asignadas IS 'Horas asignadas al docente';


--
-- TOC entry 5427 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN docentes.horas_disponibles; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.horas_disponibles IS 'Horas disponibles del docente a la semana';


--
-- TOC entry 5428 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN docentes.telefono; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.telefono IS 'Telefono cellular del docente';


--
-- TOC entry 5429 (class 0 OID 0)
-- Dependencies: 237
-- Name: CONSTRAINT chk_docentes_contrato ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_docentes_contrato ON personas.docentes IS 'Revisa el tipo de contrato que tiene el docente';


--
-- TOC entry 5430 (class 0 OID 0)
-- Dependencies: 237
-- Name: CONSTRAINT chk_docentes_est ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_docentes_est ON personas.docentes IS 'Chequea si el estado del docente es activo o inactivo';


--
-- TOC entry 5431 (class 0 OID 0)
-- Dependencies: 237
-- Name: CONSTRAINT chk_docentes_horas ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_docentes_horas ON personas.docentes IS 'Revisa las horas asiganadas al docente';


--
-- TOC entry 236 (class 1259 OID 65727)
-- Name: docentes_id_doc_seq; Type: SEQUENCE; Schema: personas; Owner: postgres
--

CREATE SEQUENCE personas.docentes_id_doc_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE personas.docentes_id_doc_seq OWNER TO postgres;

--
-- TOC entry 5432 (class 0 OID 0)
-- Dependencies: 236
-- Name: docentes_id_doc_seq; Type: SEQUENCE OWNED BY; Schema: personas; Owner: postgres
--

ALTER SEQUENCE personas.docentes_id_doc_seq OWNED BY personas.docentes.id_doc;


--
-- TOC entry 239 (class 1259 OID 65764)
-- Name: estudiantes; Type: TABLE; Schema: personas; Owner: postgres
--

CREATE TABLE personas.estudiantes (
    id_est integer NOT NULL,
    id_usu integer,
    cedula character varying(20) NOT NULL,
    id_mun integer NOT NULL,
    nombre character varying(150) NOT NULL,
    apellido character varying(150) NOT NULL,
    id_pro integer,
    id_sec integer,
    trayecto smallint NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_estudiantes_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE personas.estudiantes OWNER TO postgres;

--
-- TOC entry 5433 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON TABLE personas.estudiantes IS 'Tabla para almacenar la información de los estudiantes';


--
-- TOC entry 5434 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN estudiantes.id_est; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.id_est IS 'identificador serializado de los estudiantes. Ej:1,2,3,4,5';


--
-- TOC entry 5435 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN estudiantes.id_usu; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.id_usu IS 'Identificador del usuario como entero';


--
-- TOC entry 5436 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN estudiantes.cedula; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.cedula IS 'cedula de identidad del estudiante';


--
-- TOC entry 5437 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN estudiantes.id_mun; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.id_mun IS 'Identificador del municipio como entero';


--
-- TOC entry 5438 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN estudiantes.id_pro; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.id_pro IS 'Identificador entero de los programas academicos';


--
-- TOC entry 5439 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN estudiantes.id_sec; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.id_sec IS 'Identificador entero de las secciones';


--
-- TOC entry 5440 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN estudiantes.trayecto; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.trayecto IS 'Trayecto en el que se encuentra el estudiante';


--
-- TOC entry 5441 (class 0 OID 0)
-- Dependencies: 239
-- Name: CONSTRAINT chk_estudiantes_est ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_estudiantes_est ON personas.estudiantes IS 'revisa si el estatus del estudiantes es activo o inactivo';


--
-- TOC entry 238 (class 1259 OID 65763)
-- Name: estudiantes_id_est_seq; Type: SEQUENCE; Schema: personas; Owner: postgres
--

CREATE SEQUENCE personas.estudiantes_id_est_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE personas.estudiantes_id_est_seq OWNER TO postgres;

--
-- TOC entry 5442 (class 0 OID 0)
-- Dependencies: 238
-- Name: estudiantes_id_est_seq; Type: SEQUENCE OWNED BY; Schema: personas; Owner: postgres
--

ALTER SEQUENCE personas.estudiantes_id_est_seq OWNED BY personas.estudiantes.id_est;


--
-- TOC entry 261 (class 1259 OID 66163)
-- Name: vw_docentes_por_programa_municipio; Type: VIEW; Schema: personas; Owner: postgres
--

CREATE VIEW personas.vw_docentes_por_programa_municipio AS
 SELECT m.nombre AS municipio,
    p.codigo AS cod_programa,
    p.nombre AS programa,
    count(DISTINCT d.id_doc) AS total_docentes,
    sum(d.horas_asignadas) AS total_horas_asignadas,
    sum(d.horas_disponibles) AS total_horas_disponibles
   FROM ((((personas.docentes d
     JOIN general.municipios m ON ((d.id_mun = m.id_mun)))
     JOIN horarios.asig_carga_horarias a ON ((d.id_doc = a.id_doc)))
     JOIN academico.malla_curricular mc ON ((a.id_malla = mc.id_malla)))
     JOIN academico.programas p ON ((mc.id_pro = p.id_pro)))
  WHERE ((d.estatus = 'A'::bpchar) AND (a.estatus = 'A'::bpchar))
  GROUP BY m.nombre, p.codigo, p.nombre;


ALTER VIEW personas.vw_docentes_por_programa_municipio OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 66158)
-- Name: vw_horario_completo_docente; Type: VIEW; Schema: personas; Owner: postgres
--

CREATE VIEW personas.vw_horario_completo_docente AS
 SELECT d.cedula,
    (((d.nombre)::text || ' '::text) || (d.apellido)::text) AS nombre_completo_docente,
    d.tipo_contrato,
    p.codigo AS cod_programa,
    p.nombre AS programa,
    m.codigo AS cod_materia,
    m.nombre AS materia,
    m.unidades_creditos AS uc,
    eje.codigo AS cod_eje,
    eje.nombre AS eje_formativo,
    pa.nombre AS periodo_academico,
    dl.dia,
    bh.nombre AS bloque,
    a.hora_inicio,
    a.hora_fin,
    esp.ubicacion AS espacio_fisico,
    esp.nombre_centro,
    a.tipo_actividad
   FROM (((((((((personas.docentes d
     JOIN horarios.asig_carga_horarias a ON ((d.id_doc = a.id_doc)))
     JOIN academico.malla_curricular mc ON ((a.id_malla = mc.id_malla)))
     JOIN academico.materias m ON ((mc.id_mat = m.id_mat)))
     JOIN academico.ejes_formativos eje ON ((m.id_eje = eje.id_eje)))
     JOIN academico.programas p ON ((mc.id_pro = p.id_pro)))
     JOIN academico.periodos_academicos pa ON ((a.id_per = pa.id_per)))
     JOIN general.dias_laborales dl ON ((a.id_dia = dl.id_dia)))
     LEFT JOIN horarios.bloques_horarios bh ON ((a.id_bloq = bh.id_bloq)))
     LEFT JOIN infraestructura.espacios_fis esp ON ((a.id_esp = esp.id_esp)))
  WHERE ((d.estatus = 'A'::bpchar) AND (a.estatus = 'A'::bpchar));


ALTER VIEW personas.vw_horario_completo_docente OWNER TO postgres;

--
-- TOC entry 4908 (class 2604 OID 65918)
-- Name: ejes_formativos id_eje; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.ejes_formativos ALTER COLUMN id_eje SET DEFAULT nextval('academico.ejes_formativos_id_eje_seq'::regclass);


--
-- TOC entry 4914 (class 2604 OID 65957)
-- Name: malla_curricular id_malla; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.malla_curricular ALTER COLUMN id_malla SET DEFAULT nextval('academico.malla_curricular_id_malla_seq'::regclass);


--
-- TOC entry 4910 (class 2604 OID 65934)
-- Name: materias id_mat; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.materias ALTER COLUMN id_mat SET DEFAULT nextval('academico.materias_id_mat_seq'::regclass);


--
-- TOC entry 4919 (class 2604 OID 65980)
-- Name: periodos_academicos id_per; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.periodos_academicos ALTER COLUMN id_per SET DEFAULT nextval('academico.periodos_academicos_id_per_seq'::regclass);


--
-- TOC entry 4904 (class 2604 OID 65893)
-- Name: programas id_pro; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.programas ALTER COLUMN id_pro SET DEFAULT nextval('academico.programas_id_pro_seq'::regclass);


--
-- TOC entry 4924 (class 2604 OID 66006)
-- Name: secciones id_sec; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.secciones ALTER COLUMN id_sec SET DEFAULT nextval('academico.secciones_id_sec_seq'::regclass);


--
-- TOC entry 4872 (class 2604 OID 65714)
-- Name: aud_mov id_aud; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.aud_mov ALTER COLUMN id_aud SET DEFAULT nextval('general.aud_mov_id_aud_seq'::regclass);


--
-- TOC entry 4870 (class 2604 OID 65701)
-- Name: credenciales id_cre; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.credenciales ALTER COLUMN id_cre SET DEFAULT nextval('general.credenciales_id_cre_seq'::regclass);


--
-- TOC entry 4864 (class 2604 OID 65669)
-- Name: dias_laborales id_dia; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.dias_laborales ALTER COLUMN id_dia SET DEFAULT nextval('general.dias_laborales_id_dia_seq'::regclass);


--
-- TOC entry 4862 (class 2604 OID 65655)
-- Name: municipios id_mun; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.municipios ALTER COLUMN id_mun SET DEFAULT nextval('general.municipios_id_mun_seq'::regclass);


--
-- TOC entry 4860 (class 2604 OID 65640)
-- Name: roles id_rol; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.roles ALTER COLUMN id_rol SET DEFAULT nextval('general.roles_id_rol_seq'::regclass);


--
-- TOC entry 4866 (class 2604 OID 65684)
-- Name: usuarios id_usu; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.usuarios ALTER COLUMN id_usu SET DEFAULT nextval('general.usuarios_id_usu_seq'::regclass);


--
-- TOC entry 4899 (class 2604 OID 65858)
-- Name: asig_carga_horarias id_asig; Type: DEFAULT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias ALTER COLUMN id_asig SET DEFAULT nextval('horarios.asig_carga_horarias_id_asig_seq'::regclass);


--
-- TOC entry 4897 (class 2604 OID 65841)
-- Name: bloques_horarios id_bloq; Type: DEFAULT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.bloques_horarios ALTER COLUMN id_bloq SET DEFAULT nextval('horarios.bloques_horarios_id_bloq_seq'::regclass);


--
-- TOC entry 4889 (class 2604 OID 65812)
-- Name: espacios_fis id_esp; Type: DEFAULT; Schema: infraestructura; Owner: postgres
--

ALTER TABLE ONLY infraestructura.espacios_fis ALTER COLUMN id_esp SET DEFAULT nextval('infraestructura.espacios_fis_id_esp_seq'::regclass);


--
-- TOC entry 4887 (class 2604 OID 65791)
-- Name: disponibilidad_docente id_disp; Type: DEFAULT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.disponibilidad_docente ALTER COLUMN id_disp SET DEFAULT nextval('personas.disponibilidad_docente_id_disp_seq'::regclass);


--
-- TOC entry 4875 (class 2604 OID 65731)
-- Name: docentes id_doc; Type: DEFAULT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.docentes ALTER COLUMN id_doc SET DEFAULT nextval('personas.docentes_id_doc_seq'::regclass);


--
-- TOC entry 4883 (class 2604 OID 65767)
-- Name: estudiantes id_est; Type: DEFAULT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes ALTER COLUMN id_est SET DEFAULT nextval('personas.estudiantes_id_est_seq'::regclass);


--
-- TOC entry 5022 (class 2606 OID 65927)
-- Name: ejes_formativos pk_ejes; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.ejes_formativos
    ADD CONSTRAINT pk_ejes PRIMARY KEY (id_eje);


--
-- TOC entry 5443 (class 0 OID 0)
-- Dependencies: 5022
-- Name: CONSTRAINT pk_ejes ON ejes_formativos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_ejes ON academico.ejes_formativos IS 'Llave primaria para el identificador único del eje formativo.';


--
-- TOC entry 5035 (class 2606 OID 65975)
-- Name: malla_curricular pk_malla; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.malla_curricular
    ADD CONSTRAINT pk_malla PRIMARY KEY (id_malla);


--
-- TOC entry 5444 (class 0 OID 0)
-- Dependencies: 5035
-- Name: CONSTRAINT pk_malla ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_malla ON academico.malla_curricular IS 'Llave primaria de la tabla malla_curricular.';


--
-- TOC entry 5028 (class 2606 OID 65950)
-- Name: materias pk_materias; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.materias
    ADD CONSTRAINT pk_materias PRIMARY KEY (id_mat);


--
-- TOC entry 5445 (class 0 OID 0)
-- Dependencies: 5028
-- Name: CONSTRAINT pk_materias ON materias; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_materias ON academico.materias IS 'Llave primaria para identificar de forma única cada materia.';


--
-- TOC entry 5038 (class 2606 OID 66001)
-- Name: periodos_academicos pk_periodos; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.periodos_academicos
    ADD CONSTRAINT pk_periodos PRIMARY KEY (id_per);


--
-- TOC entry 5446 (class 0 OID 0)
-- Dependencies: 5038
-- Name: CONSTRAINT pk_periodos ON periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_periodos ON academico.periodos_academicos IS 'Llave primaria de la tabla periodos_academicos.';


--
-- TOC entry 5018 (class 2606 OID 65911)
-- Name: programas pk_programas; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.programas
    ADD CONSTRAINT pk_programas PRIMARY KEY (id_pro);


--
-- TOC entry 5447 (class 0 OID 0)
-- Dependencies: 5018
-- Name: CONSTRAINT pk_programas ON programas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_programas ON academico.programas IS 'Llave primaria del catálogo de programas académicos.';


--
-- TOC entry 5041 (class 2606 OID 66025)
-- Name: secciones pk_secciones; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.secciones
    ADD CONSTRAINT pk_secciones PRIMARY KEY (id_sec);


--
-- TOC entry 5448 (class 0 OID 0)
-- Dependencies: 5041
-- Name: CONSTRAINT pk_secciones ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_secciones ON academico.secciones IS 'Llave primaria de la tabla de secciones.';


--
-- TOC entry 5024 (class 2606 OID 65929)
-- Name: ejes_formativos unq_ejes_codigo; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.ejes_formativos
    ADD CONSTRAINT unq_ejes_codigo UNIQUE (codigo);


--
-- TOC entry 5449 (class 0 OID 0)
-- Dependencies: 5024
-- Name: CONSTRAINT unq_ejes_codigo ON ejes_formativos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT unq_ejes_codigo ON academico.ejes_formativos IS 'Regla de unicidad para garantizar que ningún código de eje se repita.';


--
-- TOC entry 5030 (class 2606 OID 65952)
-- Name: materias unq_materias_codigo; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.materias
    ADD CONSTRAINT unq_materias_codigo UNIQUE (codigo);


--
-- TOC entry 5450 (class 0 OID 0)
-- Dependencies: 5030
-- Name: CONSTRAINT unq_materias_codigo ON materias; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT unq_materias_codigo ON academico.materias IS 'Regla que impide registrar dos materias con el mismo código.';


--
-- TOC entry 5020 (class 2606 OID 65913)
-- Name: programas unq_programas_codigo; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.programas
    ADD CONSTRAINT unq_programas_codigo UNIQUE (codigo);


--
-- TOC entry 5451 (class 0 OID 0)
-- Dependencies: 5020
-- Name: CONSTRAINT unq_programas_codigo ON programas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT unq_programas_codigo ON academico.programas IS 'Regla de base de datos que prohíbe códigos de programa duplicados.';


--
-- TOC entry 5043 (class 2606 OID 66027)
-- Name: secciones unq_secciones_codigo; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.secciones
    ADD CONSTRAINT unq_secciones_codigo UNIQUE (codigo);


--
-- TOC entry 5452 (class 0 OID 0)
-- Dependencies: 5043
-- Name: CONSTRAINT unq_secciones_codigo ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT unq_secciones_codigo ON academico.secciones IS 'Evita la creación de dos secciones con el mismo código exacto.';


--
-- TOC entry 4970 (class 2606 OID 65679)
-- Name: dias_laborales dia_lab_unq; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.dias_laborales
    ADD CONSTRAINT dia_lab_unq UNIQUE (dia);


--
-- TOC entry 5453 (class 0 OID 0)
-- Dependencies: 4970
-- Name: CONSTRAINT dia_lab_unq ON dias_laborales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT dia_lab_unq ON general.dias_laborales IS 'Comprobación única para que no se repitan los días';


--
-- TOC entry 4976 (class 2606 OID 65709)
-- Name: credenciales id_usu_unq; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.credenciales
    ADD CONSTRAINT id_usu_unq UNIQUE (id_usu);


--
-- TOC entry 5454 (class 0 OID 0)
-- Dependencies: 4976
-- Name: CONSTRAINT id_usu_unq ON credenciales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT id_usu_unq ON general.credenciales IS 'Regla para que el identificador del usuario sea único';


--
-- TOC entry 4966 (class 2606 OID 65664)
-- Name: municipios mun_nom; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.municipios
    ADD CONSTRAINT mun_nom UNIQUE (nombre);


--
-- TOC entry 5455 (class 0 OID 0)
-- Dependencies: 4966
-- Name: CONSTRAINT mun_nom ON municipios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT mun_nom ON general.municipios IS 'Regla que hace unico cadaa nombre del municipio para que no se repitan';


--
-- TOC entry 4972 (class 2606 OID 65677)
-- Name: dias_laborales pk_id; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.dias_laborales
    ADD CONSTRAINT pk_id PRIMARY KEY (id_dia);


--
-- TOC entry 5456 (class 0 OID 0)
-- Dependencies: 4972
-- Name: CONSTRAINT pk_id ON dias_laborales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_id ON general.dias_laborales IS 'Llave primaria del Identificador';


--
-- TOC entry 4983 (class 2606 OID 65726)
-- Name: aud_mov pk_id_aud; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.aud_mov
    ADD CONSTRAINT pk_id_aud PRIMARY KEY (id_aud);


--
-- TOC entry 5457 (class 0 OID 0)
-- Dependencies: 4983
-- Name: CONSTRAINT pk_id_aud ON aud_mov; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_id_aud ON general.aud_mov IS 'Llave primaria del id serializado de auditoria';


--
-- TOC entry 4978 (class 2606 OID 65707)
-- Name: credenciales pk_id_cre; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.credenciales
    ADD CONSTRAINT pk_id_cre PRIMARY KEY (id_cre);


--
-- TOC entry 5458 (class 0 OID 0)
-- Dependencies: 4978
-- Name: CONSTRAINT pk_id_cre ON credenciales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_id_cre ON general.credenciales IS 'Llave primaria de los identificadores de credenciales';


--
-- TOC entry 4964 (class 2606 OID 65650)
-- Name: roles pk_id_rol; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.roles
    ADD CONSTRAINT pk_id_rol PRIMARY KEY (id_rol);


--
-- TOC entry 5459 (class 0 OID 0)
-- Dependencies: 4964
-- Name: CONSTRAINT pk_id_rol ON roles; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_id_rol ON general.roles IS 'Llave primaria para el identificador del rol';


--
-- TOC entry 4974 (class 2606 OID 65696)
-- Name: usuarios pk_id_usu; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.usuarios
    ADD CONSTRAINT pk_id_usu PRIMARY KEY (id_usu);


--
-- TOC entry 5460 (class 0 OID 0)
-- Dependencies: 4974
-- Name: CONSTRAINT pk_id_usu ON usuarios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_id_usu ON general.usuarios IS 'Llave primaria del identificador de usuario';


--
-- TOC entry 4968 (class 2606 OID 65662)
-- Name: municipios pk_mun; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.municipios
    ADD CONSTRAINT pk_mun PRIMARY KEY (id_mun);


--
-- TOC entry 5461 (class 0 OID 0)
-- Dependencies: 4968
-- Name: CONSTRAINT pk_mun ON municipios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_mun ON general.municipios IS 'Llave primaria del municipio';


--
-- TOC entry 5015 (class 2606 OID 65876)
-- Name: asig_carga_horarias pk_asig; Type: CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT pk_asig PRIMARY KEY (id_asig);


--
-- TOC entry 5462 (class 0 OID 0)
-- Dependencies: 5015
-- Name: CONSTRAINT pk_asig ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT pk_asig ON horarios.asig_carga_horarias IS 'Clave primaria que identifica de manera única e irrepetible cada registro de asignación de carga horaria.';


--
-- TOC entry 5008 (class 2606 OID 65853)
-- Name: bloques_horarios pk_bloques; Type: CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.bloques_horarios
    ADD CONSTRAINT pk_bloques PRIMARY KEY (id_bloq);


--
-- TOC entry 5463 (class 0 OID 0)
-- Dependencies: 5008
-- Name: CONSTRAINT pk_bloques ON bloques_horarios; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT pk_bloques ON horarios.bloques_horarios IS 'Llave primaria para idntificar los bloques de horarios';


--
-- TOC entry 5006 (class 2606 OID 65834)
-- Name: espacios_fis pk_espacios; Type: CONSTRAINT; Schema: infraestructura; Owner: postgres
--

ALTER TABLE ONLY infraestructura.espacios_fis
    ADD CONSTRAINT pk_espacios PRIMARY KEY (id_esp);


--
-- TOC entry 5464 (class 0 OID 0)
-- Dependencies: 5006
-- Name: CONSTRAINT pk_espacios ON espacios_fis; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON CONSTRAINT pk_espacios ON infraestructura.espacios_fis IS 'Llave primaria para identificar los espacios físicos disponibles';


--
-- TOC entry 5002 (class 2606 OID 65802)
-- Name: disponibilidad_docente pk_disponibilidad; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.disponibilidad_docente
    ADD CONSTRAINT pk_disponibilidad PRIMARY KEY (id_disp);


--
-- TOC entry 5465 (class 0 OID 0)
-- Dependencies: 5002
-- Name: CONSTRAINT pk_disponibilidad ON disponibilidad_docente; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT pk_disponibilidad ON personas.disponibilidad_docente IS 'Llave primaria de la disponibilidad de los docentes';


--
-- TOC entry 4995 (class 2606 OID 65782)
-- Name: estudiantes pk_estudiantes; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes
    ADD CONSTRAINT pk_estudiantes PRIMARY KEY (id_est);


--
-- TOC entry 5466 (class 0 OID 0)
-- Dependencies: 4995
-- Name: CONSTRAINT pk_estudiantes ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT pk_estudiantes ON personas.estudiantes IS 'Llave primaria para el identificador de los estudiantes';


--
-- TOC entry 4988 (class 2606 OID 65758)
-- Name: docentes pk_id_docentes; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.docentes
    ADD CONSTRAINT pk_id_docentes PRIMARY KEY (id_doc);


--
-- TOC entry 5467 (class 0 OID 0)
-- Dependencies: 4988
-- Name: CONSTRAINT pk_id_docentes ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT pk_id_docentes ON personas.docentes IS 'Llave primaria del identificador serializado de los docentes';


--
-- TOC entry 4990 (class 2606 OID 65760)
-- Name: docentes unq_docentes_cedula; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.docentes
    ADD CONSTRAINT unq_docentes_cedula UNIQUE (cedula);


--
-- TOC entry 5468 (class 0 OID 0)
-- Dependencies: 4990
-- Name: CONSTRAINT unq_docentes_cedula ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT unq_docentes_cedula ON personas.docentes IS 'Identificar que la cedula del docente sea única';


--
-- TOC entry 4992 (class 2606 OID 65762)
-- Name: docentes unq_docentes_usuario; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.docentes
    ADD CONSTRAINT unq_docentes_usuario UNIQUE (id_usu);


--
-- TOC entry 5469 (class 0 OID 0)
-- Dependencies: 4992
-- Name: CONSTRAINT unq_docentes_usuario ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT unq_docentes_usuario ON personas.docentes IS 'Identificcar que el identificador del usuario del docente sea único';


--
-- TOC entry 4997 (class 2606 OID 65784)
-- Name: estudiantes unq_estudiantes_cedula; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes
    ADD CONSTRAINT unq_estudiantes_cedula UNIQUE (cedula);


--
-- TOC entry 5470 (class 0 OID 0)
-- Dependencies: 4997
-- Name: CONSTRAINT unq_estudiantes_cedula ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT unq_estudiantes_cedula ON personas.estudiantes IS 'Las cedulas de los estudiantes son únicas';


--
-- TOC entry 4999 (class 2606 OID 65786)
-- Name: estudiantes unq_estudiantes_usuario; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes
    ADD CONSTRAINT unq_estudiantes_usuario UNIQUE (id_usu);


--
-- TOC entry 5471 (class 0 OID 0)
-- Dependencies: 4999
-- Name: CONSTRAINT unq_estudiantes_usuario ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT unq_estudiantes_usuario ON personas.estudiantes IS 'llave única del usuario del estudiante';


--
-- TOC entry 5031 (class 1259 OID 66032)
-- Name: idx_malla_materia; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_malla_materia ON academico.malla_curricular USING btree (id_mat);


--
-- TOC entry 5032 (class 1259 OID 66031)
-- Name: idx_malla_programa; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_malla_programa ON academico.malla_curricular USING btree (id_pro);


--
-- TOC entry 5033 (class 1259 OID 66033)
-- Name: idx_malla_trayecto_periodo; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_malla_trayecto_periodo ON academico.malla_curricular USING btree (trayecto, periodo);


--
-- TOC entry 5025 (class 1259 OID 66029)
-- Name: idx_materias_codigo; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_materias_codigo ON academico.materias USING btree (codigo);


--
-- TOC entry 5026 (class 1259 OID 66030)
-- Name: idx_materias_eje; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_materias_eje ON academico.materias USING btree (id_eje);


--
-- TOC entry 5036 (class 1259 OID 66034)
-- Name: idx_periodos_activo; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_periodos_activo ON academico.periodos_academicos USING btree (activo) WHERE (activo = true);


--
-- TOC entry 5016 (class 1259 OID 66028)
-- Name: idx_programas_codigo; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_programas_codigo ON academico.programas USING btree (codigo);


--
-- TOC entry 5039 (class 1259 OID 66035)
-- Name: idx_secciones_programa; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_secciones_programa ON academico.secciones USING btree (id_pro);


--
-- TOC entry 4979 (class 1259 OID 65884)
-- Name: idx_aud_mov_fecha; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_aud_mov_fecha ON general.aud_mov USING btree (fec_hor);


--
-- TOC entry 5472 (class 0 OID 0)
-- Dependencies: 4979
-- Name: INDEX idx_aud_mov_fecha; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_aud_mov_fecha IS 'Índice para consultar por rango de fechas';


--
-- TOC entry 4980 (class 1259 OID 65883)
-- Name: idx_aud_mov_tabla; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_aud_mov_tabla ON general.aud_mov USING btree (tabla_mod);


--
-- TOC entry 5473 (class 0 OID 0)
-- Dependencies: 4980
-- Name: INDEX idx_aud_mov_tabla; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_aud_mov_tabla IS 'Índice para filtrar por tabla modificada';


--
-- TOC entry 4981 (class 1259 OID 65882)
-- Name: idx_aud_mov_usu; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_aud_mov_usu ON general.aud_mov USING btree (id_usu);


--
-- TOC entry 5474 (class 0 OID 0)
-- Dependencies: 4981
-- Name: INDEX idx_aud_mov_usu; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_aud_mov_usu IS 'Índice para buscar auditoría por usuario';


--
-- TOC entry 5009 (class 1259 OID 65879)
-- Name: idx_asig_dia; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE INDEX idx_asig_dia ON horarios.asig_carga_horarias USING btree (id_dia);


--
-- TOC entry 5010 (class 1259 OID 65877)
-- Name: idx_asig_docente; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE INDEX idx_asig_docente ON horarios.asig_carga_horarias USING btree (id_doc);


--
-- TOC entry 5011 (class 1259 OID 65878)
-- Name: idx_asig_espacio; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE INDEX idx_asig_espacio ON horarios.asig_carga_horarias USING btree (id_esp);


--
-- TOC entry 5012 (class 1259 OID 65880)
-- Name: idx_unq_doc_dia_hora; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE UNIQUE INDEX idx_unq_doc_dia_hora ON horarios.asig_carga_horarias USING btree (id_doc, id_dia, hora_inicio) WHERE ((estatus = 'A'::bpchar) AND (id_doc IS NOT NULL));


--
-- TOC entry 5013 (class 1259 OID 65881)
-- Name: idx_unq_esp_dia_hora; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE UNIQUE INDEX idx_unq_esp_dia_hora ON horarios.asig_carga_horarias USING btree (id_esp, id_dia, hora_inicio) WHERE ((estatus = 'A'::bpchar) AND (id_esp IS NOT NULL));


--
-- TOC entry 5003 (class 1259 OID 65836)
-- Name: idx_espacios_centro; Type: INDEX; Schema: infraestructura; Owner: postgres
--

CREATE INDEX idx_espacios_centro ON infraestructura.espacios_fis USING btree (nombre_centro);


--
-- TOC entry 5004 (class 1259 OID 65835)
-- Name: idx_espacios_municipio; Type: INDEX; Schema: infraestructura; Owner: postgres
--

CREATE INDEX idx_espacios_municipio ON infraestructura.espacios_fis USING btree (id_mun);


--
-- TOC entry 5000 (class 1259 OID 65807)
-- Name: idx_disp_docente_dia; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_disp_docente_dia ON personas.disponibilidad_docente USING btree (id_doc, id_dia);


--
-- TOC entry 4984 (class 1259 OID 65803)
-- Name: idx_docentes_cedulas; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_docentes_cedulas ON personas.docentes USING btree (cedula);


--
-- TOC entry 4985 (class 1259 OID 65805)
-- Name: idx_docentes_contrato; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_docentes_contrato ON personas.docentes USING btree (tipo_contrato);


--
-- TOC entry 4986 (class 1259 OID 65804)
-- Name: idx_docentes_municipio; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_docentes_municipio ON personas.docentes USING btree (id_mun);


--
-- TOC entry 4993 (class 1259 OID 65806)
-- Name: idx_estudiantes_cedula; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_estudiantes_cedula ON personas.estudiantes USING btree (cedula);


--
-- TOC entry 5078 (class 2620 OID 66046)
-- Name: malla_curricular trg_malla_curricular; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_malla_curricular BEFORE UPDATE ON academico.malla_curricular FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5077 (class 2620 OID 66045)
-- Name: materias trg_materias_actualizar; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_materias_actualizar BEFORE UPDATE ON academico.materias FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5079 (class 2620 OID 66047)
-- Name: periodos_academicos trg_periodos_actualizar; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_periodos_actualizar BEFORE UPDATE ON academico.periodos_academicos FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5076 (class 2620 OID 66044)
-- Name: programas trg_programas_actualizar; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_programas_actualizar BEFORE UPDATE ON academico.programas FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5080 (class 2620 OID 66048)
-- Name: secciones trg_secciones_actualizar; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_secciones_actualizar BEFORE UPDATE ON academico.secciones FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5073 (class 2620 OID 66041)
-- Name: asig_carga_horarias trg_asig_actualizar; Type: TRIGGER; Schema: horarios; Owner: postgres
--

CREATE TRIGGER trg_asig_actualizar BEFORE UPDATE ON horarios.asig_carga_horarias FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5074 (class 2620 OID 66037)
-- Name: asig_carga_horarias trg_aud_asig; Type: TRIGGER; Schema: horarios; Owner: postgres
--

CREATE TRIGGER trg_aud_asig AFTER INSERT OR DELETE OR UPDATE ON horarios.asig_carga_horarias FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5072 (class 2620 OID 66043)
-- Name: bloques_horarios trg_bloques_actualizar; Type: TRIGGER; Schema: horarios; Owner: postgres
--

CREATE TRIGGER trg_bloques_actualizar BEFORE UPDATE ON horarios.bloques_horarios FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5075 (class 2620 OID 66157)
-- Name: asig_carga_horarias trg_calcular_horas_docente; Type: TRIGGER; Schema: horarios; Owner: postgres
--

CREATE TRIGGER trg_calcular_horas_docente AFTER INSERT OR DELETE OR UPDATE OF id_doc, hora_inicio, hora_fin, estatus ON horarios.asig_carga_horarias FOR EACH ROW EXECUTE FUNCTION horarios.fn_calcular_horas_docente();


--
-- TOC entry 5070 (class 2620 OID 66038)
-- Name: espacios_fis trg_aud_espacios; Type: TRIGGER; Schema: infraestructura; Owner: postgres
--

CREATE TRIGGER trg_aud_espacios AFTER INSERT OR DELETE OR UPDATE ON infraestructura.espacios_fis FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5071 (class 2620 OID 66042)
-- Name: espacios_fis trg_espacios_actualizar; Type: TRIGGER; Schema: infraestructura; Owner: postgres
--

CREATE TRIGGER trg_espacios_actualizar BEFORE UPDATE ON infraestructura.espacios_fis FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5069 (class 2620 OID 66039)
-- Name: disponibilidad_docente trg_aud_disponibilidad; Type: TRIGGER; Schema: personas; Owner: postgres
--

CREATE TRIGGER trg_aud_disponibilidad AFTER INSERT OR DELETE OR UPDATE ON personas.disponibilidad_docente FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5065 (class 2620 OID 65887)
-- Name: docentes trg_aud_docentes; Type: TRIGGER; Schema: personas; Owner: postgres
--

CREATE TRIGGER trg_aud_docentes AFTER INSERT OR DELETE OR UPDATE ON personas.docentes FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5475 (class 0 OID 0)
-- Dependencies: 5065
-- Name: TRIGGER trg_aud_docentes ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_docentes ON personas.docentes IS 'Trigger de auditoría para docentes';


--
-- TOC entry 5067 (class 2620 OID 66036)
-- Name: estudiantes trg_aud_estudiantes; Type: TRIGGER; Schema: personas; Owner: postgres
--

CREATE TRIGGER trg_aud_estudiantes AFTER INSERT OR DELETE OR UPDATE ON personas.estudiantes FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5066 (class 2620 OID 65888)
-- Name: docentes trg_docentes_actualizar; Type: TRIGGER; Schema: personas; Owner: postgres
--

CREATE TRIGGER trg_docentes_actualizar BEFORE UPDATE ON personas.docentes FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5068 (class 2620 OID 66040)
-- Name: estudiantes trg_estudiantes_actualizar; Type: TRIGGER; Schema: personas; Owner: postgres
--

CREATE TRIGGER trg_estudiantes_actualizar BEFORE UPDATE ON personas.estudiantes FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5061 (class 2606 OID 66139)
-- Name: malla_curricular fk_malla_materia; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.malla_curricular
    ADD CONSTRAINT fk_malla_materia FOREIGN KEY (id_mat) REFERENCES academico.materias(id_mat) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5476 (class 0 OID 0)
-- Dependencies: 5061
-- Name: CONSTRAINT fk_malla_materia ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_malla_materia ON academico.malla_curricular IS 'Llave foránea que relaciona este registro de la malla con la tabla de materias.';


--
-- TOC entry 5062 (class 2606 OID 66144)
-- Name: malla_curricular fk_malla_prerequisito; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.malla_curricular
    ADD CONSTRAINT fk_malla_prerequisito FOREIGN KEY (perequisito_id_mat) REFERENCES academico.materias(id_mat) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5477 (class 0 OID 0)
-- Dependencies: 5062
-- Name: CONSTRAINT fk_malla_prerequisito ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_malla_prerequisito ON academico.malla_curricular IS 'Llave foránea recursiva que relaciona la materia actual con otra materia que es su prerrequisito.';


--
-- TOC entry 5063 (class 2606 OID 66134)
-- Name: malla_curricular fk_malla_programa; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.malla_curricular
    ADD CONSTRAINT fk_malla_programa FOREIGN KEY (id_pro) REFERENCES academico.programas(id_pro) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5478 (class 0 OID 0)
-- Dependencies: 5063
-- Name: CONSTRAINT fk_malla_programa ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_malla_programa ON academico.malla_curricular IS 'Llave foránea que relaciona este registro de la malla con la tabla de programas académicos.';


--
-- TOC entry 5060 (class 2606 OID 66129)
-- Name: materias fk_materias_eje; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.materias
    ADD CONSTRAINT fk_materias_eje FOREIGN KEY (id_eje) REFERENCES academico.ejes_formativos(id_eje) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5479 (class 0 OID 0)
-- Dependencies: 5060
-- Name: CONSTRAINT fk_materias_eje ON materias; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_materias_eje ON academico.materias IS 'Llave foránea que vincula la materia con su respectivo eje formativo.';


--
-- TOC entry 5064 (class 2606 OID 66149)
-- Name: secciones fk_secciones_programa; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.secciones
    ADD CONSTRAINT fk_secciones_programa FOREIGN KEY (id_pro) REFERENCES academico.programas(id_pro) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5480 (class 0 OID 0)
-- Dependencies: 5064
-- Name: CONSTRAINT fk_secciones_programa ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_secciones_programa ON academico.secciones IS 'Llave foránea que relaciona la sección con un programa académico válido.';


--
-- TOC entry 5046 (class 2606 OID 66059)
-- Name: aud_mov fk_aud_mov_usuario; Type: FK CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.aud_mov
    ADD CONSTRAINT fk_aud_mov_usuario FOREIGN KEY (id_usu) REFERENCES general.usuarios(id_usu);


--
-- TOC entry 5481 (class 0 OID 0)
-- Dependencies: 5046
-- Name: CONSTRAINT fk_aud_mov_usuario ON aud_mov; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT fk_aud_mov_usuario ON general.aud_mov IS 'Llave foranea que viene de la tabla usuarios y trae el identificador de usuarios';


--
-- TOC entry 5045 (class 2606 OID 66054)
-- Name: credenciales fk_credendiales_usuario; Type: FK CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.credenciales
    ADD CONSTRAINT fk_credendiales_usuario FOREIGN KEY (id_usu) REFERENCES general.usuarios(id_usu) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5482 (class 0 OID 0)
-- Dependencies: 5045
-- Name: CONSTRAINT fk_credendiales_usuario ON credenciales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT fk_credendiales_usuario ON general.credenciales IS 'Llave foranea del identificador del usuario';


--
-- TOC entry 5044 (class 2606 OID 66049)
-- Name: usuarios fk_rol_id; Type: FK CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.usuarios
    ADD CONSTRAINT fk_rol_id FOREIGN KEY (id_rol) REFERENCES general.roles(id_rol) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5483 (class 0 OID 0)
-- Dependencies: 5044
-- Name: CONSTRAINT fk_rol_id ON usuarios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT fk_rol_id ON general.usuarios IS 'Llave foranea del identificador de los roles';


--
-- TOC entry 5054 (class 2606 OID 66114)
-- Name: asig_carga_horarias fk_asig_bloque; Type: FK CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT fk_asig_bloque FOREIGN KEY (id_bloq) REFERENCES horarios.bloques_horarios(id_bloq) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5484 (class 0 OID 0)
-- Dependencies: 5054
-- Name: CONSTRAINT fk_asig_bloque ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT fk_asig_bloque ON horarios.asig_carga_horarias IS 'Clave foránea que vincula la asignación con un bloque de tiempo predefinido (referencia a la tabla horarios.bloques_horarios).';


--
-- TOC entry 5055 (class 2606 OID 66109)
-- Name: asig_carga_horarias fk_asig_dia; Type: FK CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT fk_asig_dia FOREIGN KEY (id_dia) REFERENCES general.dias_laborales(id_dia) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5485 (class 0 OID 0)
-- Dependencies: 5055
-- Name: CONSTRAINT fk_asig_dia ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT fk_asig_dia ON horarios.asig_carga_horarias IS 'Clave foránea que relaciona la asignación con el día específico de la semana en el que se imparte.';


--
-- TOC entry 5056 (class 2606 OID 66099)
-- Name: asig_carga_horarias fk_asig_docente; Type: FK CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT fk_asig_docente FOREIGN KEY (id_doc) REFERENCES personas.docentes(id_doc) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5486 (class 0 OID 0)
-- Dependencies: 5056
-- Name: CONSTRAINT fk_asig_docente ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT fk_asig_docente ON horarios.asig_carga_horarias IS 'Clave foránea que vincula la asignación de carga horaria con el docente responsable (referencia a la tabla personas.docentes).';


--
-- TOC entry 5057 (class 2606 OID 66104)
-- Name: asig_carga_horarias fk_asig_espacio; Type: FK CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT fk_asig_espacio FOREIGN KEY (id_esp) REFERENCES infraestructura.espacios_fis(id_esp) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5487 (class 0 OID 0)
-- Dependencies: 5057
-- Name: CONSTRAINT fk_asig_espacio ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT fk_asig_espacio ON horarios.asig_carga_horarias IS 'Clave foránea que asocia la asignación con el aula, laboratorio o espacio físico donde se desarrollará la actividad (referencia a la tabla infraestructura.espacios_fis).';


--
-- TOC entry 5058 (class 2606 OID 66119)
-- Name: asig_carga_horarias fk_asig_malla; Type: FK CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT fk_asig_malla FOREIGN KEY (id_malla) REFERENCES academico.malla_curricular(id_malla) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5488 (class 0 OID 0)
-- Dependencies: 5058
-- Name: CONSTRAINT fk_asig_malla ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT fk_asig_malla ON horarios.asig_carga_horarias IS 'Clave foránea que asocia la carga horaria con una asignatura o elemento específico de la malla curricular del estudiante o carrera.';


--
-- TOC entry 5059 (class 2606 OID 66124)
-- Name: asig_carga_horarias fk_asig_periodo; Type: FK CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT fk_asig_periodo FOREIGN KEY (id_per) REFERENCES academico.periodos_academicos(id_per);


--
-- TOC entry 5489 (class 0 OID 0)
-- Dependencies: 5059
-- Name: CONSTRAINT fk_asig_periodo ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT fk_asig_periodo ON horarios.asig_carga_horarias IS 'Clave foránea que relaciona la asignación con el período académico o semestre lectivo correspondiente.';


--
-- TOC entry 5053 (class 2606 OID 66094)
-- Name: espacios_fis fk_espacios_municipio; Type: FK CONSTRAINT; Schema: infraestructura; Owner: postgres
--

ALTER TABLE ONLY infraestructura.espacios_fis
    ADD CONSTRAINT fk_espacios_municipio FOREIGN KEY (id_mun) REFERENCES general.municipios(id_mun) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5490 (class 0 OID 0)
-- Dependencies: 5053
-- Name: CONSTRAINT fk_espacios_municipio ON espacios_fis; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON CONSTRAINT fk_espacios_municipio ON infraestructura.espacios_fis IS 'Llaveforanea que trae el identificador de los municipios';


--
-- TOC entry 5051 (class 2606 OID 66084)
-- Name: disponibilidad_docente fk_dip_docente; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.disponibilidad_docente
    ADD CONSTRAINT fk_dip_docente FOREIGN KEY (id_doc) REFERENCES personas.docentes(id_doc) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5052 (class 2606 OID 66089)
-- Name: disponibilidad_docente fk_disp_dia; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.disponibilidad_docente
    ADD CONSTRAINT fk_disp_dia FOREIGN KEY (id_dia) REFERENCES general.dias_laborales(id_dia) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5047 (class 2606 OID 66064)
-- Name: docentes fk_docentes_usuario; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.docentes
    ADD CONSTRAINT fk_docentes_usuario FOREIGN KEY (id_usu) REFERENCES general.usuarios(id_usu) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5491 (class 0 OID 0)
-- Dependencies: 5047
-- Name: CONSTRAINT fk_docentes_usuario ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT fk_docentes_usuario ON personas.docentes IS 'Llave foranea del identificador del usuario';


--
-- TOC entry 5049 (class 2606 OID 66074)
-- Name: estudiantes fk_estudiante_usuario; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes
    ADD CONSTRAINT fk_estudiante_usuario FOREIGN KEY (id_usu) REFERENCES general.usuarios(id_usu) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5492 (class 0 OID 0)
-- Dependencies: 5049
-- Name: CONSTRAINT fk_estudiante_usuario ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT fk_estudiante_usuario ON personas.estudiantes IS 'Llave foranea del identificador del usuario';


--
-- TOC entry 5050 (class 2606 OID 66079)
-- Name: estudiantes fk_estudiantes_municipio; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes
    ADD CONSTRAINT fk_estudiantes_municipio FOREIGN KEY (id_mun) REFERENCES general.municipios(id_mun);


--
-- TOC entry 5493 (class 0 OID 0)
-- Dependencies: 5050
-- Name: CONSTRAINT fk_estudiantes_municipio ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT fk_estudiantes_municipio ON personas.estudiantes IS 'llave foranea del identificador del municipio';


--
-- TOC entry 5048 (class 2606 OID 66069)
-- Name: docentes fk_id_mun; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.docentes
    ADD CONSTRAINT fk_id_mun FOREIGN KEY (id_mun) REFERENCES general.municipios(id_mun) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5494 (class 0 OID 0)
-- Dependencies: 5048
-- Name: CONSTRAINT fk_id_mun ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT fk_id_mun ON personas.docentes IS 'Llave foranea del identificador del municipio';


-- Completed on 2026-10-08 10:13:25

--
-- PostgreSQL database dump complete
--

\unrestrict 3SLZr5KW0DkQF0rMXgFdP2Dnhmsvhg0yIo79fcajjyAWVmFoQKWiYQPFnWBvaz3

