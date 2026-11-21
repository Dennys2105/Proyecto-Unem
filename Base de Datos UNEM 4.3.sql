--
-- PostgreSQL database dump
--

\restrict g7c4xvRAuuRNAPx9H6hNQsUzSBAL7eFCEFgdPf60FOHyAZ3wSxCfMYft0LjeO1l

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-11-21 09:27:14

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
-- TOC entry 5444 (class 0 OID 0)
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
-- TOC entry 5445 (class 0 OID 0)
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
-- TOC entry 5446 (class 0 OID 0)
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
-- TOC entry 5447 (class 0 OID 0)
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
-- TOC entry 5448 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA personas; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA personas IS 'Esquema para todo lo referente a docentes y estudiantes';


--
-- TOC entry 306 (class 1255 OID 65886)
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
-- TOC entry 5449 (class 0 OID 0)
-- Dependencies: 306
-- Name: FUNCTION f_actualizar_timestamp(); Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON FUNCTION general.f_actualizar_timestamp() IS 'Función para actualizar automáticamente el campo actualizar con CURRENT_TIMESTAMP';


--
-- TOC entry 318 (class 1255 OID 65885)
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
-- TOC entry 5450 (class 0 OID 0)
-- Dependencies: 318
-- Name: FUNCTION fn_auditoria_general(); Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON FUNCTION general.fn_auditoria_general() IS 'Función para registrar automáticamente cambios en la bitácora de auditoría';


--
-- TOC entry 319 (class 1255 OID 66156)
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
-- TOC entry 279 (class 1259 OID 65915)
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
-- TOC entry 5451 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE ejes_formativos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TABLE academico.ejes_formativos IS 'Catálogo de ejes formativos (Proyecto, Socio-crítico, Disciplinario, etc.)';


--
-- TOC entry 5452 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN ejes_formativos.id_eje; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.ejes_formativos.id_eje IS 'Identificador único serializado del eje formativo.';


--
-- TOC entry 5453 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN ejes_formativos.codigo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.ejes_formativos.codigo IS 'Código alfanumérico corto para identificar el eje (Ej: PROY, SOCR).';


--
-- TOC entry 5454 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN ejes_formativos.nombre; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.ejes_formativos.nombre IS 'Nombre completo del eje formativo (Ej: Proyecto, Epistemológico, Socio-crítico).';


--
-- TOC entry 5455 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN ejes_formativos.descripcion; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.ejes_formativos.descripcion IS 'Detalle extendido de los objetivos o enfoque del eje formativo.';


--
-- TOC entry 5456 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN ejes_formativos.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.ejes_formativos.estatus IS 'Indicador de borrado lógico en el sistema (A = Activo, I = Inactivo).';


--
-- TOC entry 5457 (class 0 OID 0)
-- Dependencies: 279
-- Name: CONSTRAINT chk_ejes_est ON ejes_formativos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_ejes_est ON academico.ejes_formativos IS 'Regla de validación para asegurar que el estatus solo sea ''A'' (Activo) o ''I'' (Inactivo).';


--
-- TOC entry 278 (class 1259 OID 65914)
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
-- TOC entry 5458 (class 0 OID 0)
-- Dependencies: 278
-- Name: ejes_formativos_id_eje_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.ejes_formativos_id_eje_seq OWNED BY academico.ejes_formativos.id_eje;


--
-- TOC entry 283 (class 1259 OID 65954)
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
-- TOC entry 5459 (class 0 OID 0)
-- Dependencies: 283
-- Name: TABLE malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TABLE academico.malla_curricular IS 'Pensum académico: define qué materias se cursan en cada trayecto y período';


--
-- TOC entry 5460 (class 0 OID 0)
-- Dependencies: 283
-- Name: COLUMN malla_curricular.id_malla; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.id_malla IS 'Identificador único serializado del registro dentro de la malla.';


--
-- TOC entry 5461 (class 0 OID 0)
-- Dependencies: 283
-- Name: COLUMN malla_curricular.id_pro; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.id_pro IS 'Identificador del programa académico al que pertenece este registro de malla.';


--
-- TOC entry 5462 (class 0 OID 0)
-- Dependencies: 283
-- Name: COLUMN malla_curricular.id_mat; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.id_mat IS 'Identificador de la materia (unidad curricular) asignada a la malla.';


--
-- TOC entry 5463 (class 0 OID 0)
-- Dependencies: 283
-- Name: COLUMN malla_curricular.trayecto; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.trayecto IS 'Número de trayecto (1-4)';


--
-- TOC entry 5464 (class 0 OID 0)
-- Dependencies: 283
-- Name: COLUMN malla_curricular.periodo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.periodo IS 'Número de período dentro del trayecto (1-3 para trimestral, 1-2 para semestral)';


--
-- TOC entry 5465 (class 0 OID 0)
-- Dependencies: 283
-- Name: COLUMN malla_curricular.orden; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.orden IS 'Orden de la materia dentro del período';


--
-- TOC entry 5466 (class 0 OID 0)
-- Dependencies: 283
-- Name: COLUMN malla_curricular.perequisito_id_mat; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.perequisito_id_mat IS 'Materia prerequisito (NULL si no tiene)';


--
-- TOC entry 5467 (class 0 OID 0)
-- Dependencies: 283
-- Name: COLUMN malla_curricular.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5468 (class 0 OID 0)
-- Dependencies: 283
-- Name: COLUMN malla_curricular.creado; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.creado IS 'Fecha y hora exacta de creación de este registro en la malla.';


--
-- TOC entry 5469 (class 0 OID 0)
-- Dependencies: 283
-- Name: COLUMN malla_curricular.actualizar; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.malla_curricular.actualizar IS 'Fecha y hora de la última modificación realizada a este registro.';


--
-- TOC entry 5470 (class 0 OID 0)
-- Dependencies: 283
-- Name: CONSTRAINT chk_malla_est ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_malla_est ON academico.malla_curricular IS 'Valida que el estatus de la materia en la malla sea ''A''=Activo o ''I''=Inactivo.';


--
-- TOC entry 5471 (class 0 OID 0)
-- Dependencies: 283
-- Name: CONSTRAINT chk_malla_periodo ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_malla_periodo ON academico.malla_curricular IS 'Garantiza que el número del período sea un valor positivo mayor a 0.';


--
-- TOC entry 5472 (class 0 OID 0)
-- Dependencies: 283
-- Name: CONSTRAINT chk_malla_trayecto ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_malla_trayecto ON academico.malla_curricular IS 'Garantiza que el número del trayecto sea un valor positivo mayor a 0.';


--
-- TOC entry 282 (class 1259 OID 65953)
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
-- TOC entry 5473 (class 0 OID 0)
-- Dependencies: 282
-- Name: malla_curricular_id_malla_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.malla_curricular_id_malla_seq OWNED BY academico.malla_curricular.id_malla;


--
-- TOC entry 281 (class 1259 OID 65931)
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
-- TOC entry 5474 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE materias; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TABLE academico.materias IS 'Catálogo de unidades curriculares (materias) de todos los programas';


--
-- TOC entry 5475 (class 0 OID 0)
-- Dependencies: 281
-- Name: COLUMN materias.id_mat; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.id_mat IS 'Identificador único serializado de la unidad curricular (materia).';


--
-- TOC entry 5476 (class 0 OID 0)
-- Dependencies: 281
-- Name: COLUMN materias.codigo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.codigo IS 'Código único de la materia (Ej: PRIT1PDC, EDUESPT1PSI1)';


--
-- TOC entry 5477 (class 0 OID 0)
-- Dependencies: 281
-- Name: COLUMN materias.nombre; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.nombre IS 'Nombre completo de la unidad curricular.';


--
-- TOC entry 5478 (class 0 OID 0)
-- Dependencies: 281
-- Name: COLUMN materias.id_eje; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.id_eje IS 'Identificador del eje formativo al que pertenece la materia.';


--
-- TOC entry 5479 (class 0 OID 0)
-- Dependencies: 281
-- Name: COLUMN materias.unidades_creditos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.unidades_creditos IS 'Unidades crédito de la materia';


--
-- TOC entry 5480 (class 0 OID 0)
-- Dependencies: 281
-- Name: COLUMN materias.descripcion; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.descripcion IS 'Sinopsis o resumen del contenido y propósito de la unidad curricular.';


--
-- TOC entry 5481 (class 0 OID 0)
-- Dependencies: 281
-- Name: COLUMN materias.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5482 (class 0 OID 0)
-- Dependencies: 281
-- Name: COLUMN materias.creado; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.creado IS 'Fecha y hora de registro de la materia en el sistema.';


--
-- TOC entry 5483 (class 0 OID 0)
-- Dependencies: 281
-- Name: COLUMN materias.actualizar; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.materias.actualizar IS 'Fecha y hora de la última actualización de los datos de la materia.';


--
-- TOC entry 5484 (class 0 OID 0)
-- Dependencies: 281
-- Name: CONSTRAINT chk_materias_est ON materias; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_materias_est ON academico.materias IS 'Regla para asegurar que la materia solo tenga estatus ''A''=Activo o ''I''=Inactivo.';


--
-- TOC entry 280 (class 1259 OID 65930)
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
-- TOC entry 5485 (class 0 OID 0)
-- Dependencies: 280
-- Name: materias_id_mat_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.materias_id_mat_seq OWNED BY academico.materias.id_mat;


--
-- TOC entry 302 (class 1259 OID 114941)
-- Name: notas; Type: TABLE; Schema: academico; Owner: postgres
--

CREATE TABLE academico.notas (
    id_nota integer NOT NULL,
    id_est integer NOT NULL,
    id_malla integer NOT NULL,
    id_per integer NOT NULL,
    nota numeric(4,2) NOT NULL,
    tipo_evaluacion character varying(30) DEFAULT 'Final'::character varying NOT NULL,
    observaciones text,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_nota_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar]))),
    CONSTRAINT chk_nota_rango CHECK (((nota >= (0)::numeric) AND (nota <= (20)::numeric))),
    CONSTRAINT chk_nota_tipo CHECK (((tipo_evaluacion)::text = ANY ((ARRAY['Parcial 1'::character varying, 'Parcial 2'::character varying, 'Parcial 3'::character varying, 'Final'::character varying, 'Recuperación'::character varying, 'Trabajo'::character varying])::text[])))
);


ALTER TABLE academico.notas OWNER TO postgres;

--
-- TOC entry 5486 (class 0 OID 0)
-- Dependencies: 302
-- Name: TABLE notas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TABLE academico.notas IS 'Registro de calificaciones de estudiantes por materia y período. Base para análisis de datos y reportes académicos. Creada en v3.8.';


--
-- TOC entry 5487 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN notas.id_nota; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.notas.id_nota IS 'Identificador único serializado de la nota.';


--
-- TOC entry 5488 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN notas.id_est; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.notas.id_est IS 'Referencia al estudiante que recibió la calificación.';


--
-- TOC entry 5489 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN notas.id_malla; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.notas.id_malla IS 'Referencia a la materia (malla curricular) evaluada.';


--
-- TOC entry 5490 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN notas.id_per; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.notas.id_per IS 'Referencia al período académico en que se evaluó.';


--
-- TOC entry 5491 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN notas.nota; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.notas.nota IS 'Calificación obtenida en escala 0-20 (sistema venezolano).';


--
-- TOC entry 5492 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN notas.tipo_evaluacion; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.notas.tipo_evaluacion IS 'Tipo de evaluación: Parcial 1, Parcial 2, Parcial 3, Final, Recuperación, Trabajo.';


--
-- TOC entry 5493 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN notas.observaciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.notas.observaciones IS 'Comentarios adicionales sobre la evaluación.';


--
-- TOC entry 5494 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN notas.fecha_registro; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.notas.fecha_registro IS 'Fecha y hora en que se registró la nota.';


--
-- TOC entry 5495 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN notas.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.notas.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5496 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN notas.creado; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.notas.creado IS 'Timestamp de creación del registro.';


--
-- TOC entry 5497 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN notas.actualizar; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.notas.actualizar IS 'Timestamp de la última modificación.';


--
-- TOC entry 5498 (class 0 OID 0)
-- Dependencies: 302
-- Name: CONSTRAINT chk_nota_est ON notas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_nota_est ON academico.notas IS 'Valida que el estatus sea A o I.';


--
-- TOC entry 5499 (class 0 OID 0)
-- Dependencies: 302
-- Name: CONSTRAINT chk_nota_rango ON notas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_nota_rango ON academico.notas IS 'Valida que la nota esté en el rango 0-20 (sistema venezolano).';


--
-- TOC entry 5500 (class 0 OID 0)
-- Dependencies: 302
-- Name: CONSTRAINT chk_nota_tipo ON notas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_nota_tipo ON academico.notas IS 'Valida que el tipo de evaluación sea uno de los valores permitidos.';


--
-- TOC entry 301 (class 1259 OID 114940)
-- Name: notas_id_nota_seq; Type: SEQUENCE; Schema: academico; Owner: postgres
--

CREATE SEQUENCE academico.notas_id_nota_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE academico.notas_id_nota_seq OWNER TO postgres;

--
-- TOC entry 5501 (class 0 OID 0)
-- Dependencies: 301
-- Name: notas_id_nota_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.notas_id_nota_seq OWNED BY academico.notas.id_nota;


--
-- TOC entry 5502 (class 0 OID 0)
-- Dependencies: 301
-- Name: SEQUENCE notas_id_nota_seq; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON SEQUENCE academico.notas_id_nota_seq IS 'Secuencia para generar identificadores únicos de notas. Creada en v3.8.';


--
-- TOC entry 285 (class 1259 OID 65977)
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
-- TOC entry 5503 (class 0 OID 0)
-- Dependencies: 285
-- Name: TABLE periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TABLE academico.periodos_academicos IS 'Períodos académicos (trimestres o semestres) con fechas de inicio y fin';


--
-- TOC entry 5504 (class 0 OID 0)
-- Dependencies: 285
-- Name: COLUMN periodos_academicos.id_per; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.id_per IS 'Identificador único serializado del período académico.';


--
-- TOC entry 5505 (class 0 OID 0)
-- Dependencies: 285
-- Name: COLUMN periodos_academicos.nombre; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.nombre IS 'Nombre descriptivo del lapso (Ej: Trimestre 2024-I, Semestre 2025-II).';


--
-- TOC entry 5506 (class 0 OID 0)
-- Dependencies: 285
-- Name: COLUMN periodos_academicos.anio; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.anio IS 'Año calendario al que corresponde el período académico.';


--
-- TOC entry 5507 (class 0 OID 0)
-- Dependencies: 285
-- Name: COLUMN periodos_academicos.numero_periodo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.numero_periodo IS 'Número del período (1-12 para trimestres, 1-8 para semestres)';


--
-- TOC entry 5508 (class 0 OID 0)
-- Dependencies: 285
-- Name: COLUMN periodos_academicos.tipo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.tipo IS 'Sistema del lapso: Trimestre o Semestre. Debe coincidir con el tipo_sistema del programa.';


--
-- TOC entry 5509 (class 0 OID 0)
-- Dependencies: 285
-- Name: COLUMN periodos_academicos.fecha_inicio; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.fecha_inicio IS 'Fecha oficial del inicio de clases para este período.';


--
-- TOC entry 5510 (class 0 OID 0)
-- Dependencies: 285
-- Name: COLUMN periodos_academicos.fecha_fin; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.fecha_fin IS 'Fecha oficial de culminación del período académico.';


--
-- TOC entry 5511 (class 0 OID 0)
-- Dependencies: 285
-- Name: COLUMN periodos_academicos.activo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.activo IS 'Indica si este es el período académico vigente';


--
-- TOC entry 5512 (class 0 OID 0)
-- Dependencies: 285
-- Name: COLUMN periodos_academicos.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5513 (class 0 OID 0)
-- Dependencies: 285
-- Name: COLUMN periodos_academicos.creado; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.creado IS 'Fecha y hora en la que se configuró el período en el sistema.';


--
-- TOC entry 5514 (class 0 OID 0)
-- Dependencies: 285
-- Name: COLUMN periodos_academicos.actualizar; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.periodos_academicos.actualizar IS 'Fecha y hora del último ajuste realizado al período académico.';


--
-- TOC entry 5515 (class 0 OID 0)
-- Dependencies: 285
-- Name: CONSTRAINT chk_periodos_est ON periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_periodos_est ON academico.periodos_academicos IS 'Restricción para validar el estado de borrado lógico (''A'' o ''I'').';


--
-- TOC entry 5516 (class 0 OID 0)
-- Dependencies: 285
-- Name: CONSTRAINT chk_periodos_fechas ON periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_periodos_fechas ON academico.periodos_academicos IS 'Lógica de validación que obliga a que la fecha de inicio sea estrictamente anterior a la fecha de fin.';


--
-- TOC entry 5517 (class 0 OID 0)
-- Dependencies: 285
-- Name: CONSTRAINT chk_periodos_numero ON periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_periodos_numero ON academico.periodos_academicos IS 'Asegura que el número de período se mantenga en el rango lógico de 1 a 12.';


--
-- TOC entry 5518 (class 0 OID 0)
-- Dependencies: 285
-- Name: CONSTRAINT chk_periodos_tipo ON periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_periodos_tipo ON academico.periodos_academicos IS 'Restricción que limita los tipos de período exclusivamente a ''Trimestre'' o ''Semestre''.';


--
-- TOC entry 284 (class 1259 OID 65976)
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
-- TOC entry 5519 (class 0 OID 0)
-- Dependencies: 284
-- Name: periodos_academicos_id_per_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.periodos_academicos_id_per_seq OWNED BY academico.periodos_academicos.id_per;


--
-- TOC entry 277 (class 1259 OID 65890)
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
-- TOC entry 5520 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE programas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TABLE academico.programas IS 'Programas académicos de la universidad (Inicial, Primaria, Especial)';


--
-- TOC entry 5521 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN programas.id_pro; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.id_pro IS 'Identificador único serializado del programa académico o PNF.';


--
-- TOC entry 5522 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN programas.codigo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.codigo IS 'Código único del programa (Ej: LPRI, LESP)';


--
-- TOC entry 5523 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN programas.nombre; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.nombre IS 'Título oficial del programa (Ej: PNF en Informática, Licenciatura en Educación).';


--
-- TOC entry 5524 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN programas.tipo_sistema; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.tipo_sistema IS 'Tipo de sistema: Trimestral o Semestral';


--
-- TOC entry 5525 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN programas.total_trayectos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.total_trayectos IS 'Número total de trayectos del programa';


--
-- TOC entry 5526 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN programas.total_uc; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.total_uc IS 'Total de unidades crédito del programa completo';


--
-- TOC entry 5527 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN programas.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5528 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN programas.creado; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.creado IS 'Timestamp de creación del registro del programa en la base de datos.';


--
-- TOC entry 5529 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN programas.actualizar; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.programas.actualizar IS 'Timestamp de la última vez que se editó la información del programa.';


--
-- TOC entry 5530 (class 0 OID 0)
-- Dependencies: 277
-- Name: CONSTRAINT chk_programas_est ON programas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_programas_est ON academico.programas IS 'Valida que el estatus insertado sea únicamente ''A'' o ''I''.';


--
-- TOC entry 5531 (class 0 OID 0)
-- Dependencies: 277
-- Name: CONSTRAINT chk_programas_sistema ON programas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_programas_sistema ON academico.programas IS 'Valida que el sistema educativo sea únicamente ''Trimestral'' o ''Semestral''.';


--
-- TOC entry 276 (class 1259 OID 65889)
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
-- TOC entry 5532 (class 0 OID 0)
-- Dependencies: 276
-- Name: programas_id_pro_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.programas_id_pro_seq OWNED BY academico.programas.id_pro;


--
-- TOC entry 287 (class 1259 OID 66003)
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
-- TOC entry 5533 (class 0 OID 0)
-- Dependencies: 287
-- Name: COLUMN secciones.id_sec; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.id_sec IS 'Identificador único serializado de la sección.';


--
-- TOC entry 5534 (class 0 OID 0)
-- Dependencies: 287
-- Name: COLUMN secciones.codigo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.codigo IS 'Código identificador de la sección (Ej: INF-T1-S1, ADM-S3).';


--
-- TOC entry 5535 (class 0 OID 0)
-- Dependencies: 287
-- Name: COLUMN secciones.id_pro; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.id_pro IS 'Identificador del programa académico al que pertenece la sección.';


--
-- TOC entry 5536 (class 0 OID 0)
-- Dependencies: 287
-- Name: COLUMN secciones.trayecto; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.trayecto IS 'Número del trayecto académico en el que se abre la sección.';


--
-- TOC entry 5537 (class 0 OID 0)
-- Dependencies: 287
-- Name: COLUMN secciones.periodo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.periodo IS 'Período específico (trimestre o semestre) de esta sección.';


--
-- TOC entry 5538 (class 0 OID 0)
-- Dependencies: 287
-- Name: COLUMN secciones.capacidad_maxima; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.capacidad_maxima IS 'Límite máximo de estudiantes que se pueden inscribir en la sección.';


--
-- TOC entry 5539 (class 0 OID 0)
-- Dependencies: 287
-- Name: COLUMN secciones.estatus; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5540 (class 0 OID 0)
-- Dependencies: 287
-- Name: COLUMN secciones.creado; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.creado IS 'Fecha y hora de creación de la sección.';


--
-- TOC entry 5541 (class 0 OID 0)
-- Dependencies: 287
-- Name: COLUMN secciones.actualizar; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON COLUMN academico.secciones.actualizar IS 'Fecha y hora de la última modificación de la sección.';


--
-- TOC entry 5542 (class 0 OID 0)
-- Dependencies: 287
-- Name: CONSTRAINT chk_secciones_capacidad ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_secciones_capacidad ON academico.secciones IS 'Impide crear secciones con capacidad de 0 o números negativos.';


--
-- TOC entry 5543 (class 0 OID 0)
-- Dependencies: 287
-- Name: CONSTRAINT chk_secciones_est ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_secciones_est ON academico.secciones IS 'Garantiza que el estatus lógico de la sección sea ''A'' o ''I''.';


--
-- TOC entry 5544 (class 0 OID 0)
-- Dependencies: 287
-- Name: CONSTRAINT chk_secciones_periodo ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_secciones_periodo ON academico.secciones IS 'Verifica que el período de la sección sea mayor a 0.';


--
-- TOC entry 5545 (class 0 OID 0)
-- Dependencies: 287
-- Name: CONSTRAINT chk_secciones_trayecto ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT chk_secciones_trayecto ON academico.secciones IS 'Verifica que el trayecto asignado a la sección sea mayor a 0.';


--
-- TOC entry 286 (class 1259 OID 66002)
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
-- TOC entry 5546 (class 0 OID 0)
-- Dependencies: 286
-- Name: secciones_id_sec_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.secciones_id_sec_seq OWNED BY academico.secciones.id_sec;


--
-- TOC entry 269 (class 1259 OID 65764)
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
    foto_url character varying(255),
    CONSTRAINT chk_estudiantes_cedula_formato CHECK (((cedula)::text ~* '^V-[0-9]{7,8}$'::text)),
    CONSTRAINT chk_estudiantes_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE personas.estudiantes OWNER TO postgres;

--
-- TOC entry 5547 (class 0 OID 0)
-- Dependencies: 269
-- Name: TABLE estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON TABLE personas.estudiantes IS 'Tabla para almacenar la información de los estudiantes';


--
-- TOC entry 5548 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN estudiantes.id_est; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.id_est IS 'identificador serializado de los estudiantes. Ej:1,2,3,4,5';


--
-- TOC entry 5549 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN estudiantes.id_usu; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.id_usu IS 'Identificador del usuario como entero';


--
-- TOC entry 5550 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN estudiantes.cedula; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.cedula IS 'cedula de identidad del estudiante';


--
-- TOC entry 5551 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN estudiantes.id_mun; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.id_mun IS 'Identificador del municipio como entero';


--
-- TOC entry 5552 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN estudiantes.id_pro; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.id_pro IS 'Identificador entero de los programas academicos';


--
-- TOC entry 5553 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN estudiantes.id_sec; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.id_sec IS 'Identificador entero de las secciones';


--
-- TOC entry 5554 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN estudiantes.trayecto; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.trayecto IS 'Trayecto en el que se encuentra el estudiante';


--
-- TOC entry 5555 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN estudiantes.foto_url; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.estudiantes.foto_url IS 'URL de la foto del estudiante para mostrar en el sistema. Agregado en v4.1.';


--
-- TOC entry 5556 (class 0 OID 0)
-- Dependencies: 269
-- Name: CONSTRAINT chk_estudiantes_cedula_formato ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_estudiantes_cedula_formato ON personas.estudiantes IS 'Valida que la cédula del estudiante tenga formato venezolano (V-XXXXXXXX). Agregado en v4.1.';


--
-- TOC entry 5557 (class 0 OID 0)
-- Dependencies: 269
-- Name: CONSTRAINT chk_estudiantes_est ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_estudiantes_est ON personas.estudiantes IS 'revisa si el estatus del estudiantes es activo o inactivo';


--
-- TOC entry 304 (class 1259 OID 114995)
-- Name: vw_analisis_notas; Type: VIEW; Schema: academico; Owner: postgres
--

CREATE VIEW academico.vw_analisis_notas AS
 WITH definitivas AS (
         SELECT DISTINCT ON (n.id_est, n.id_malla, n.id_per) n.id_est,
            n.id_malla,
            n.id_per,
            n.nota,
            n.tipo_evaluacion
           FROM academico.notas n
          WHERE ((n.estatus = 'A'::bpchar) AND ((n.tipo_evaluacion)::text = ANY ((ARRAY['Final'::character varying, 'Recuperación'::character varying])::text[])))
          ORDER BY n.id_est, n.id_malla, n.id_per,
                CASE n.tipo_evaluacion
                    WHEN 'Recuperación'::text THEN 1
                    ELSE 2
                END
        )
 SELECT p.codigo AS cod_programa,
    p.nombre AS programa,
    mc.trayecto,
    mc.periodo,
    pa.nombre AS periodo_academico,
    m.codigo AS cod_materia,
    m.nombre AS materia,
    eje.codigo AS cod_eje,
    eje.nombre AS eje_formativo,
    count(*) AS total_estudiantes_evaluados,
    round(avg(d.nota), 2) AS promedio,
    min(d.nota) AS nota_minima,
    max(d.nota) AS nota_maxima,
    round(stddev(d.nota), 2) AS desviacion_estandar,
    count(
        CASE
            WHEN (d.nota >= (10)::numeric) THEN 1
            ELSE NULL::integer
        END) AS aprobados,
    count(
        CASE
            WHEN (d.nota < (10)::numeric) THEN 1
            ELSE NULL::integer
        END) AS reprobados,
    round((((count(
        CASE
            WHEN (d.nota >= (10)::numeric) THEN 1
            ELSE NULL::integer
        END))::numeric / (count(*))::numeric) * (100)::numeric), 2) AS porcentaje_aprobacion
   FROM ((((((definitivas d
     JOIN personas.estudiantes e ON ((e.id_est = d.id_est)))
     JOIN academico.malla_curricular mc ON ((mc.id_malla = d.id_malla)))
     JOIN academico.materias m ON ((m.id_mat = mc.id_mat)))
     JOIN academico.ejes_formativos eje ON ((eje.id_eje = m.id_eje)))
     JOIN academico.programas p ON ((p.id_pro = mc.id_pro)))
     JOIN academico.periodos_academicos pa ON ((pa.id_per = d.id_per)))
  WHERE ((e.estatus = 'A'::bpchar) AND (mc.estatus = 'A'::bpchar))
  GROUP BY p.codigo, p.nombre, mc.trayecto, mc.periodo, pa.nombre, m.codigo, m.nombre, eje.codigo, eje.nombre;


ALTER VIEW academico.vw_analisis_notas OWNER TO postgres;

--
-- TOC entry 5558 (class 0 OID 0)
-- Dependencies: 304
-- Name: VIEW vw_analisis_notas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON VIEW academico.vw_analisis_notas IS 'Análisis estadístico sobre notas OFICIALES (Final o Recuperación). DISTINCT ON garantiza un registro por estudiante-materia-período; la Recuperación prevalece sobre la Final. Parciales y Trabajos son formativos y no afectan las métricas.';


--
-- TOC entry 265 (class 1259 OID 65711)
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
-- TOC entry 5559 (class 0 OID 0)
-- Dependencies: 265
-- Name: TABLE aud_mov; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.aud_mov IS 'Tabla Auditoría para mantener una bitacora del sistema';


--
-- TOC entry 5560 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN aud_mov.id_aud; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.id_aud IS 'Identificador único autoincremental del registro de auditoría. Ej: 1,2,3,4';


--
-- TOC entry 5561 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN aud_mov.id_usu; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.id_usu IS 'Identificador del usuario que ejecutó la operación. Permite rastrear la autoría de cada cambio.';


--
-- TOC entry 5562 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN aud_mov.tabla_mod; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.tabla_mod IS 'Nombre de la tabla que fue modificada. Indica el módulo o entidad del sistema donde ocurrió el cambio.';


--
-- TOC entry 5563 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN aud_mov.accion; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.accion IS 'Tipo de operación SQL realizada: INSERT (creación), UPDATE (modificación) o DELETE (eliminación).';


--
-- TOC entry 5564 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN aud_mov.val_antes; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.val_antes IS 'Estado completo del registro antes de la modificación, almacenado en formato JSONB. Es NULL para operaciones INSERT. Permite auditoría forense y reversión de cambios.';


--
-- TOC entry 5565 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN aud_mov.val_despues; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.val_despues IS 'Estado completo del registro después de la modificación, almacenado en formato JSONB. Es NULL para operaciones DELETE. Documenta el resultado final del cambio.';


--
-- TOC entry 5566 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN aud_mov.fec_hor; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.fec_hor IS 'Marca de tiempo exacta de la operación con zona horaria. Se registra automáticamente mediante CURRENT_TIMESTAMP.';


--
-- TOC entry 5567 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN aud_mov.dir_ip; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.dir_ip IS 'Dirección IP del cliente que realizó la operación. Permite identificar el origen de red del cambio para fines de seguridad.';


--
-- TOC entry 5568 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN aud_mov.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.aud_mov.estatus IS 'Estado del registro de auditoría: ''A'' (Activo) o ''I'' (Inactivo). Implementa borrado lógico para mantener integridad histórica.';


--
-- TOC entry 5569 (class 0 OID 0)
-- Dependencies: 265
-- Name: CONSTRAINT chk_aud_est ON aud_mov; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_aud_est ON general.aud_mov IS 'Regla para verificar, si esta activo o inactivo en el borrado lógico';


--
-- TOC entry 264 (class 1259 OID 65710)
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
-- TOC entry 5570 (class 0 OID 0)
-- Dependencies: 264
-- Name: aud_mov_id_aud_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.aud_mov_id_aud_seq OWNED BY general.aud_mov.id_aud;


--
-- TOC entry 263 (class 1259 OID 65698)
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
-- TOC entry 5571 (class 0 OID 0)
-- Dependencies: 263
-- Name: TABLE credenciales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.credenciales IS 'Tabla para las credenciales de autentificación';


--
-- TOC entry 5572 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN credenciales.id_cre; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.credenciales.id_cre IS 'Identificador serializado para las credenciales, Ej: 1,2,3,4';


--
-- TOC entry 5573 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN credenciales.id_usu; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.credenciales.id_usu IS 'Identificador númerico de los usuarios';


--
-- TOC entry 5574 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN credenciales.password_hash; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.credenciales.password_hash IS 'contraseña del hash';


--
-- TOC entry 5575 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN credenciales.ultimo_acceso; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.credenciales.ultimo_acceso IS 'Columna para ver el último acceso del usuario';


--
-- TOC entry 5576 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN credenciales.intentos_fallidos; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.credenciales.intentos_fallidos IS 'Cantidad de intentos fallidos';


--
-- TOC entry 5577 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN credenciales.bloqueado_hasta; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.credenciales.bloqueado_hasta IS 'Bloquer usuario hasta un tiempo determindo';


--
-- TOC entry 262 (class 1259 OID 65697)
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
-- TOC entry 5578 (class 0 OID 0)
-- Dependencies: 262
-- Name: credenciales_id_cre_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.credenciales_id_cre_seq OWNED BY general.credenciales.id_cre;


--
-- TOC entry 259 (class 1259 OID 65666)
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
-- TOC entry 5579 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE dias_laborales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.dias_laborales IS 'Dias laborables de la semana en la universidad';


--
-- TOC entry 5580 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN dias_laborales.id_dia; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.dias_laborales.id_dia IS 'Identificador serializado Ej:1,2,3,4';


--
-- TOC entry 5581 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN dias_laborales.dia; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.dias_laborales.dia IS 'Dia de la semana';


--
-- TOC entry 5582 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN dias_laborales.orden; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.dias_laborales.orden IS 'Orden en de los dias';


--
-- TOC entry 5583 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN dias_laborales.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.dias_laborales.estatus IS 'Columna para borrado lógico en el que: A => Activo, I => Inactivo';


--
-- TOC entry 5584 (class 0 OID 0)
-- Dependencies: 259
-- Name: CONSTRAINT chk_dias_est ON dias_laborales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_dias_est ON general.dias_laborales IS 'Regla de validación lógica para comprobar si el registro está ''A'' (Activo) o ''I'' (Inactivo).';


--
-- TOC entry 258 (class 1259 OID 65665)
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
-- TOC entry 5585 (class 0 OID 0)
-- Dependencies: 258
-- Name: dias_laborales_id_dia_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.dias_laborales_id_dia_seq OWNED BY general.dias_laborales.id_dia;


--
-- TOC entry 294 (class 1259 OID 114841)
-- Name: modulos; Type: TABLE; Schema: general; Owner: postgres
--

CREATE TABLE general.modulos (
    id_mod smallint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    CONSTRAINT chk_modulos_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE general.modulos OWNER TO postgres;

--
-- TOC entry 5586 (class 0 OID 0)
-- Dependencies: 294
-- Name: TABLE modulos; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.modulos IS 'Catálogo de módulos/entidades del sistema para control de permisos. Cada módulo representa una funcionalidad del sistema (ej: docentes, estudiantes, notas). Creada en v3.8.';


--
-- TOC entry 5587 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN modulos.id_mod; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.modulos.id_mod IS 'Identificador único serializado del módulo.';


--
-- TOC entry 5588 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN modulos.codigo; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.modulos.codigo IS 'Código único del módulo (ej: docentes, estudiantes, malla, notas).';


--
-- TOC entry 5589 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN modulos.nombre; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.modulos.nombre IS 'Nombre descriptivo del módulo (ej: Docentes, Registro de Notas).';


--
-- TOC entry 5590 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN modulos.descripcion; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.modulos.descripcion IS 'Detalle extendido de la funcionalidad del módulo.';


--
-- TOC entry 5591 (class 0 OID 0)
-- Dependencies: 294
-- Name: COLUMN modulos.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.modulos.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5592 (class 0 OID 0)
-- Dependencies: 294
-- Name: CONSTRAINT chk_modulos_est ON modulos; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_modulos_est ON general.modulos IS 'Valida que el estatus sea únicamente A o I.';


--
-- TOC entry 293 (class 1259 OID 114840)
-- Name: modulos_id_mod_seq; Type: SEQUENCE; Schema: general; Owner: postgres
--

CREATE SEQUENCE general.modulos_id_mod_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE general.modulos_id_mod_seq OWNER TO postgres;

--
-- TOC entry 5593 (class 0 OID 0)
-- Dependencies: 293
-- Name: modulos_id_mod_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.modulos_id_mod_seq OWNED BY general.modulos.id_mod;


--
-- TOC entry 5594 (class 0 OID 0)
-- Dependencies: 293
-- Name: SEQUENCE modulos_id_mod_seq; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON SEQUENCE general.modulos_id_mod_seq IS 'Secuencia para generar identificadores únicos del catálogo de módulos. Creada en v3.8.';


--
-- TOC entry 257 (class 1259 OID 65652)
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
-- TOC entry 5595 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE municipios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.municipios IS 'Tabla para saber los municipios del estado Táchira donde opera la universidad';


--
-- TOC entry 5596 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN municipios.id_mun; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.municipios.id_mun IS 'Identificador serializado de los municipios, Ej:1,2,3,4';


--
-- TOC entry 5597 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN municipios.nombre; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.municipios.nombre IS 'Nombre del municipio Ej: San Cristóbal';


--
-- TOC entry 5598 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN municipios.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.municipios.estatus IS 'Columna para borrado lógico en el que: A => Activo, I => Inactivo';


--
-- TOC entry 5599 (class 0 OID 0)
-- Dependencies: 257
-- Name: CONSTRAINT chk_municipios_est ON municipios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_municipios_est ON general.municipios IS 'Regla de validación para determinar si el municipio está disponible operativamente (''A'') o no (''I'').';


--
-- TOC entry 256 (class 1259 OID 65651)
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
-- TOC entry 5600 (class 0 OID 0)
-- Dependencies: 256
-- Name: municipios_id_mun_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.municipios_id_mun_seq OWNED BY general.municipios.id_mun;


--
-- TOC entry 296 (class 1259 OID 114858)
-- Name: permisos; Type: TABLE; Schema: general; Owner: postgres
--

CREATE TABLE general.permisos (
    id_perm smallint NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text
);


ALTER TABLE general.permisos OWNER TO postgres;

--
-- TOC entry 5601 (class 0 OID 0)
-- Dependencies: 296
-- Name: TABLE permisos; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.permisos IS 'Catálogo de acciones/permisos disponibles en el sistema. Define qué operaciones se pueden realizar sobre cada módulo. Creada en v3.8.';


--
-- TOC entry 5602 (class 0 OID 0)
-- Dependencies: 296
-- Name: COLUMN permisos.id_perm; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos.id_perm IS 'Identificador único serializado del permiso.';


--
-- TOC entry 5603 (class 0 OID 0)
-- Dependencies: 296
-- Name: COLUMN permisos.codigo; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos.codigo IS 'Código corto del permiso (CRE, ACT, LEC, BOR).';


--
-- TOC entry 5604 (class 0 OID 0)
-- Dependencies: 296
-- Name: COLUMN permisos.nombre; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos.nombre IS 'Nombre descriptivo del permiso (Crear, Actualizar, Leer, Borrar).';


--
-- TOC entry 5605 (class 0 OID 0)
-- Dependencies: 296
-- Name: COLUMN permisos.descripcion; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos.descripcion IS 'Detalle de la acción que permite el permiso.';


--
-- TOC entry 295 (class 1259 OID 114857)
-- Name: permisos_id_perm_seq; Type: SEQUENCE; Schema: general; Owner: postgres
--

CREATE SEQUENCE general.permisos_id_perm_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE general.permisos_id_perm_seq OWNER TO postgres;

--
-- TOC entry 5606 (class 0 OID 0)
-- Dependencies: 295
-- Name: permisos_id_perm_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.permisos_id_perm_seq OWNED BY general.permisos.id_perm;


--
-- TOC entry 5607 (class 0 OID 0)
-- Dependencies: 295
-- Name: SEQUENCE permisos_id_perm_seq; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON SEQUENCE general.permisos_id_perm_seq IS 'Secuencia para generar identificadores únicos del catálogo de permisos. Creada en v3.8.';


--
-- TOC entry 298 (class 1259 OID 114872)
-- Name: permisos_rol; Type: TABLE; Schema: general; Owner: postgres
--

CREATE TABLE general.permisos_rol (
    id_pr smallint NOT NULL,
    id_rol smallint NOT NULL,
    id_mod smallint NOT NULL,
    id_perm smallint NOT NULL,
    alcance character varying(10) DEFAULT 'NAD'::character varying NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    CONSTRAINT chk_pr_alcance CHECK (((alcance)::text = ANY ((ARRAY['TODO'::character varying, 'SP'::character varying, 'LIM'::character varying, 'NAD'::character varying])::text[]))),
    CONSTRAINT chk_pr_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE general.permisos_rol OWNER TO postgres;

--
-- TOC entry 5608 (class 0 OID 0)
-- Dependencies: 298
-- Name: TABLE permisos_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.permisos_rol IS 'Permisos base por rol (plantilla). Define qué puede hacer cada rol por defecto en cada módulo. Si un usuario no tiene override, hereda estos permisos. Creada en v3.8.';


--
-- TOC entry 5609 (class 0 OID 0)
-- Dependencies: 298
-- Name: COLUMN permisos_rol.id_pr; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos_rol.id_pr IS 'Identificador único serializado del permiso por rol.';


--
-- TOC entry 5610 (class 0 OID 0)
-- Dependencies: 298
-- Name: COLUMN permisos_rol.id_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos_rol.id_rol IS 'Referencia al rol que tiene este permiso base.';


--
-- TOC entry 5611 (class 0 OID 0)
-- Dependencies: 298
-- Name: COLUMN permisos_rol.id_mod; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos_rol.id_mod IS 'Referencia al módulo sobre el cual se otorga el permiso.';


--
-- TOC entry 5612 (class 0 OID 0)
-- Dependencies: 298
-- Name: COLUMN permisos_rol.id_perm; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos_rol.id_perm IS 'Referencia a la acción permitida (CRE, ACT, LEC, BOR).';


--
-- TOC entry 5613 (class 0 OID 0)
-- Dependencies: 298
-- Name: COLUMN permisos_rol.alcance; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos_rol.alcance IS 'Nivel de acceso: TODO=acceso total, SP=solo propio, LIM=limitado, NAD=sin acceso.';


--
-- TOC entry 5614 (class 0 OID 0)
-- Dependencies: 298
-- Name: COLUMN permisos_rol.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos_rol.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5615 (class 0 OID 0)
-- Dependencies: 298
-- Name: CONSTRAINT chk_pr_alcance ON permisos_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_pr_alcance ON general.permisos_rol IS 'Valida que el alcance sea TODO, SP, LIM o NAD.';


--
-- TOC entry 5616 (class 0 OID 0)
-- Dependencies: 298
-- Name: CONSTRAINT chk_pr_est ON permisos_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_pr_est ON general.permisos_rol IS 'Valida que el estatus sea A o I.';


--
-- TOC entry 297 (class 1259 OID 114871)
-- Name: permisos_rol_id_pr_seq; Type: SEQUENCE; Schema: general; Owner: postgres
--

CREATE SEQUENCE general.permisos_rol_id_pr_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE general.permisos_rol_id_pr_seq OWNER TO postgres;

--
-- TOC entry 5617 (class 0 OID 0)
-- Dependencies: 297
-- Name: permisos_rol_id_pr_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.permisos_rol_id_pr_seq OWNED BY general.permisos_rol.id_pr;


--
-- TOC entry 5618 (class 0 OID 0)
-- Dependencies: 297
-- Name: SEQUENCE permisos_rol_id_pr_seq; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON SEQUENCE general.permisos_rol_id_pr_seq IS 'Secuencia para generar identificadores únicos de permisos por rol. Creada en v3.8.';


--
-- TOC entry 300 (class 1259 OID 114908)
-- Name: permisos_usuario; Type: TABLE; Schema: general; Owner: postgres
--

CREATE TABLE general.permisos_usuario (
    id_pu smallint NOT NULL,
    id_usu integer NOT NULL,
    id_mod smallint NOT NULL,
    id_perm smallint NOT NULL,
    alcance character varying(10),
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    CONSTRAINT chk_pu_alcance CHECK (((alcance IS NULL) OR ((alcance)::text = ANY ((ARRAY['TODO'::character varying, 'SP'::character varying, 'LIM'::character varying, 'NAD'::character varying])::text[])))),
    CONSTRAINT chk_pu_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE general.permisos_usuario OWNER TO postgres;

--
-- TOC entry 5619 (class 0 OID 0)
-- Dependencies: 300
-- Name: TABLE permisos_usuario; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.permisos_usuario IS 'Permisos personalizados por usuario (override). Permite sobrescribir los permisos base del rol para usuarios específicos. Si alcance=NULL, hereda del rol. Creada en v3.8.';


--
-- TOC entry 5620 (class 0 OID 0)
-- Dependencies: 300
-- Name: COLUMN permisos_usuario.id_pu; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos_usuario.id_pu IS 'Identificador único serializado del permiso de usuario.';


--
-- TOC entry 5621 (class 0 OID 0)
-- Dependencies: 300
-- Name: COLUMN permisos_usuario.id_usu; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos_usuario.id_usu IS 'Referencia al usuario que tiene el permiso personalizado.';


--
-- TOC entry 5622 (class 0 OID 0)
-- Dependencies: 300
-- Name: COLUMN permisos_usuario.id_mod; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos_usuario.id_mod IS 'Referencia al módulo sobre el cual se otorga el permiso.';


--
-- TOC entry 5623 (class 0 OID 0)
-- Dependencies: 300
-- Name: COLUMN permisos_usuario.id_perm; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos_usuario.id_perm IS 'Referencia a la acción permitida.';


--
-- TOC entry 5624 (class 0 OID 0)
-- Dependencies: 300
-- Name: COLUMN permisos_usuario.alcance; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos_usuario.alcance IS 'NULL=hereda del rol, o valor específico (TODO, SP, LIM, NAD) que sobrescribe el permiso del rol.';


--
-- TOC entry 5625 (class 0 OID 0)
-- Dependencies: 300
-- Name: COLUMN permisos_usuario.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.permisos_usuario.estatus IS 'Indicador de borrado lógico (A = Activo, I = Inactivo).';


--
-- TOC entry 5626 (class 0 OID 0)
-- Dependencies: 300
-- Name: CONSTRAINT chk_pu_alcance ON permisos_usuario; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_pu_alcance ON general.permisos_usuario IS 'Valida que el alcance sea NULL o uno de TODO, SP, LIM, NAD.';


--
-- TOC entry 5627 (class 0 OID 0)
-- Dependencies: 300
-- Name: CONSTRAINT chk_pu_est ON permisos_usuario; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_pu_est ON general.permisos_usuario IS 'Valida que el estatus sea A o I.';


--
-- TOC entry 299 (class 1259 OID 114907)
-- Name: permisos_usuario_id_pu_seq; Type: SEQUENCE; Schema: general; Owner: postgres
--

CREATE SEQUENCE general.permisos_usuario_id_pu_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE general.permisos_usuario_id_pu_seq OWNER TO postgres;

--
-- TOC entry 5628 (class 0 OID 0)
-- Dependencies: 299
-- Name: permisos_usuario_id_pu_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.permisos_usuario_id_pu_seq OWNED BY general.permisos_usuario.id_pu;


--
-- TOC entry 5629 (class 0 OID 0)
-- Dependencies: 299
-- Name: SEQUENCE permisos_usuario_id_pu_seq; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON SEQUENCE general.permisos_usuario_id_pu_seq IS 'Secuencia para generar identificadores únicos de permisos por usuario. Creada en v3.8.';


--
-- TOC entry 255 (class 1259 OID 65637)
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
-- TOC entry 5630 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE roles; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.roles IS 'Tabla para almacenar los roles del sistema';


--
-- TOC entry 5631 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN roles.id_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.roles.id_rol IS 'Identificador serializado para los roles, Ej: 1,2,3,4';


--
-- TOC entry 5632 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN roles.rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.roles.rol IS 'Columna para almacenar el tipo de rol que se le da al usuario';


--
-- TOC entry 5633 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN roles.descripcion; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.roles.descripcion IS 'Columna para explicar el funcionamiento de cada rol';


--
-- TOC entry 5634 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN roles.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.roles.estatus IS 'Columna para borrado lógico en el que: A => Activo, I => Inactivo';


--
-- TOC entry 5635 (class 0 OID 0)
-- Dependencies: 255
-- Name: CONSTRAINT chk_rol_est ON roles; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_rol_est ON general.roles IS 'Revisa el estado del rol';


--
-- TOC entry 254 (class 1259 OID 65636)
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
-- TOC entry 5636 (class 0 OID 0)
-- Dependencies: 254
-- Name: roles_id_rol_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.roles_id_rol_seq OWNED BY general.roles.id_rol;


--
-- TOC entry 261 (class 1259 OID 65681)
-- Name: usuarios; Type: TABLE; Schema: general; Owner: postgres
--

CREATE TABLE general.usuarios (
    id_usu integer NOT NULL,
    username character varying(255) NOT NULL,
    id_rol smallint NOT NULL,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    email character varying(255),
    CONSTRAINT chk_usu_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar]))),
    CONSTRAINT chk_usuarios_email_formato CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))
);


ALTER TABLE general.usuarios OWNER TO postgres;

--
-- TOC entry 5637 (class 0 OID 0)
-- Dependencies: 261
-- Name: TABLE usuarios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TABLE general.usuarios IS 'Tabla para los usuarios del sistema con autentificación';


--
-- TOC entry 5638 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN usuarios.id_usu; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.id_usu IS 'Identificador serializado para el usuario Ej: 1,2,3,4,5';


--
-- TOC entry 5639 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN usuarios.username; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.username IS 'Nombre del usuario';


--
-- TOC entry 5640 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN usuarios.id_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.id_rol IS 'Identificador del rol de usuario como entero';


--
-- TOC entry 5641 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN usuarios.estatus; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.estatus IS 'Columna para borrado lógico en el que: A => Activo, I => Inactivo';


--
-- TOC entry 5642 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN usuarios.creado; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.creado IS 'Fecha y hora en la que el usuario fue registrado en el sistema.';


--
-- TOC entry 5643 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN usuarios.actualizar; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.actualizar IS 'Columna para averiguar en que momento actualizaron al usuario';


--
-- TOC entry 5644 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN usuarios.email; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON COLUMN general.usuarios.email IS 'Correo electrónico del usuario, utilizado para recuperación de contraseña. Debe ser único. Agregado en v3.5.';


--
-- TOC entry 5645 (class 0 OID 0)
-- Dependencies: 261
-- Name: CONSTRAINT chk_usu_est ON usuarios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT chk_usu_est ON general.usuarios IS 'Regla para revisar el estado del usuario Activo o Inactivo';


--
-- TOC entry 260 (class 1259 OID 65680)
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
-- TOC entry 5646 (class 0 OID 0)
-- Dependencies: 260
-- Name: usuarios_id_usu_seq; Type: SEQUENCE OWNED BY; Schema: general; Owner: postgres
--

ALTER SEQUENCE general.usuarios_id_usu_seq OWNED BY general.usuarios.id_usu;


--
-- TOC entry 289 (class 1259 OID 82014)
-- Name: vw_auditoria_legible; Type: VIEW; Schema: general; Owner: postgres
--

CREATE VIEW general.vw_auditoria_legible AS
 SELECT am.id_aud,
    am.fec_hor AS fecha_hora,
    COALESCE(u.username, 'Sistema/Script'::character varying) AS usuario,
    am.tabla_mod AS tabla_afectada,
    am.accion,
        CASE
            WHEN ((am.tabla_mod)::text = 'docentes'::text) THEN COALESCE((am.val_despues ->> 'cedula'::text), (am.val_antes ->> 'cedula'::text), 'N/A'::text)
            WHEN ((am.tabla_mod)::text = 'estudiantes'::text) THEN COALESCE((am.val_despues ->> 'cedula'::text), (am.val_antes ->> 'cedula'::text), 'N/A'::text)
            WHEN ((am.tabla_mod)::text = 'asig_carga_horarias'::text) THEN concat('DocID:', COALESCE((am.val_despues ->> 'id_doc'::text), (am.val_antes ->> 'id_doc'::text), '?'::text), ' | Día:', COALESCE((am.val_despues ->> 'id_dia'::text), (am.val_antes ->> 'id_dia'::text), '?'::text))
            WHEN ((am.tabla_mod)::text = 'espacios_fis'::text) THEN COALESCE((am.val_despues ->> 'ubicacion'::text), (am.val_antes ->> 'ubicacion'::text), (am.val_despues ->> 'nombre_centro'::text), (am.val_antes ->> 'nombre_centro'::text), 'N/A'::text)
            WHEN ((am.tabla_mod)::text = 'programas'::text) THEN COALESCE((am.val_despues ->> 'codigo'::text), (am.val_antes ->> 'codigo'::text), (am.val_despues ->> 'nombre'::text), 'N/A'::text)
            WHEN ((am.tabla_mod)::text = 'usuarios'::text) THEN COALESCE((am.val_despues ->> 'username'::text), (am.val_antes ->> 'username'::text), 'N/A'::text)
            WHEN ((am.tabla_mod)::text = 'municipios'::text) THEN COALESCE((am.val_despues ->> 'nombre'::text), (am.val_antes ->> 'nombre'::text), 'N/A'::text)
            ELSE 'Ver detalle JSON'::text
        END AS registro_identificador,
        CASE
            WHEN ((am.accion)::text = 'INSERT'::text) THEN 'Registro creado'::text
            WHEN ((am.accion)::text = 'UPDATE'::text) THEN COALESCE(( SELECT string_agg(d.key, ', '::text ORDER BY d.key) AS string_agg
               FROM jsonb_each(am.val_despues) d(key, value)
              WHERE ((d.value IS DISTINCT FROM (am.val_antes -> d.key)) AND (d.key <> ALL (ARRAY['creado'::text, 'actualizar'::text])))), 'Solo metadatos (timestamps)'::text)
            WHEN ((am.accion)::text = 'DELETE'::text) THEN 'Registro eliminado'::text
            ELSE 'N/A'::text
        END AS resumen_cambio,
    am.dir_ip AS ip_origen
   FROM (general.aud_mov am
     LEFT JOIN general.usuarios u ON ((u.id_usu = am.id_usu)))
  ORDER BY am.fec_hor DESC;


ALTER VIEW general.vw_auditoria_legible OWNER TO postgres;

--
-- TOC entry 5647 (class 0 OID 0)
-- Dependencies: 289
-- Name: VIEW vw_auditoria_legible; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON VIEW general.vw_auditoria_legible IS 'Vista mejorada de auditoría que muestra los campos específicos modificados en cada operación UPDATE. Recreada en v4.1 con lógica de string_agg para identificar campos cambiados.';


--
-- TOC entry 267 (class 1259 OID 65728)
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
    observaciones text,
    foto_url character varying(255),
    CONSTRAINT chk_docentes_cedula_formato CHECK (((cedula)::text ~* '^V-[0-9]{7,8}$'::text)),
    CONSTRAINT chk_docentes_contrato CHECK (((tipo_contrato)::text = ANY ((ARRAY['Estipendio'::character varying, 'Contratado'::character varying])::text[]))),
    CONSTRAINT chk_docentes_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar]))),
    CONSTRAINT chk_docentes_horas CHECK ((horas_asignadas <= horas_max_sem)),
    CONSTRAINT chk_docentes_telefono_formato CHECK (((telefono IS NULL) OR ((telefono)::text ~* '^04[0-9]{9}$'::text)))
);


ALTER TABLE personas.docentes OWNER TO postgres;

--
-- TOC entry 5648 (class 0 OID 0)
-- Dependencies: 267
-- Name: TABLE docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON TABLE personas.docentes IS 'Tabla en la qe se almacenan los docentes de la universidad';


--
-- TOC entry 5649 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.id_doc; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.id_doc IS 'Identificador serializado de los docentes, Ej:1,2,3,4';


--
-- TOC entry 5650 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.id_usu; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.id_usu IS 'identificador entero del usuario del docente';


--
-- TOC entry 5651 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.cedula; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.cedula IS 'Cedula de identidad del docente';


--
-- TOC entry 5652 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.nombre; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.nombre IS 'Nombre del docente';


--
-- TOC entry 5653 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.apellido; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.apellido IS 'Apellido del docente';


--
-- TOC entry 5654 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.id_mun; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.id_mun IS 'Identificador entero del municipio en el que se encuentra el docente';


--
-- TOC entry 5655 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.tipo_contrato; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.tipo_contrato IS 'Tipo de contrato que tiene el docente';


--
-- TOC entry 5656 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.horas_max_sem; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.horas_max_sem IS 'Horas máximas del docente a la semana';


--
-- TOC entry 5657 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.horas_asignadas; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.horas_asignadas IS 'Horas asignadas al docente';


--
-- TOC entry 5658 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.horas_disponibles; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.horas_disponibles IS 'Horas disponibles del docente a la semana';


--
-- TOC entry 5659 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.telefono; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.telefono IS 'Telefono cellular del docente';


--
-- TOC entry 5660 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.observaciones; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.observaciones IS 'Notas adicionales sobre el docente (ej: restricciones médicas, preferencias horarias). Agregado en v4.1.';


--
-- TOC entry 5661 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN docentes.foto_url; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.docentes.foto_url IS 'URL de la foto del docente para mostrar en el sistema. Agregado en v4.1.';


--
-- TOC entry 5662 (class 0 OID 0)
-- Dependencies: 267
-- Name: CONSTRAINT chk_docentes_cedula_formato ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_docentes_cedula_formato ON personas.docentes IS 'Valida que la cédula del docente tenga formato venezolano (V-XXXXXXXX). Agregado en v4.1.';


--
-- TOC entry 5663 (class 0 OID 0)
-- Dependencies: 267
-- Name: CONSTRAINT chk_docentes_contrato ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_docentes_contrato ON personas.docentes IS 'Revisa el tipo de contrato que tiene el docente';


--
-- TOC entry 5664 (class 0 OID 0)
-- Dependencies: 267
-- Name: CONSTRAINT chk_docentes_est ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_docentes_est ON personas.docentes IS 'Chequea si el estado del docente es activo o inactivo';


--
-- TOC entry 5665 (class 0 OID 0)
-- Dependencies: 267
-- Name: CONSTRAINT chk_docentes_horas ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_docentes_horas ON personas.docentes IS 'Revisa las horas asiganadas al docente';


--
-- TOC entry 5666 (class 0 OID 0)
-- Dependencies: 267
-- Name: CONSTRAINT chk_docentes_telefono_formato ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_docentes_telefono_formato ON personas.docentes IS 'Valida que el teléfono del docente tenga formato venezolano (04XX-XXXXXXX) o sea NULL. Agregado en v4.1.';


--
-- TOC entry 291 (class 1259 OID 114811)
-- Name: vw_docentes_por_contrato; Type: VIEW; Schema: general; Owner: postgres
--

CREATE VIEW general.vw_docentes_por_contrato AS
 SELECT tipo_contrato,
    count(*) AS total_docentes,
    sum(horas_max_sem) AS total_horas_maximas,
    sum(horas_asignadas) AS total_horas_asignadas,
    sum(horas_disponibles) AS total_horas_disponibles,
    round(avg(horas_asignadas), 2) AS promedio_horas_asignadas
   FROM personas.docentes d
  WHERE (estatus = 'A'::bpchar)
  GROUP BY tipo_contrato;


ALTER VIEW general.vw_docentes_por_contrato OWNER TO postgres;

--
-- TOC entry 5667 (class 0 OID 0)
-- Dependencies: 291
-- Name: VIEW vw_docentes_por_contrato; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON VIEW general.vw_docentes_por_contrato IS 'Vista para comparar la carga horaria entre docentes de Estipendio y Contratados. Muestra totales y promedios por tipo de contrato. Creada en v3.8.';


--
-- TOC entry 275 (class 1259 OID 65855)
-- Name: asig_carga_horarias; Type: TABLE; Schema: horarios; Owner: postgres
--

CREATE TABLE horarios.asig_carga_horarias (
    id_asig integer NOT NULL,
    id_doc integer,
    id_esp integer,
    id_dia smallint NOT NULL,
    id_malla integer,
    id_per integer,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    tipo_actividad character varying(20) DEFAULT 'Carga Académica'::character varying,
    observaciones text,
    estatus character(1) DEFAULT 'A'::bpchar NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizar timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_sec integer,
    CONSTRAINT chk_asig_actividad CHECK (((tipo_actividad)::text = ANY ((ARRAY['Carga Académica'::character varying, 'Asesoría'::character varying, 'Preparación'::character varying])::text[]))),
    CONSTRAINT chk_asig_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar]))),
    CONSTRAINT chk_asig_horario CHECK ((hora_inicio < hora_fin))
);


ALTER TABLE horarios.asig_carga_horarias OWNER TO postgres;

--
-- TOC entry 5668 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON TABLE horarios.asig_carga_horarias IS 'Tabla para la Asignación de carga horaria: qué docente, en qué espacio, qué día y a qué hora';


--
-- TOC entry 5669 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.id_asig; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_asig IS 'Identificador único de la asignación de horario';


--
-- TOC entry 5670 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.id_doc; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_doc IS 'Identificador como entero del docente asignado';


--
-- TOC entry 5671 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.id_esp; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_esp IS 'Identificador entero del espacio físico asignado';


--
-- TOC entry 5672 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.id_dia; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_dia IS 'Identificador del día de la semana';


--
-- TOC entry 5673 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.id_malla; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_malla IS 'Identificador de la malla curricular (materia específica)';


--
-- TOC entry 5674 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.id_per; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_per IS 'Identificador del período académico';


--
-- TOC entry 5675 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.hora_inicio; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.hora_inicio IS 'Hora exacta de inicio de la clase';


--
-- TOC entry 5676 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.hora_fin; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.hora_fin IS 'Hora exacta de fin de la clase';


--
-- TOC entry 5677 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.tipo_actividad; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.tipo_actividad IS 'Tipode actividad: Carga Académica, Asesoría, Preparación';


--
-- TOC entry 5678 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.observaciones; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.observaciones IS 'Notas adicionales sobre la asignación';


--
-- TOC entry 5679 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.estatus; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.estatus IS 'Estado de borrado: A = Activo, I = Inactivo';


--
-- TOC entry 5680 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.creado; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.creado IS 'Fecha y hora exacta en la que se registró o creó la asignación de la carga horaria en el sistema.';


--
-- TOC entry 5681 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.actualizar; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.actualizar IS 'Fecha y hora de la última modificación o actualización realizada al registro de la asignación.';


--
-- TOC entry 5682 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN asig_carga_horarias.id_sec; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON COLUMN horarios.asig_carga_horarias.id_sec IS 'Sección a la que pertenece esta asignación (NULL para asesorías o actividades sin sección específica)';


--
-- TOC entry 5683 (class 0 OID 0)
-- Dependencies: 275
-- Name: CONSTRAINT chk_asig_actividad ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT chk_asig_actividad ON horarios.asig_carga_horarias IS 'Tipo de actividad: Carga Académica (docencia), Asesoría (tutoría) o Preparación (planificación).';


--
-- TOC entry 5684 (class 0 OID 0)
-- Dependencies: 275
-- Name: CONSTRAINT chk_asig_est ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT chk_asig_est ON horarios.asig_carga_horarias IS 'Borrado lógico: A = Activo, I = Inactivo. No existe estado Suspendido.';


--
-- TOC entry 5685 (class 0 OID 0)
-- Dependencies: 275
-- Name: CONSTRAINT chk_asig_horario ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT chk_asig_horario ON horarios.asig_carga_horarias IS 'Restricción que garantiza la coherencia lógica de las horas establecidas en la asignación (ej. que la hora de inicio sea estrictamente anterior a la hora de fin).';


--
-- TOC entry 273 (class 1259 OID 65809)
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
    CONSTRAINT chk_espaciios_tipo CHECK (((tipo_espacio)::text = ANY (ARRAY['Aula'::text, 'Laboratorio'::text, 'Auditorio'::text, 'Cancha'::text]))),
    CONSTRAINT chk_espacios_est CHECK ((estatus = ANY (ARRAY['A'::bpchar, 'I'::bpchar])))
);


ALTER TABLE infraestructura.espacios_fis OWNER TO postgres;

--
-- TOC entry 5686 (class 0 OID 0)
-- Dependencies: 273
-- Name: TABLE espacios_fis; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON TABLE infraestructura.espacios_fis IS 'Tabla para almacenar los espacios físicos de la universidad';


--
-- TOC entry 5687 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN espacios_fis.id_mun; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.id_mun IS 'Identificador como entero del municipio';


--
-- TOC entry 5688 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN espacios_fis.nombre_centro; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.nombre_centro IS 'Nombre de donde estan viendo clases los estudiantes';


--
-- TOC entry 5689 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN espacios_fis.ubicacion; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.ubicacion IS 'Lugar en el que estan';


--
-- TOC entry 5690 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN espacios_fis.tipo_espacio; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.tipo_espacio IS 'Tipo de espacio en el que se encuentran los alumnos';


--
-- TOC entry 5691 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN espacios_fis.capacidad; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.capacidad IS 'Capacidad máxima de las aulas por estudiante';


--
-- TOC entry 5692 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN espacios_fis.equipamiento; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.equipamiento IS 'Espacio para colocar como se encuentra el aula que tienen';


--
-- TOC entry 5693 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN espacios_fis.disponibilidad; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON COLUMN infraestructura.espacios_fis.disponibilidad IS 'Mostar la disponibilidad que tiene el aula como un booleano. Ej: TRUE=> si, FALSE =>no';


--
-- TOC entry 292 (class 1259 OID 114815)
-- Name: vw_ocupacion_aulas_sabado; Type: VIEW; Schema: general; Owner: postgres
--

CREATE VIEW general.vw_ocupacion_aulas_sabado AS
 SELECT ef.ubicacion AS aula,
    ef.nombre_centro,
    count(a.id_asig) AS total_asignaciones_sabado,
    sum((EXTRACT(epoch FROM (a.hora_fin - a.hora_inicio)) / 3600.0)) AS horas_ocupadas
   FROM (infraestructura.espacios_fis ef
     LEFT JOIN horarios.asig_carga_horarias a ON (((ef.id_esp = a.id_esp) AND (a.id_dia = ( SELECT dias_laborales.id_dia
           FROM general.dias_laborales
          WHERE ((dias_laborales.dia)::text = 'Sábado'::text))) AND (a.estatus = 'A'::bpchar))))
  WHERE (ef.estatus = 'A'::bpchar)
  GROUP BY ef.ubicacion, ef.nombre_centro
  ORDER BY (sum((EXTRACT(epoch FROM (a.hora_fin - a.hora_inicio)) / 3600.0))) DESC;


ALTER VIEW general.vw_ocupacion_aulas_sabado OWNER TO postgres;

--
-- TOC entry 5694 (class 0 OID 0)
-- Dependencies: 292
-- Name: VIEW vw_ocupacion_aulas_sabado; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON VIEW general.vw_ocupacion_aulas_sabado IS 'Vista para monitorear la ocupación de las 15 aulas rotativas los sábados en la Escuela Bustamante. Requisito de la Vicerrectora. Creada en v3.8.';


--
-- TOC entry 303 (class 1259 OID 114990)
-- Name: vw_permisos_efectivos_usuario; Type: VIEW; Schema: general; Owner: postgres
--

CREATE VIEW general.vw_permisos_efectivos_usuario AS
 SELECT u.id_usu,
    u.username,
    r.rol,
    m.codigo AS modulo,
    m.nombre AS modulo_nombre,
    p.codigo AS permiso,
    p.nombre AS permiso_nombre,
    COALESCE(pu.alcance, pr.alcance) AS alcance_efectivo,
        CASE
            WHEN (pu.alcance IS NOT NULL) THEN 'Personalizado'::text
            ELSE 'Heredado del rol'::text
        END AS origen
   FROM (((((general.usuarios u
     JOIN general.roles r ON ((u.id_rol = r.id_rol)))
     CROSS JOIN general.modulos m)
     CROSS JOIN general.permisos p)
     LEFT JOIN general.permisos_rol pr ON (((pr.id_rol = u.id_rol) AND (pr.id_mod = m.id_mod) AND (pr.id_perm = p.id_perm) AND (pr.estatus = 'A'::bpchar))))
     LEFT JOIN general.permisos_usuario pu ON (((pu.id_usu = u.id_usu) AND (pu.id_mod = m.id_mod) AND (pu.id_perm = p.id_perm) AND (pu.estatus = 'A'::bpchar))))
  WHERE ((u.estatus = 'A'::bpchar) AND (r.estatus = 'A'::bpchar) AND (m.estatus = 'A'::bpchar));


ALTER VIEW general.vw_permisos_efectivos_usuario OWNER TO postgres;

--
-- TOC entry 5695 (class 0 OID 0)
-- Dependencies: 303
-- Name: VIEW vw_permisos_efectivos_usuario; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON VIEW general.vw_permisos_efectivos_usuario IS 'Vista que muestra los permisos efectivos de cada usuario (combinando rol + override personal). Útil para auditoría de seguridad. Creada en v3.8.';


--
-- TOC entry 290 (class 1259 OID 114806)
-- Name: vw_resumen_estadistico; Type: VIEW; Schema: general; Owner: postgres
--

CREATE VIEW general.vw_resumen_estadistico AS
 SELECT ( SELECT count(*) AS count
           FROM personas.docentes
          WHERE (docentes.estatus = 'A'::bpchar)) AS total_docentes_activos,
    ( SELECT count(*) AS count
           FROM personas.estudiantes
          WHERE (estudiantes.estatus = 'A'::bpchar)) AS total_estudiantes_activos,
    ( SELECT count(*) AS count
           FROM horarios.asig_carga_horarias
          WHERE (asig_carga_horarias.estatus = 'A'::bpchar)) AS total_asignaciones_activas,
    ( SELECT COALESCE(sum(docentes.horas_asignadas), (0)::bigint) AS "coalesce"
           FROM personas.docentes
          WHERE (docentes.estatus = 'A'::bpchar)) AS total_horas_asignadas,
    ( SELECT COALESCE(sum(docentes.horas_disponibles), (0)::bigint) AS "coalesce"
           FROM personas.docentes
          WHERE (docentes.estatus = 'A'::bpchar)) AS total_horas_disponibles,
    ( SELECT count(*) AS count
           FROM academico.programas
          WHERE (programas.estatus = 'A'::bpchar)) AS total_programas_activos,
    ( SELECT count(*) AS count
           FROM infraestructura.espacios_fis
          WHERE ((espacios_fis.estatus = 'A'::bpchar) AND (espacios_fis.disponibilidad = true))) AS aulas_disponibles;


ALTER VIEW general.vw_resumen_estadistico OWNER TO postgres;

--
-- TOC entry 5696 (class 0 OID 0)
-- Dependencies: 290
-- Name: VIEW vw_resumen_estadistico; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON VIEW general.vw_resumen_estadistico IS 'Vista de agregación para alimentar el dashboard con métricas clave del sistema: total de docentes, estudiantes, asignaciones, horas y aulas disponibles. Creada en v3.8.';


--
-- TOC entry 274 (class 1259 OID 65854)
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
-- TOC entry 5697 (class 0 OID 0)
-- Dependencies: 274
-- Name: asig_carga_horarias_id_asig_seq; Type: SEQUENCE OWNED BY; Schema: horarios; Owner: postgres
--

ALTER SEQUENCE horarios.asig_carga_horarias_id_asig_seq OWNED BY horarios.asig_carga_horarias.id_asig;


--
-- TOC entry 272 (class 1259 OID 65808)
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
-- TOC entry 5698 (class 0 OID 0)
-- Dependencies: 272
-- Name: espacios_fis_id_esp_seq; Type: SEQUENCE OWNED BY; Schema: infraestructura; Owner: postgres
--

ALTER SEQUENCE infraestructura.espacios_fis_id_esp_seq OWNED BY infraestructura.espacios_fis.id_esp;


--
-- TOC entry 271 (class 1259 OID 65788)
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
-- TOC entry 5699 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE disponibilidad_docente; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON TABLE personas.disponibilidad_docente IS 'Tabla para ver la disponibilidad de los docentes';


--
-- TOC entry 5700 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN disponibilidad_docente.id_disp; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.disponibilidad_docente.id_disp IS 'Identificador serializado de la disponibilidad para os docentes.Ej:1,2,3,4,5,';


--
-- TOC entry 5701 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN disponibilidad_docente.id_doc; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.disponibilidad_docente.id_doc IS 'Identificador entero del docente como un entero';


--
-- TOC entry 5702 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN disponibilidad_docente.id_dia; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.disponibilidad_docente.id_dia IS 'Identificador del dia';


--
-- TOC entry 5703 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN disponibilidad_docente.hora_inicio; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.disponibilidad_docente.hora_inicio IS 'Hora en la que inicia el ciclo';


--
-- TOC entry 5704 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN disponibilidad_docente.hora_fin; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON COLUMN personas.disponibilidad_docente.hora_fin IS 'Hora de fin';


--
-- TOC entry 5705 (class 0 OID 0)
-- Dependencies: 271
-- Name: CONSTRAINT chk_disp_est ON disponibilidad_docente; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_disp_est ON personas.disponibilidad_docente IS 'Revisa el estado de la disponibilidad';


--
-- TOC entry 5706 (class 0 OID 0)
-- Dependencies: 271
-- Name: CONSTRAINT chk_disp_horarios ON disponibilidad_docente; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT chk_disp_horarios ON personas.disponibilidad_docente IS 'revisa las horas';


--
-- TOC entry 270 (class 1259 OID 65787)
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
-- TOC entry 5707 (class 0 OID 0)
-- Dependencies: 270
-- Name: disponibilidad_docente_id_disp_seq; Type: SEQUENCE OWNED BY; Schema: personas; Owner: postgres
--

ALTER SEQUENCE personas.disponibilidad_docente_id_disp_seq OWNED BY personas.disponibilidad_docente.id_disp;


--
-- TOC entry 266 (class 1259 OID 65727)
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
-- TOC entry 5708 (class 0 OID 0)
-- Dependencies: 266
-- Name: docentes_id_doc_seq; Type: SEQUENCE OWNED BY; Schema: personas; Owner: postgres
--

ALTER SEQUENCE personas.docentes_id_doc_seq OWNED BY personas.docentes.id_doc;


--
-- TOC entry 268 (class 1259 OID 65763)
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
-- TOC entry 5709 (class 0 OID 0)
-- Dependencies: 268
-- Name: estudiantes_id_est_seq; Type: SEQUENCE OWNED BY; Schema: personas; Owner: postgres
--

ALTER SEQUENCE personas.estudiantes_id_est_seq OWNED BY personas.estudiantes.id_est;


--
-- TOC entry 288 (class 1259 OID 66163)
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
-- TOC entry 305 (class 1259 OID 139604)
-- Name: vw_horario_completo_docente; Type: VIEW; Schema: personas; Owner: postgres
--

CREATE VIEW personas.vw_horario_completo_docente AS
 SELECT d.cedula,
    (((d.nombre)::text || ' '::text) || (d.apellido)::text) AS nombre_completo_docente,
    d.tipo_contrato,
    p.codigo AS cod_programa,
    p.nombre AS programa,
    s.codigo AS cod_seccion,
    m.codigo AS cod_materia,
    m.nombre AS materia,
    m.unidades_creditos AS uc,
    eje.codigo AS cod_eje,
    eje.nombre AS eje_formativo,
    pa.nombre AS periodo_academico,
    dl.dia,
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
     LEFT JOIN academico.secciones s ON ((a.id_sec = s.id_sec)))
     LEFT JOIN infraestructura.espacios_fis esp ON ((a.id_esp = esp.id_esp)))
  WHERE ((d.estatus = 'A'::bpchar) AND (a.estatus = 'A'::bpchar));


ALTER VIEW personas.vw_horario_completo_docente OWNER TO postgres;

--
-- TOC entry 5710 (class 0 OID 0)
-- Dependencies: 305
-- Name: VIEW vw_horario_completo_docente; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON VIEW personas.vw_horario_completo_docente IS 'Vista completa del horario docente incluyendo sección. Recreada para incluir información de sección.';


--
-- TOC entry 4976 (class 2604 OID 65918)
-- Name: ejes_formativos id_eje; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.ejes_formativos ALTER COLUMN id_eje SET DEFAULT nextval('academico.ejes_formativos_id_eje_seq'::regclass);


--
-- TOC entry 4982 (class 2604 OID 65957)
-- Name: malla_curricular id_malla; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.malla_curricular ALTER COLUMN id_malla SET DEFAULT nextval('academico.malla_curricular_id_malla_seq'::regclass);


--
-- TOC entry 4978 (class 2604 OID 65934)
-- Name: materias id_mat; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.materias ALTER COLUMN id_mat SET DEFAULT nextval('academico.materias_id_mat_seq'::regclass);


--
-- TOC entry 5005 (class 2604 OID 114944)
-- Name: notas id_nota; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.notas ALTER COLUMN id_nota SET DEFAULT nextval('academico.notas_id_nota_seq'::regclass);


--
-- TOC entry 4987 (class 2604 OID 65980)
-- Name: periodos_academicos id_per; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.periodos_academicos ALTER COLUMN id_per SET DEFAULT nextval('academico.periodos_academicos_id_per_seq'::regclass);


--
-- TOC entry 4972 (class 2604 OID 65893)
-- Name: programas id_pro; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.programas ALTER COLUMN id_pro SET DEFAULT nextval('academico.programas_id_pro_seq'::regclass);


--
-- TOC entry 4992 (class 2604 OID 66006)
-- Name: secciones id_sec; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.secciones ALTER COLUMN id_sec SET DEFAULT nextval('academico.secciones_id_sec_seq'::regclass);


--
-- TOC entry 4942 (class 2604 OID 65714)
-- Name: aud_mov id_aud; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.aud_mov ALTER COLUMN id_aud SET DEFAULT nextval('general.aud_mov_id_aud_seq'::regclass);


--
-- TOC entry 4940 (class 2604 OID 65701)
-- Name: credenciales id_cre; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.credenciales ALTER COLUMN id_cre SET DEFAULT nextval('general.credenciales_id_cre_seq'::regclass);


--
-- TOC entry 4934 (class 2604 OID 65669)
-- Name: dias_laborales id_dia; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.dias_laborales ALTER COLUMN id_dia SET DEFAULT nextval('general.dias_laborales_id_dia_seq'::regclass);


--
-- TOC entry 4997 (class 2604 OID 114844)
-- Name: modulos id_mod; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.modulos ALTER COLUMN id_mod SET DEFAULT nextval('general.modulos_id_mod_seq'::regclass);


--
-- TOC entry 4932 (class 2604 OID 65655)
-- Name: municipios id_mun; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.municipios ALTER COLUMN id_mun SET DEFAULT nextval('general.municipios_id_mun_seq'::regclass);


--
-- TOC entry 4999 (class 2604 OID 114861)
-- Name: permisos id_perm; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos ALTER COLUMN id_perm SET DEFAULT nextval('general.permisos_id_perm_seq'::regclass);


--
-- TOC entry 5000 (class 2604 OID 114875)
-- Name: permisos_rol id_pr; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos_rol ALTER COLUMN id_pr SET DEFAULT nextval('general.permisos_rol_id_pr_seq'::regclass);


--
-- TOC entry 5003 (class 2604 OID 114911)
-- Name: permisos_usuario id_pu; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos_usuario ALTER COLUMN id_pu SET DEFAULT nextval('general.permisos_usuario_id_pu_seq'::regclass);


--
-- TOC entry 4930 (class 2604 OID 65640)
-- Name: roles id_rol; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.roles ALTER COLUMN id_rol SET DEFAULT nextval('general.roles_id_rol_seq'::regclass);


--
-- TOC entry 4936 (class 2604 OID 65684)
-- Name: usuarios id_usu; Type: DEFAULT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.usuarios ALTER COLUMN id_usu SET DEFAULT nextval('general.usuarios_id_usu_seq'::regclass);


--
-- TOC entry 4967 (class 2604 OID 65858)
-- Name: asig_carga_horarias id_asig; Type: DEFAULT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias ALTER COLUMN id_asig SET DEFAULT nextval('horarios.asig_carga_horarias_id_asig_seq'::regclass);


--
-- TOC entry 4959 (class 2604 OID 65812)
-- Name: espacios_fis id_esp; Type: DEFAULT; Schema: infraestructura; Owner: postgres
--

ALTER TABLE ONLY infraestructura.espacios_fis ALTER COLUMN id_esp SET DEFAULT nextval('infraestructura.espacios_fis_id_esp_seq'::regclass);


--
-- TOC entry 4957 (class 2604 OID 65791)
-- Name: disponibilidad_docente id_disp; Type: DEFAULT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.disponibilidad_docente ALTER COLUMN id_disp SET DEFAULT nextval('personas.disponibilidad_docente_id_disp_seq'::regclass);


--
-- TOC entry 4945 (class 2604 OID 65731)
-- Name: docentes id_doc; Type: DEFAULT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.docentes ALTER COLUMN id_doc SET DEFAULT nextval('personas.docentes_id_doc_seq'::regclass);


--
-- TOC entry 4953 (class 2604 OID 65767)
-- Name: estudiantes id_est; Type: DEFAULT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes ALTER COLUMN id_est SET DEFAULT nextval('personas.estudiantes_id_est_seq'::regclass);


--
-- TOC entry 5420 (class 0 OID 65915)
-- Dependencies: 279
-- Data for Name: ejes_formativos; Type: TABLE DATA; Schema: academico; Owner: postgres
--

COPY academico.ejes_formativos (id_eje, codigo, nombre, descripcion, estatus) FROM stdin;
1	P	Proyecto	Proyecto Práctica Docente / Socio Integrador	A
2	S	Socio-Crítico	Formación Socio Crítica	A
3	D	Disciplinario	Eje Disciplinario	A
4	E	Epistemológico	Eje Epistemológico (Énfasis en Educación Especial)	A
5	I	Interdisciplinario	Eje Interdisciplinario	A
6	A	Actividades Acreditables	Actividades Académicas Acreditables	A
\.


--
-- TOC entry 5424 (class 0 OID 65954)
-- Dependencies: 283
-- Data for Name: malla_curricular; Type: TABLE DATA; Schema: academico; Owner: postgres
--

COPY academico.malla_curricular (id_malla, id_pro, id_mat, trayecto, periodo, orden, perequisito_id_mat, estatus, creado, actualizar) FROM stdin;
1	1	1	1	1	1	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
2	1	2	1	1	2	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
3	1	3	1	1	3	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
4	1	4	1	1	4	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
5	1	5	1	2	1	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
6	1	6	1	2	2	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
7	1	7	1	2	3	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
8	1	8	1	2	4	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
9	1	9	1	3	1	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
10	1	10	1	3	2	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
11	1	11	1	3	3	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
12	1	12	1	3	4	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
52	2	52	1	1	2	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
53	2	53	1	1	3	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
54	2	54	1	1	4	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
55	2	55	1	1	5	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
56	2	56	1	1	6	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
57	2	57	1	2	1	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
58	2	58	1	2	2	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
59	2	59	1	2	3	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
60	2	60	1	2	4	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
61	2	61	1	2	5	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
62	2	62	1	2	6	\N	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:13.667971-04
51	2	51	1	1	1	53	A	2026-10-02 19:07:13.667971-04	2026-10-02 19:07:28.351823-04
13	1	13	2	1	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
14	1	14	2	1	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
15	1	15	2	1	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
16	1	16	2	1	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
17	1	17	2	2	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
18	1	18	2	2	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
19	1	19	2	2	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
20	1	20	2	2	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
21	1	21	2	3	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
22	1	22	2	3	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
23	1	23	2	3	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
24	1	24	2	3	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
25	1	25	2	3	5	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
26	1	26	3	1	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
27	1	27	3	1	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
28	1	28	3	1	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
29	1	29	3	1	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
30	1	30	3	2	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
31	1	31	3	2	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
32	1	32	3	2	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
33	1	33	3	2	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
34	1	34	3	3	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
35	1	35	3	3	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
36	1	36	3	3	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
37	1	37	3	3	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
38	1	38	4	1	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
39	1	39	4	1	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
40	1	40	4	1	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
41	1	41	4	1	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
42	1	42	4	2	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
43	1	43	4	2	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
44	1	44	4	2	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
45	1	45	4	2	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
46	1	46	4	3	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
47	1	47	4	3	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
48	1	48	4	3	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
49	1	49	4	3	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
50	1	50	4	3	5	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
63	2	63	2	1	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
64	2	64	2	1	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
65	2	65	2	1	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
66	2	66	2	1	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
67	2	67	2	1	5	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
68	2	68	2	2	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
69	2	69	2	2	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
70	2	70	2	2	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
71	2	71	2	2	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
72	2	72	2	2	5	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
73	2	73	2	2	6	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
74	2	74	3	1	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
75	2	75	3	1	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
76	2	76	3	1	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
77	2	77	3	1	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
78	2	78	3	1	5	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
79	2	79	3	1	6	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
80	2	80	3	2	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
81	2	81	3	2	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
82	2	82	3	2	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
83	2	83	3	2	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
84	2	84	3	2	5	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
85	2	85	4	1	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
86	2	86	4	1	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
87	2	87	4	1	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
88	2	88	4	1	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
89	2	89	4	1	5	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
90	2	90	4	2	1	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
91	2	91	4	2	2	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
92	2	92	4	2	3	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
93	2	93	4	2	4	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
94	2	94	4	2	5	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
95	2	95	4	2	6	\N	A	2026-10-02 19:07:13.667971-04	2026-11-16 23:55:27.897546-04
\.


--
-- TOC entry 5422 (class 0 OID 65931)
-- Dependencies: 281
-- Data for Name: materias; Type: TABLE DATA; Schema: academico; Owner: postgres
--

COPY academico.materias (id_mat, codigo, nombre, id_eje, unidades_creditos, descripcion, estatus, creado, actualizar) FROM stdin;
1	PRIT1PDC	El Docente y su Contexto Educativo (Autobiografía y caracterización del entorno)	1	7	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
2	PRIT1SCE	Ciencias de la Educación	2	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
3	PRIT1DDHI	Desarrollo humano integral	3	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
4	PRIT1IUSL	Uso social de la lengua (hablar, escuchar, leer y escribir) del docente	5	3	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
5	PRIT1PTRD	Técnicas e instrumentos de recolección de datos e información	1	7	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
6	PRIT1SPLN	Pensamiento pedagógico liberador nuestroamericano	2	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
7	PRIT1DISI	Identidad, arraigo, soberanía e Independencia	3	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
8	PRIT1ILE	Legislación Educativa y las Leyes del Poder Popular	5	3	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
9	PRIT1PPI	Proyecto I: Diagnóstico Participativo Comunitario	1	7	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
10	PRIT1SPPSR	Pensamiento pedagógico de Simón Rodríguez	2	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
11	PRIT1DGH	Geo-Histórico	3	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
12	PRIT1IFPFP	Fundamentos políticos, filosóficos y pedagógicos de la Educación Bolivariana	5	3	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
13	PRIT2PEPIE	Enfoques y Paradigmas de la Investigación Educativa	1	7	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
14	PRIT2SPC	Pedagogía Crítica	2	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
15	PRIT2DMPV	Matemática para la comprensión del mundo y la vida	3	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
16	PRIT2IHPV	Historia de la Educación Primaria en Venezuela	5	3	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
17	PRIT2PBMS	Bases teórico-metodológicas de la sistematización y los relatos pedagógicos	1	7	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
18	PRIT2SFNR	Formación del Nuevo Republicano	2	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
19	PRIT2DDCI	Didáctica crítica e integradora	3	3	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
20	PRIT2IFSD	Nueva subjetividad y función social del docente bolivariano	5	4	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
21	PRIT2PPII	Proyecto II: Registro y sistematización de experiencias	1	7	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
22	PRIT2SOVPE	Nuevas lógicas de organización y valoración de los procesos educativos	2	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
23	PRIT2DPEA	Planificación y evaluación de los aprendizajes	3	3	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
24	PRIT2IRAE	Recursos para el Aprendizaje y la Enseñanza	5	4	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
25	AAC1	Actividades académicas acreditables I	6	6	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
26	PRINT3PBMIAPT	Bases teórico-metodológicas de la IAPT aplicadas a la educación	1	7	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
27	PRIT3SDPR	Docencia y práctica reflexiva, innovadora y creativa	2	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
28	PRIT3DEP	La Educación Popular como alternativa para el trabajo sociocomunitario	3	4	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
29	PRIT3IISIE	Integración social e inclusión en la Escuela Primaria	5	3	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
30	PRINT3PIAPT	IAPT en la praxis pedagógica	1	7	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
31	PRIT3SRP	Relaciones de poder	2	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
32	PRIT3DELE	Perspectivas en la enseñanza y aprendizaje de la lectura y la escritura	3	4	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
33	PRIT3IETSP	Educación, trabajo social liberador y espacios productivos en la Escuela Primaria	5	3	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
34	PRINT3PPIII	Proyecto III: Socialización de la práctica pedagógica a través de la IAPT	1	7	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
35	PRIT3SCCP	Cultura de convivencia y paz	2	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
36	PRIT3DAMSM	El arte como modo de vivir, sentir y mirar lo estético	3	4	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
37	PRIT3IEI	Educación Intercultural	5	4	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
38	PRINT4PES	Ecología de los saberes	1	7	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
39	PRIT4SETC	Educación, territorialización y comunalización	2	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
40	PRIT4DLCT	Lenguaje aplicado en las Ciencias y la Tecnología	3	4	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
41	PRIT4IFE	Retos y desafíos de la educación ambiental: Formación ecosocialista	5	4	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
42	PRINT4PCEFI	Comunalización de los espacios de formación e investigación	1	7	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
43	PRIT4SDSC	Democratización del saber científico	2	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
44	PRIT4DEIS	Educación Integral de la Sexualidad en la Educación Primaria	3	4	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
45	PRIT4IOEF	Orientación Escolar y Familiar	5	4	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
46	PRINT4PPIV	Proyecto IV: Experiencia de Transformación Comunitaria	1	7	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
47	PRIT4SCJPE	Contexto jurídico – político de la comunalización de la educación en Venezuela	2	2	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
48	PRIT4DEFDR	Educación Física, Deporte y Recreación	3	4	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
49	PRIT4IEALPEA	El cuerpo, la emocionalidad, la afectividad y la lúdica en los procesos de enseñanza y aprendizaje	5	4	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
50	AAC2	Actividades académicas acreditables II	6	6	\N	A	2026-10-02 19:04:20.344137-04	2026-10-02 19:04:20.344137-04
51	EDUESPT1PSI1	Proyecto Socio Integrador I	1	7	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
52	EDUESPT1FSCI	Formación Socio Crítica I	2	4	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
53	EDUESPIT1NN	Neurofisiología	4	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
54	EDUESPST1SEV	Sistema Educativo de Venezuela	4	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
55	EDUESPDT1DH	Desarrollo Humano I	5	2	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
56	EDUESPT1EDS	Educación, Desarrollo y Sociedad	5	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
57	EDUESPT1PSI2	Proyecto Socio Integrador II	1	7	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
58	EDUESPT1FSCII	Formación Socio Crítica II	2	4	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
59	EDUESPT1TEMPC	Tendencias, enfoques y modelos de la pedagogía contemporánea	4	2	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
60	EDUESPT1LSV	Idiomas I (Lengua de Señas Venezolanas)	4	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
61	EDUESPDT1DHII	Desarrollo Humano II	5	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
62	EDUESPT1TIC	Introducción a las TIC	5	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
63	EDUESPT2PSI3	Proyecto Socio Integrador III	1	7	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
64	EDUESPT2FSCIII	Formación Socio Crítica III	2	4	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
65	EDUESPT2PEA	Planificación de los Entornos de Aprendizaje	4	2	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
66	EDUESPT2PASH	Procesos de Aprendizaje en el Ser Humano	5	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
67	EDUESPT2PPSI	Prevención y Promoción para la Salud Integral	5	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
68	EDUESPT2PSI4	Proyecto Socio Integrador IV	1	7	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
69	EDUESPT2FSCIV	Formación Socio Crítica IV	2	4	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
70	EDUESPT2EIPDC	Educación Integral para la Persona con Discapacidad Cognitiva	4	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
71	EDUESPT2SAC	Sistemas Alternativos de Comunicación	5	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
72	EDUESPT2SBRA	Idiomas II (Sistema Braille)	5	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
73	ACC1	Actividades académicas acreditables I	6	6	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
74	EDUESPT3PSI5	Proyecto Socio Integrador V	1	7	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
75	EDUESPT3FSCV	Formación Socio Crítica V	2	4	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
76	EDUESPT3EIEDA	Educación Integral para Escolares con Dificultades de Aprendizaje	4	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
77	EDUESPT3EIPA	Educación Integral para la Persona con Autismo	4	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
78	EDUESPT3EEESP	Evaluación para la Educación Especial	5	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
79	EDUESPT3EACLEM	Enseñanza y Adaptaciones Curriculares para la Lectura, Escritura y Matemática I	5	4	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
80	EDUESPT3PSI6	Proyecto Socio Integrador VI	1	9	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
81	EDUESPT3FSCVI	Formación Socio Crítica VI	2	4	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
82	EDUESPT3EIPDFM	Educación Integral para las Personas con Discapacidad Físico Motora	4	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
83	EDUESPT3EIPAP	Educación Integral para la Persona con Alta Potencialidad	4	2	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
84	EDUESPT3EACLEMI	Enseñanza y Adaptaciones Curriculares para la Lectura, Escritura y Matemática II	5	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
85	EDUESPT4PSI7	Proyecto Socio Integrador VII	1	9	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
86	EDUESPT4FSCVII	Formación Socio Crítica VII	2	4	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
87	EDUESPT4EIPDSC	Educación Integral para las Personas con Discapacidad Sensorial y Comunicacional	4	2	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
88	EDUESPT4EIPEOD	Educación Integral para las Personas con Enfermedades Orgánicas Discapacitantes	4	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
89	EDUESPT4PAIT	Prevención y Atención Integral Temprana	5	2	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
90	EDUESPT4PSI8	Proyecto Socio Integrador VIII	1	9	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
91	EDUESPT4FSCVIII	Formación Socio Crítica VIII	2	4	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
92	EDUESPT4OILSC	Orientación para la Integración Laboral y Socio Comunitaria	4	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
93	EDUESPT4EOEFC	Estrategias para la Orientación Educativa, Familiar y Comunitaria	4	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
94	EDUESPT4AGEESP	Administración y Gestión de la Educación Especial	5	3	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
95	ACC2	Actividades académicas acreditables II	6	6	\N	A	2026-10-02 19:04:33.842483-04	2026-10-02 19:04:33.842483-04
\.


--
-- TOC entry 5438 (class 0 OID 114941)
-- Dependencies: 302
-- Data for Name: notas; Type: TABLE DATA; Schema: academico; Owner: postgres
--

COPY academico.notas (id_nota, id_est, id_malla, id_per, nota, tipo_evaluacion, observaciones, fecha_registro, estatus, creado, actualizar) FROM stdin;
29	9	27	1	8.00	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
30	9	28	1	11.25	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
31	9	29	1	14.50	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
33	12	27	1	17.75	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
34	12	28	1	8.00	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
35	12	29	1	11.25	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
37	13	27	1	12.00	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
1	7	26	1	18.00	Final	Acta de demostración — Proyecto III (T3·P1)	2026-11-13 16:55:56.866854-04	I	2026-11-13 16:55:56.866854-04	2026-11-17 00:01:05.65978-04
2	8	26	1	15.50	Final	Acta de demostración — Proyecto III (T3·P1)	2026-11-13 16:55:56.866854-04	I	2026-11-13 16:55:56.866854-04	2026-11-17 00:01:05.65978-04
3	9	26	1	12.00	Final	Acta de demostración — Proyecto III (T3·P1)	2026-11-13 16:55:56.866854-04	I	2026-11-13 16:55:56.866854-04	2026-11-17 00:01:05.65978-04
4	10	26	1	16.75	Final	Acta de demostración — Proyecto III (T3·P1)	2026-11-13 16:55:56.866854-04	I	2026-11-13 16:55:56.866854-04	2026-11-17 00:01:05.65978-04
5	11	26	1	9.50	Final	Acta de demostración — Proyecto III (T3·P1)	2026-11-13 16:55:56.866854-04	I	2026-11-13 16:55:56.866854-04	2026-11-17 00:01:05.65978-04
6	12	26	1	14.25	Final	Acta de demostración — Proyecto III (T3·P1)	2026-11-13 16:55:56.866854-04	I	2026-11-13 16:55:56.866854-04	2026-11-17 00:01:05.65978-04
10	3	74	2	18.25	Final	Acta de demostración — PSI V (T3·P1)	2026-11-17 00:01:05.65978-04	A	2026-11-17 00:01:05.65978-04	2026-11-17 00:12:12.025187-04
11	4	74	2	11.00	Final	Acta de demostración — PSI V (T3·P1)	2026-11-17 00:01:05.65978-04	A	2026-11-17 00:01:05.65978-04	2026-11-17 00:12:12.025187-04
38	13	28	1	15.25	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
8	1	74	2	16.00	Final	Acta de demostración — PSI V (T3·P1)	2026-11-17 00:01:05.65978-04	A	2026-11-17 00:01:05.65978-04	2026-11-17 00:12:12.025187-04
39	13	29	1	18.50	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
9	2	74	2	13.50	Final	Acta de demostración — PSI V (T3·P1)	2026-11-17 00:01:05.65978-04	A	2026-11-17 00:01:05.65978-04	2026-11-17 00:12:12.025187-04
41	7	27	1	18.50	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
42	7	28	1	9.75	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
43	7	29	1	12.00	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
45	10	27	1	15.25	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
46	10	28	1	18.50	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
13	6	74	2	17.50	Final	Acta de demostración — PSI V (T3·P1)	2026-11-17 00:01:05.65978-04	A	2026-11-17 00:01:05.65978-04	2026-11-20 01:09:24.253805-04
47	10	29	1	9.75	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
49	2	75	2	15.25	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
7	13	26	1	19.00	Final	Acta de demostración — Proyecto III (T3·P1)	2026-11-13 16:55:56.866854-04	A	2026-11-13 16:55:56.866854-04	2026-11-20 01:35:58.829939-04
12	5	74	2	8.75	Final	Acta de demostración — PSI V (T3·P1)	2026-11-17 00:01:05.65978-04	I	2026-11-17 00:01:05.65978-04	2026-11-20 22:35:10.803523-04
21	8	27	1	13.75	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
22	8	28	1	16.00	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
23	8	29	1	19.25	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
25	11	27	1	10.50	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
26	11	28	1	13.75	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
27	11	29	1	16.00	Final	Acta de demostración — carga masiva LPRI T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
50	2	76	2	18.50	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
51	2	77	2	9.75	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
52	2	78	2	12.00	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
53	2	79	2	15.25	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
55	3	75	2	8.50	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
56	3	76	2	11.75	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
57	3	77	2	14.00	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
58	3	78	2	17.25	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
59	3	79	2	8.50	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
61	4	75	2	13.75	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
62	4	76	2	16.00	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
63	4	77	2	19.25	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
64	4	78	2	10.50	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
65	4	79	2	13.75	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
67	5	75	2	18.00	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
68	5	76	2	9.25	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
69	5	77	2	12.50	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
70	5	78	2	15.75	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
71	5	79	2	18.00	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
73	6	75	2	11.25	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
74	6	76	2	14.50	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
75	6	77	2	17.75	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
76	6	78	2	8.00	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
77	6	79	2	11.25	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
79	1	75	2	10.00	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
80	1	76	2	13.25	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
81	1	77	2	16.50	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
82	1	78	2	19.75	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
83	1	79	2	10.00	Final	Acta de demostración — carga masiva LESP T3P1	2026-11-21 09:23:06.684512-04	A	2026-11-21 09:23:06.684512-04	2026-11-21 09:23:06.684512-04
\.


--
-- TOC entry 5426 (class 0 OID 65977)
-- Dependencies: 285
-- Data for Name: periodos_academicos; Type: TABLE DATA; Schema: academico; Owner: postgres
--

COPY academico.periodos_academicos (id_per, nombre, anio, numero_periodo, tipo, fecha_inicio, fecha_fin, activo, estatus, creado, actualizar) FROM stdin;
2	Semestre 2025-I	2025	1	Semestre	2025-02-01	2025-07-30	t	A	2026-10-03 10:55:20.264002-04	2026-10-03 10:55:20.264002-04
1	Trimestre 2025-I	2025	1	Trimestre	2025-01-20	2025-04-30	t	A	2026-10-03 10:55:20.264002-04	2026-11-16 17:51:56.926229-04
\.


--
-- TOC entry 5418 (class 0 OID 65890)
-- Dependencies: 277
-- Data for Name: programas; Type: TABLE DATA; Schema: academico; Owner: postgres
--

COPY academico.programas (id_pro, codigo, nombre, tipo_sistema, total_trayectos, total_uc, estatus, creado, actualizar) FROM stdin;
1	LPRI	PNF Licenciatura en Educación Primaria	Trimestral	4	200	A	2026-10-02 18:44:50.034531-04	2026-10-02 18:44:50.034531-04
2	LESP	PNF Licenciatura en Educación Especial	Semestral	4	182	A	2026-10-02 18:44:50.034531-04	2026-11-16 21:07:35.42185-04
\.


--
-- TOC entry 5428 (class 0 OID 66003)
-- Dependencies: 287
-- Data for Name: secciones; Type: TABLE DATA; Schema: academico; Owner: postgres
--

COPY academico.secciones (id_sec, codigo, id_pro, trayecto, periodo, capacidad_maxima, estatus, creado, actualizar) FROM stdin;
6	NT.2021.APRI.20.01	1	3	1	30	A	2026-11-13 16:55:56.866854-04	2026-11-13 16:55:56.866854-04
5	NT.2021.AESP.20.01	2	3	1	30	A	2026-11-13 16:20:59.408443-04	2026-11-15 10:02:19.072208-04
\.


--
-- TOC entry 5406 (class 0 OID 65711)
-- Dependencies: 265
-- Data for Name: aud_mov; Type: TABLE DATA; Schema: general; Owner: postgres
--

COPY general.aud_mov (id_aud, id_usu, tabla_mod, accion, val_antes, val_despues, fec_hor, dir_ip, estatus) FROM stdin;
2	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T10:53:31.760889-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T11:37:00.288253-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-15 11:37:00.28576-04	\N	A
3	\N	estudiantes	UPDATE	{"cedula": "V-14602580", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 3, "id_mun": 1, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "YASMIN VICTORIA", "estatus": "A", "apellido": "GOMEZ DE OCORO", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-13T16:20:59.408443-04:00"}	{"cedula": "V-14602580", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 3, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "YASMIN VICTORIA", "estatus": "A", "apellido": "GOMEZ DE OCORO", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:37:12.091811-04:00"}	2026-11-15 11:37:12.091811-04	\N	A
4	\N	estudiantes	UPDATE	{"cedula": "V-14606863", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 4, "id_mun": 1, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "LUZ MARINA", "estatus": "A", "apellido": "GOMEZ URIBE", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-13T16:20:59.408443-04:00"}	{"cedula": "V-14606863", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 4, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "LUZ MARINA", "estatus": "A", "apellido": "GOMEZ URIBE", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:37:18.853449-04:00"}	2026-11-15 11:37:18.853449-04	\N	A
5	\N	estudiantes	UPDATE	{"cedula": "V-20618493", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 6, "id_mun": 1, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "SIASKA LORENA", "estatus": "A", "apellido": "GRANADOS JAIMES", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-13T16:20:59.408443-04:00"}	{"cedula": "V-20618493", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 6, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "SIASKA LORENA", "estatus": "A", "apellido": "GRANADOS JAIMES", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:37:23.889603-04:00"}	2026-11-15 11:37:23.889603-04	\N	A
6	\N	estudiantes	UPDATE	{"cedula": "V-13172105", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 8, "id_mun": 1, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "GERMAN YOBANNY", "estatus": "A", "apellido": "GUERRERO MORA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-13T16:55:56.866854-04:00"}	{"cedula": "V-13172105", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 8, "id_mun": 28, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "GERMAN YOBANNY", "estatus": "A", "apellido": "GUERRERO MORA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:37:30.538896-04:00"}	2026-11-15 11:37:30.538896-04	\N	A
7	\N	estudiantes	UPDATE	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 1, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "A", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-13T16:20:59.408443-04:00"}	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "A", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:37:35.337215-04:00"}	2026-11-15 11:37:35.337215-04	\N	A
8	\N	estudiantes	UPDATE	{"cedula": "V-16230741", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 5, "id_mun": 1, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "YURI COROMOTO", "estatus": "A", "apellido": "MESA GARZON", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-13T16:20:59.408443-04:00"}	{"cedula": "V-16230741", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 5, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "YURI COROMOTO", "estatus": "A", "apellido": "MESA GARZON", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:37:39.9358-04:00"}	2026-11-15 11:37:39.9358-04	\N	A
9	\N	estudiantes	UPDATE	{"cedula": "V-10167912", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 11, "id_mun": 1, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "LUZ MARINA", "estatus": "A", "apellido": "MONTILVA DE ORTEGA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-13T16:55:56.866854-04:00"}	{"cedula": "V-10167912", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 11, "id_mun": 28, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "LUZ MARINA", "estatus": "A", "apellido": "MONTILVA DE ORTEGA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:37:45.282443-04:00"}	2026-11-15 11:37:45.282443-04	\N	A
10	\N	estudiantes	UPDATE	{"cedula": "V-14225517", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 2, "id_mun": 1, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "MAYE ALEJANDRA", "estatus": "A", "apellido": "NIÑO COLMENARES", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-13T16:20:59.408443-04:00"}	{"cedula": "V-14225517", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 2, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "MAYE ALEJANDRA", "estatus": "A", "apellido": "NIÑO COLMENARES", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:37:51.28813-04:00"}	2026-11-15 11:37:51.28813-04	\N	A
11	\N	estudiantes	UPDATE	{"cedula": "V-15157076", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 9, "id_mun": 1, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "YADELSY MAGALY", "estatus": "A", "apellido": "NOVA BECERRA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-13T16:55:56.866854-04:00"}	{"cedula": "V-15157076", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 9, "id_mun": 28, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "YADELSY MAGALY", "estatus": "A", "apellido": "NOVA BECERRA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:37:55.416809-04:00"}	2026-11-15 11:37:55.416809-04	\N	A
280	\N	dias_laborales	UPDATE	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "I"}	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "A"}	2026-11-17 07:40:12.14685-04	\N	A
12	\N	estudiantes	UPDATE	{"cedula": "V-15881009", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 12, "id_mun": 1, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "INGRID NAYARI", "estatus": "A", "apellido": "ONTIVEROS ONTIVEROS", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-13T16:55:56.866854-04:00"}	{"cedula": "V-15881009", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 12, "id_mun": 28, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "INGRID NAYARI", "estatus": "A", "apellido": "ONTIVEROS ONTIVEROS", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:37:59.442007-04:00"}	2026-11-15 11:37:59.442007-04	\N	A
13	\N	estudiantes	UPDATE	{"cedula": "V-21003553", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 13, "id_mun": 1, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "ANNY YOHANA", "estatus": "A", "apellido": "SANABRIA ONTIVEROS", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-13T16:55:56.866854-04:00"}	{"cedula": "V-21003553", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 13, "id_mun": 28, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "ANNY YOHANA", "estatus": "A", "apellido": "SANABRIA ONTIVEROS", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:38:05.916871-04:00"}	2026-11-15 11:38:05.916871-04	\N	A
14	\N	estudiantes	UPDATE	{"cedula": "V-13171134", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 7, "id_mun": 1, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "DAYGNE YUBISAY", "estatus": "A", "apellido": "TREJO MORALES", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-13T16:55:56.866854-04:00"}	{"cedula": "V-13171134", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 7, "id_mun": 28, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "DAYGNE YUBISAY", "estatus": "A", "apellido": "TREJO MORALES", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:38:11.129673-04:00"}	2026-11-15 11:38:11.129673-04	\N	A
71	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T20:12:35.705966-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T20:27:43.022117-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-16 20:27:43.015894-04	\N	A
95	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 13, "id_pro": 1, "estatus": "A", "periodo": 4, "id_malla": 13, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 13, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 13, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
96	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 13, "id_pro": 1, "estatus": "A", "periodo": 4, "id_malla": 13, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 13, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 13, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
97	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 14, "id_pro": 1, "estatus": "A", "periodo": 4, "id_malla": 14, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 14, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 14, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
98	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 14, "id_pro": 1, "estatus": "A", "periodo": 4, "id_malla": 14, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 14, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 14, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
99	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 15, "id_pro": 1, "estatus": "A", "periodo": 4, "id_malla": 15, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 15, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 15, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
100	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 15, "id_pro": 1, "estatus": "A", "periodo": 4, "id_malla": 15, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 15, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 15, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
101	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 16, "id_pro": 1, "estatus": "A", "periodo": 4, "id_malla": 16, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 16, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 16, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
281	\N	dias_laborales	UPDATE	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "I"}	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "A"}	2026-11-17 07:40:12.943628-04	\N	A
15	\N	estudiantes	UPDATE	{"cedula": "V-7873867", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 10, "id_mun": 28, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "NIRIA ZULAY", "estatus": "A", "apellido": "COLINA GONZALEZ", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:21:21.543171-04:00"}	{"cedula": "V-7873867", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 10, "id_mun": 28, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "NIRIA ZULAY", "estatus": "I", "apellido": "COLINA GONZALEZ", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:38:37.995597-04:00"}	2026-11-15 11:38:37.995597-04	\N	A
16	\N	estudiantes	UPDATE	{"cedula": "V-7873867", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 10, "id_mun": 28, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "NIRIA ZULAY", "estatus": "I", "apellido": "COLINA GONZALEZ", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:38:37.995597-04:00"}	{"cedula": "V-7873867", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 10, "id_mun": 28, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "NIRIA ZULAY", "estatus": "A", "apellido": "COLINA GONZALEZ", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:38:45.167368-04:00"}	2026-11-15 11:38:45.167368-04	\N	A
72	\N	programas	UPDATE	{"codigo": "LESP", "creado": "2026-10-02T18:44:50.034531-04:00", "id_pro": 2, "nombre": "PNF Licenciatura en Educación Especial", "estatus": "A", "total_uc": 182, "actualizar": "2026-10-02T18:44:50.034531-04:00", "tipo_sistema": "Semestral", "total_trayectos": 4}	{"codigo": "LESP", "creado": "2026-10-02T18:44:50.034531-04:00", "id_pro": 2, "nombre": "PNF Licenciatura en Educación Especial", "estatus": "I", "total_uc": 182, "actualizar": "2026-11-16T20:53:53.787195-04:00", "tipo_sistema": "Semestral", "total_trayectos": 4}	2026-11-16 20:53:53.787195-04	\N	A
73	\N	programas	UPDATE	{"codigo": "LESP", "creado": "2026-10-02T18:44:50.034531-04:00", "id_pro": 2, "nombre": "PNF Licenciatura en Educación Especial", "estatus": "A", "total_uc": 182, "actualizar": "2026-10-02T18:44:50.034531-04:00", "tipo_sistema": "Semestral", "total_trayectos": 4}	{"codigo": "LESP", "creado": "2026-10-02T18:44:50.034531-04:00", "id_pro": 2, "nombre": "PNF Licenciatura en Educación Especial", "estatus": "I", "total_uc": 182, "actualizar": "2026-11-16T20:53:53.787195-04:00", "tipo_sistema": "Semestral", "total_trayectos": 4}	2026-11-16 20:53:53.787195-04	\N	A
102	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 16, "id_pro": 1, "estatus": "A", "periodo": 4, "id_malla": 16, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 16, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 16, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
103	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 17, "id_pro": 1, "estatus": "A", "periodo": 5, "id_malla": 17, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 17, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 17, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
104	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 17, "id_pro": 1, "estatus": "A", "periodo": 5, "id_malla": 17, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 17, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 17, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
105	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 18, "id_pro": 1, "estatus": "A", "periodo": 5, "id_malla": 18, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 18, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 18, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
106	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 18, "id_pro": 1, "estatus": "A", "periodo": 5, "id_malla": 18, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 18, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 18, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
107	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 19, "id_pro": 1, "estatus": "A", "periodo": 5, "id_malla": 19, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 19, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 19, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
108	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 19, "id_pro": 1, "estatus": "A", "periodo": 5, "id_malla": 19, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 19, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 19, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
282	\N	dias_laborales	UPDATE	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "I"}	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "A"}	2026-11-17 07:40:13.864789-04	\N	A
291	\N	dias_laborales	UPDATE	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "A"}	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "I"}	2026-11-17 08:26:50.371986-04	\N	A
17	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T11:37:00.288253-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T12:10:50.656094-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-15 12:10:50.650134-04	\N	A
18	\N	dias_laborales	UPDATE	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "A"}	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "I"}	2026-11-15 12:11:03.787212-04	\N	A
19	\N	dias_laborales	UPDATE	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "A"}	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "I"}	2026-11-15 12:11:03.787212-04	\N	A
20	\N	dias_laborales	UPDATE	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "A"}	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "I"}	2026-11-15 12:11:04.625734-04	\N	A
21	\N	dias_laborales	UPDATE	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "A"}	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "I"}	2026-11-15 12:11:04.625734-04	\N	A
22	\N	dias_laborales	UPDATE	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "A"}	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "I"}	2026-11-15 12:11:04.964066-04	\N	A
23	\N	dias_laborales	UPDATE	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "A"}	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "I"}	2026-11-15 12:11:04.964066-04	\N	A
24	\N	dias_laborales	UPDATE	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "A"}	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "I"}	2026-11-15 12:11:05.291223-04	\N	A
25	\N	dias_laborales	UPDATE	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "A"}	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "I"}	2026-11-15 12:11:05.291223-04	\N	A
26	\N	dias_laborales	UPDATE	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "I"}	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "A"}	2026-11-15 12:11:12.381716-04	\N	A
27	\N	dias_laborales	UPDATE	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "I"}	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "A"}	2026-11-15 12:11:12.381716-04	\N	A
28	\N	dias_laborales	UPDATE	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "A"}	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "I"}	2026-11-15 12:11:12.958401-04	\N	A
29	\N	dias_laborales	UPDATE	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "A"}	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "I"}	2026-11-15 12:11:12.958401-04	\N	A
39	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T12:55:35.828273-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T14:29:35.689277-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-15 14:29:35.638559-04	\N	A
53	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T15:40:59.353371-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T21:57:19.359463-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-15 21:57:19.314483-04	\N	A
74	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T20:27:43.022117-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T20:58:53.130722-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-16 20:58:53.125438-04	\N	A
109	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 20, "id_pro": 1, "estatus": "A", "periodo": 5, "id_malla": 20, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 20, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 20, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
110	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 20, "id_pro": 1, "estatus": "A", "periodo": 5, "id_malla": 20, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 20, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 20, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
111	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 21, "id_pro": 1, "estatus": "A", "periodo": 6, "id_malla": 21, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 21, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 21, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
409	\N	permisos_rol	UPDATE	{"id_pr": 102, "id_mod": 13, "id_rol": 3, "alcance": "SP", "estatus": "A", "id_perm": 2}	{"id_pr": 102, "id_mod": 13, "id_rol": 3, "alcance": "SP", "estatus": "I", "id_perm": 2}	2026-11-20 23:17:01.594141-04	\N	A
30	\N	dias_laborales	UPDATE	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "I"}	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "A"}	2026-11-15 12:11:45.327079-04	\N	A
31	\N	dias_laborales	UPDATE	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "I"}	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "A"}	2026-11-15 12:11:45.327079-04	\N	A
32	\N	dias_laborales	UPDATE	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "I"}	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "A"}	2026-11-15 12:11:45.807384-04	\N	A
33	\N	dias_laborales	UPDATE	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "I"}	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "A"}	2026-11-15 12:11:45.807384-04	\N	A
34	\N	dias_laborales	UPDATE	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "I"}	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "A"}	2026-11-15 12:11:46.151483-04	\N	A
35	\N	dias_laborales	UPDATE	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "I"}	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "A"}	2026-11-15 12:11:46.151483-04	\N	A
36	\N	dias_laborales	UPDATE	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "I"}	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "A"}	2026-11-15 12:11:46.705411-04	\N	A
37	\N	dias_laborales	UPDATE	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "I"}	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "A"}	2026-11-15 12:11:46.705411-04	\N	A
40	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T14:29:35.689277-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T15:03:34.97182-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-15 15:03:34.960325-04	\N	A
54	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T21:57:19.359463-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T22:07:59.990827-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-15 22:07:59.982534-04	\N	A
75	\N	programas	UPDATE	{"codigo": "LESP", "creado": "2026-10-02T18:44:50.034531-04:00", "id_pro": 2, "nombre": "PNF Licenciatura en Educación Especial", "estatus": "I", "total_uc": 182, "actualizar": "2026-11-16T20:53:53.787195-04:00", "tipo_sistema": "Semestral", "total_trayectos": 4}	{"codigo": "LESP", "creado": "2026-10-02T18:44:50.034531-04:00", "id_pro": 2, "nombre": "PNF Licenciatura en Educación Especial", "estatus": "A", "total_uc": 182, "actualizar": "2026-11-16T21:07:35.42185-04:00", "tipo_sistema": "Semestral", "total_trayectos": 4}	2026-11-16 21:07:35.42185-04	\N	A
76	\N	programas	UPDATE	{"codigo": "LESP", "creado": "2026-10-02T18:44:50.034531-04:00", "id_pro": 2, "nombre": "PNF Licenciatura en Educación Especial", "estatus": "I", "total_uc": 182, "actualizar": "2026-11-16T20:53:53.787195-04:00", "tipo_sistema": "Semestral", "total_trayectos": 4}	{"codigo": "LESP", "creado": "2026-10-02T18:44:50.034531-04:00", "id_pro": 2, "nombre": "PNF Licenciatura en Educación Especial", "estatus": "A", "total_uc": 182, "actualizar": "2026-11-16T21:07:35.42185-04:00", "tipo_sistema": "Semestral", "total_trayectos": 4}	2026-11-16 21:07:35.42185-04	\N	A
112	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 21, "id_pro": 1, "estatus": "A", "periodo": 6, "id_malla": 21, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 21, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 21, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
113	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 22, "id_pro": 1, "estatus": "A", "periodo": 6, "id_malla": 22, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 22, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 22, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
114	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 22, "id_pro": 1, "estatus": "A", "periodo": 6, "id_malla": 22, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 22, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 22, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
115	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 23, "id_pro": 1, "estatus": "A", "periodo": 6, "id_malla": 23, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 23, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 23, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
116	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 23, "id_pro": 1, "estatus": "A", "periodo": 6, "id_malla": 23, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 23, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 23, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
365	1	municipios	UPDATE	{"id_mun": 1, "nombre": "Andrés Bello", "estatus": "A"}	{"id_mun": 1, "nombre": "Andrés Bello", "estatus": "I"}	2026-11-19 11:46:40.189062-04	127.0.0.1	A
38	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T12:10:50.656094-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T12:55:35.828273-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-15 12:55:35.820778-04	\N	A
41	\N	docentes	UPDATE	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 1, "id_usu": null, "nombre": "María", "estatus": "A", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-14T23:58:07.474501-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 1, "id_usu": null, "nombre": "María", "estatus": "I", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-15T15:03:40.599329-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	2026-11-15 15:03:40.599329-04	\N	A
55	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T22:07:59.990827-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T22:28:20.731334-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-15 22:28:20.72263-04	\N	A
77	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T20:58:53.130722-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T21:26:21.537447-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-16 21:26:21.53106-04	\N	A
117	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 24, "id_pro": 1, "estatus": "A", "periodo": 6, "id_malla": 24, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 24, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 24, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
118	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 24, "id_pro": 1, "estatus": "A", "periodo": 6, "id_malla": 24, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 24, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 24, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
119	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 25, "id_pro": 1, "estatus": "A", "periodo": 6, "id_malla": 25, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 25, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 25, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
120	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 25, "id_pro": 1, "estatus": "A", "periodo": 6, "id_malla": 25, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 25, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 25, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
121	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 26, "id_pro": 1, "estatus": "A", "periodo": 7, "id_malla": 26, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 26, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 26, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
122	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 26, "id_pro": 1, "estatus": "A", "periodo": 7, "id_malla": 26, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 26, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 26, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
123	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 27, "id_pro": 1, "estatus": "A", "periodo": 7, "id_malla": 27, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 27, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 27, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
366	1	municipios	UPDATE	{"id_mun": 1, "nombre": "Andrés Bello", "estatus": "I"}	{"id_mun": 1, "nombre": "Andrés Bello", "estatus": "A"}	2026-11-19 11:46:43.613641-04	127.0.0.1	A
380	1	municipios	UPDATE	{"id_mun": 1, "nombre": "Andrés Bello", "estatus": "A"}	{"id_mun": 1, "nombre": "Andrés Bello", "estatus": "I"}	2026-11-20 01:22:30.853178-04	127.0.0.1	A
42	\N	docentes	UPDATE	{"cedula": "V-11492534", "creado": "2026-11-13T16:20:59.408443-04:00", "id_doc": 3, "id_mun": 1, "id_usu": null, "nombre": "IRIS MARISOL", "estatus": "A", "apellido": "RAMIREZ HERNANDEZ", "foto_url": null, "telefono": "04161740853", "actualizar": "2026-11-13T16:20:59.408443-04:00", "especialidad": "Educación Especial", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 0}	{"cedula": "V-11492534", "creado": "2026-11-13T16:20:59.408443-04:00", "id_doc": 3, "id_mun": 28, "id_usu": null, "nombre": "IRIS MARISOL", "estatus": "A", "apellido": "RAMIREZ HERNANDEZ", "foto_url": null, "telefono": "04161740853", "actualizar": "2026-11-15T15:25:16.886234-04:00", "especialidad": "Educación Especial", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 0}	2026-11-15 15:25:16.886234-04	\N	A
43	\N	docentes	UPDATE	{"cedula": "V-13792150", "creado": "2026-11-13T16:55:56.866854-04:00", "id_doc": 4, "id_mun": 1, "id_usu": null, "nombre": "ERIKA DE LA CONSOLACION", "estatus": "A", "apellido": "VARELA SAYAGO", "foto_url": null, "telefono": "04264937637", "actualizar": "2026-11-13T16:55:56.866854-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 0}	{"cedula": "V-13792150", "creado": "2026-11-13T16:55:56.866854-04:00", "id_doc": 4, "id_mun": 28, "id_usu": null, "nombre": "ERIKA DE LA CONSOLACION", "estatus": "A", "apellido": "VARELA SAYAGO", "foto_url": null, "telefono": "04264937637", "actualizar": "2026-11-15T15:25:16.886234-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 0}	2026-11-15 15:25:16.886234-04	\N	A
44	\N	docentes	UPDATE	{"cedula": "V-87654321", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 2, "id_mun": 1, "id_usu": null, "nombre": "Carlos", "estatus": "A", "apellido": "Rodríguez López", "foto_url": null, "telefono": "04249876543", "actualizar": "2026-11-15T10:57:56.522085-04:00", "especialidad": "Educación Especial", "horas_max_sem": 30, "observaciones": null, "tipo_contrato": "Contratado", "horas_asignadas": 6, "horas_disponibles": 24}	{"cedula": "V-87654321", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 2, "id_mun": 28, "id_usu": null, "nombre": "Carlos", "estatus": "A", "apellido": "Rodríguez López", "foto_url": null, "telefono": "04249876543", "actualizar": "2026-11-15T15:25:16.886234-04:00", "especialidad": "Educación Especial", "horas_max_sem": 30, "observaciones": null, "tipo_contrato": "Contratado", "horas_asignadas": 6, "horas_disponibles": 24}	2026-11-15 15:25:16.886234-04	\N	A
45	\N	docentes	UPDATE	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 1, "id_usu": null, "nombre": "María", "estatus": "I", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-15T15:03:40.599329-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "I", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-15T15:25:16.886234-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	2026-11-15 15:25:16.886234-04	\N	A
56	\N	docentes	UPDATE	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "I", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-15T15:25:16.886234-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "A", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-15T22:43:04.293189-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	2026-11-15 22:43:04.293189-04	\N	A
57	\N	docentes	UPDATE	{"cedula": "V-87654321", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 2, "id_mun": 28, "id_usu": null, "nombre": "Carlos", "estatus": "I", "apellido": "Rodríguez López", "foto_url": null, "telefono": "04249876543", "actualizar": "2026-11-15T15:51:15.636861-04:00", "especialidad": "Educación Especial", "horas_max_sem": 30, "observaciones": null, "tipo_contrato": "Contratado", "horas_asignadas": 6, "horas_disponibles": 24}	{"cedula": "V-87654321", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 2, "id_mun": 28, "id_usu": null, "nombre": "Carlos", "estatus": "A", "apellido": "Rodríguez López", "foto_url": null, "telefono": "04249876543", "actualizar": "2026-11-15T22:43:40.539145-04:00", "especialidad": "Educación Especial", "horas_max_sem": 30, "observaciones": null, "tipo_contrato": "Contratado", "horas_asignadas": 6, "horas_disponibles": 24}	2026-11-15 22:43:40.539145-04	\N	A
58	\N	docentes	UPDATE	{"cedula": "V-11492534", "creado": "2026-11-13T16:20:59.408443-04:00", "id_doc": 3, "id_mun": 28, "id_usu": null, "nombre": "IRIS MARISOL", "estatus": "I", "apellido": "RAMIREZ HERNANDEZ", "foto_url": null, "telefono": "04161740853", "actualizar": "2026-11-15T15:55:43.099207-04:00", "especialidad": "Educación Especial", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 0}	{"cedula": "V-11492534", "creado": "2026-11-13T16:20:59.408443-04:00", "id_doc": 3, "id_mun": 28, "id_usu": null, "nombre": "IRIS MARISOL", "estatus": "A", "apellido": "RAMIREZ HERNANDEZ", "foto_url": null, "telefono": "04161740853", "actualizar": "2026-11-15T22:43:51.983198-04:00", "especialidad": "Educación Especial", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 0}	2026-11-15 22:43:51.983198-04	\N	A
78	\N	municipios	UPDATE	{"id_mun": 7, "nombre": "Antonio Rómulo Costa", "estatus": "I"}	{"id_mun": 7, "nombre": "Antonio Rómulo Costa", "estatus": "A"}	2026-11-16 21:38:19.521815-04	\N	A
79	\N	municipios	UPDATE	{"id_mun": 7, "nombre": "Antonio Rómulo Costa", "estatus": "I"}	{"id_mun": 7, "nombre": "Antonio Rómulo Costa", "estatus": "A"}	2026-11-16 21:38:19.521815-04	\N	A
80	\N	municipios	DELETE	{"id_mun": 2, "nombre": "Táriba", "estatus": "I"}	\N	2026-11-16 21:38:19.521815-04	\N	A
81	\N	municipios	DELETE	{"id_mun": 2, "nombre": "Táriba", "estatus": "I"}	\N	2026-11-16 21:38:19.521815-04	\N	A
46	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T15:03:34.97182-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T15:40:59.353371-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-15 15:40:59.341776-04	\N	A
49	\N	estudiantes	UPDATE	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "I", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T15:51:41.018517-04:00"}	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "A", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T15:51:49.559895-04:00"}	2026-11-15 15:51:49.559895-04	\N	A
51	\N	estudiantes	UPDATE	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "I", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T15:52:05.450396-04:00"}	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "A", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T15:52:10.975223-04:00"}	2026-11-15 15:52:10.975223-04	\N	A
52	\N	docentes	UPDATE	{"cedula": "V-11492534", "creado": "2026-11-13T16:20:59.408443-04:00", "id_doc": 3, "id_mun": 28, "id_usu": null, "nombre": "IRIS MARISOL", "estatus": "A", "apellido": "RAMIREZ HERNANDEZ", "foto_url": null, "telefono": "04161740853", "actualizar": "2026-11-15T15:25:16.886234-04:00", "especialidad": "Educación Especial", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 0}	{"cedula": "V-11492534", "creado": "2026-11-13T16:20:59.408443-04:00", "id_doc": 3, "id_mun": 28, "id_usu": null, "nombre": "IRIS MARISOL", "estatus": "I", "apellido": "RAMIREZ HERNANDEZ", "foto_url": null, "telefono": "04161740853", "actualizar": "2026-11-15T15:55:43.099207-04:00", "especialidad": "Educación Especial", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 0}	2026-11-15 15:55:43.099207-04	\N	A
59	\N	docentes	UPDATE	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "A", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-15T22:43:04.293189-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "I", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-15T22:44:01.491817-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	2026-11-15 22:44:01.491817-04	\N	A
60	\N	docentes	UPDATE	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "I", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-15T22:44:01.491817-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "A", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-15T22:44:04.953136-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	2026-11-15 22:44:04.953136-04	\N	A
82	\N	municipios	DELETE	{"id_mun": 5, "nombre": "Capacho", "estatus": "I"}	\N	2026-11-16 21:38:19.521815-04	\N	A
83	\N	municipios	DELETE	{"id_mun": 5, "nombre": "Capacho", "estatus": "I"}	\N	2026-11-16 21:38:19.521815-04	\N	A
84	\N	municipios	DELETE	{"id_mun": 4, "nombre": "La Grita", "estatus": "I"}	\N	2026-11-16 21:38:19.521815-04	\N	A
85	\N	municipios	DELETE	{"id_mun": 4, "nombre": "La Grita", "estatus": "I"}	\N	2026-11-16 21:38:19.521815-04	\N	A
86	\N	municipios	DELETE	{"id_mun": 1, "nombre": "San Cristóbal 2", "estatus": "I"}	\N	2026-11-16 21:38:19.521815-04	\N	A
87	\N	municipios	DELETE	{"id_mun": 1, "nombre": "San Cristóbal 2", "estatus": "I"}	\N	2026-11-16 21:38:19.521815-04	\N	A
88	\N	municipios	DELETE	{"id_mun": 3, "nombre": "Rubio", "estatus": "I"}	\N	2026-11-16 21:38:19.521815-04	\N	A
89	\N	municipios	DELETE	{"id_mun": 3, "nombre": "Rubio", "estatus": "I"}	\N	2026-11-16 21:38:19.521815-04	\N	A
90	\N	programas	DELETE	{"codigo": "adsfasdf", "creado": "2026-11-12T19:25:21.4854-04:00", "id_pro": 3, "nombre": "adsfasdf", "estatus": "I", "total_uc": 32, "actualizar": "2026-11-13T20:44:26.535174-04:00", "tipo_sistema": "Semestral", "total_trayectos": 34}	\N	2026-11-16 21:38:19.521815-04	\N	A
91	\N	programas	DELETE	{"codigo": "adsfasdf", "creado": "2026-11-12T19:25:21.4854-04:00", "id_pro": 3, "nombre": "adsfasdf", "estatus": "I", "total_uc": 32, "actualizar": "2026-11-13T20:44:26.535174-04:00", "tipo_sistema": "Semestral", "total_trayectos": 34}	\N	2026-11-16 21:38:19.521815-04	\N	A
124	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 27, "id_pro": 1, "estatus": "A", "periodo": 7, "id_malla": 27, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 27, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 27, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
381	1	municipios	UPDATE	{"id_mun": 1, "nombre": "Andrés Bello", "estatus": "I"}	{"id_mun": 1, "nombre": "Andrés Bello", "estatus": "A"}	2026-11-20 01:22:45.18094-04	127.0.0.1	A
47	\N	docentes	UPDATE	{"cedula": "V-87654321", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 2, "id_mun": 28, "id_usu": null, "nombre": "Carlos", "estatus": "A", "apellido": "Rodríguez López", "foto_url": null, "telefono": "04249876543", "actualizar": "2026-11-15T15:25:16.886234-04:00", "especialidad": "Educación Especial", "horas_max_sem": 30, "observaciones": null, "tipo_contrato": "Contratado", "horas_asignadas": 6, "horas_disponibles": 24}	{"cedula": "V-87654321", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 2, "id_mun": 28, "id_usu": null, "nombre": "Carlos", "estatus": "I", "apellido": "Rodríguez López", "foto_url": null, "telefono": "04249876543", "actualizar": "2026-11-15T15:51:15.636861-04:00", "especialidad": "Educación Especial", "horas_max_sem": 30, "observaciones": null, "tipo_contrato": "Contratado", "horas_asignadas": 6, "horas_disponibles": 24}	2026-11-15 15:51:15.636861-04	\N	A
48	\N	estudiantes	UPDATE	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "A", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:37:35.337215-04:00"}	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "I", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T15:51:41.018517-04:00"}	2026-11-15 15:51:41.018517-04	\N	A
50	\N	estudiantes	UPDATE	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "A", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T15:51:49.559895-04:00"}	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 28, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "I", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T15:52:05.450396-04:00"}	2026-11-15 15:52:05.450396-04	\N	A
61	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-15T22:28:20.731334-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T17:51:33.559824-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-16 17:51:33.500057-04	\N	A
62	\N	periodos_academicos	UPDATE	{"anio": 2025, "tipo": "Trimestre", "activo": true, "creado": "2026-10-03T10:55:20.264002-04:00", "id_per": 1, "nombre": "Trimestre 2025-I", "estatus": "A", "fecha_fin": "2025-04-30", "actualizar": "2026-10-03T10:55:20.264002-04:00", "fecha_inicio": "2025-01-20", "numero_periodo": 1}	{"anio": 2025, "tipo": "Trimestre", "activo": true, "creado": "2026-10-03T10:55:20.264002-04:00", "id_per": 1, "nombre": "Trimestre 2025-I", "estatus": "I", "fecha_fin": "2025-04-30", "actualizar": "2026-11-16T17:51:54.273308-04:00", "fecha_inicio": "2025-01-20", "numero_periodo": 1}	2026-11-16 17:51:54.273308-04	\N	A
63	\N	periodos_academicos	UPDATE	{"anio": 2025, "tipo": "Trimestre", "activo": true, "creado": "2026-10-03T10:55:20.264002-04:00", "id_per": 1, "nombre": "Trimestre 2025-I", "estatus": "A", "fecha_fin": "2025-04-30", "actualizar": "2026-10-03T10:55:20.264002-04:00", "fecha_inicio": "2025-01-20", "numero_periodo": 1}	{"anio": 2025, "tipo": "Trimestre", "activo": true, "creado": "2026-10-03T10:55:20.264002-04:00", "id_per": 1, "nombre": "Trimestre 2025-I", "estatus": "I", "fecha_fin": "2025-04-30", "actualizar": "2026-11-16T17:51:54.273308-04:00", "fecha_inicio": "2025-01-20", "numero_periodo": 1}	2026-11-16 17:51:54.273308-04	\N	A
64	\N	periodos_academicos	UPDATE	{"anio": 2025, "tipo": "Trimestre", "activo": true, "creado": "2026-10-03T10:55:20.264002-04:00", "id_per": 1, "nombre": "Trimestre 2025-I", "estatus": "I", "fecha_fin": "2025-04-30", "actualizar": "2026-11-16T17:51:54.273308-04:00", "fecha_inicio": "2025-01-20", "numero_periodo": 1}	{"anio": 2025, "tipo": "Trimestre", "activo": true, "creado": "2026-10-03T10:55:20.264002-04:00", "id_per": 1, "nombre": "Trimestre 2025-I", "estatus": "A", "fecha_fin": "2025-04-30", "actualizar": "2026-11-16T17:51:56.926229-04:00", "fecha_inicio": "2025-01-20", "numero_periodo": 1}	2026-11-16 17:51:56.926229-04	\N	A
65	\N	periodos_academicos	UPDATE	{"anio": 2025, "tipo": "Trimestre", "activo": true, "creado": "2026-10-03T10:55:20.264002-04:00", "id_per": 1, "nombre": "Trimestre 2025-I", "estatus": "I", "fecha_fin": "2025-04-30", "actualizar": "2026-11-16T17:51:54.273308-04:00", "fecha_inicio": "2025-01-20", "numero_periodo": 1}	{"anio": 2025, "tipo": "Trimestre", "activo": true, "creado": "2026-10-03T10:55:20.264002-04:00", "id_per": 1, "nombre": "Trimestre 2025-I", "estatus": "A", "fecha_fin": "2025-04-30", "actualizar": "2026-11-16T17:51:56.926229-04:00", "fecha_inicio": "2025-01-20", "numero_periodo": 1}	2026-11-16 17:51:56.926229-04	\N	A
66	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T17:51:33.559824-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T20:12:35.705966-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-16 20:12:35.687033-04	\N	A
67	\N	docentes	UPDATE	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "A", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-15T22:44:04.953136-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "I", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-16T20:13:14.743247-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	2026-11-16 20:13:14.743247-04	\N	A
93	\N	permisos_rol	INSERT	\N	{"id_pr": 137, "id_mod": 15, "id_rol": 2, "alcance": "TODO", "estatus": "A", "id_perm": 3}	2026-11-16 22:48:21.371919-04	\N	A
68	\N	docentes	UPDATE	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "I", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-16T20:13:14.743247-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "A", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-16T20:13:18.654014-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	2026-11-16 20:13:18.654014-04	\N	A
69	\N	docentes	UPDATE	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "A", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-16T20:13:18.654014-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "I", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-16T20:13:22.065084-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	2026-11-16 20:13:22.065084-04	\N	A
70	\N	docentes	UPDATE	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "I", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-16T20:13:22.065084-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	{"cedula": "V-12345678", "creado": "2026-10-03T10:55:20.264002-04:00", "id_doc": 1, "id_mun": 28, "id_usu": null, "nombre": "María", "estatus": "A", "apellido": "González", "foto_url": null, "telefono": "04149998877", "actualizar": "2026-11-16T20:13:23.095142-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 6, "horas_disponibles": 14}	2026-11-16 20:13:23.095142-04	\N	A
92	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T21:26:21.537447-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T22:08:54.17215-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-16 22:08:54.165775-04	\N	A
94	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T22:08:54.17215-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T22:58:15.258047-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-16 22:58:15.243442-04	\N	A
125	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 28, "id_pro": 1, "estatus": "A", "periodo": 7, "id_malla": 28, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 28, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 28, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
126	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 28, "id_pro": 1, "estatus": "A", "periodo": 7, "id_malla": 28, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 28, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 28, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
127	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 29, "id_pro": 1, "estatus": "A", "periodo": 7, "id_malla": 29, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 29, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 29, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
128	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 29, "id_pro": 1, "estatus": "A", "periodo": 7, "id_malla": 29, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 29, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 29, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
1	\N	estudiantes	UPDATE	{"cedula": "V-7873867", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 10, "id_mun": 1, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "NIRIA ZULAY", "estatus": "A", "apellido": "COLINA GONZALEZ", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T10:55:16.720908-04:00"}	{"cedula": "V-7873867", "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 10, "id_mun": 28, "id_pro": 1, "id_sec": 6, "id_usu": null, "nombre": "NIRIA ZULAY", "estatus": "A", "apellido": "COLINA GONZALEZ", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T11:21:21.543171-04:00"}	2026-11-15 11:21:21.543171-04	\N	A
401	\N	permisos_rol	INSERT	\N	{"id_pr": 153, "id_mod": 16, "id_rol": 3, "alcance": "SP", "estatus": "A", "id_perm": 3}	2026-11-20 21:07:25.166283-04	\N	A
129	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 30, "id_pro": 1, "estatus": "A", "periodo": 8, "id_malla": 30, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 30, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 30, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
130	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 30, "id_pro": 1, "estatus": "A", "periodo": 8, "id_malla": 30, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 30, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 30, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
131	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 31, "id_pro": 1, "estatus": "A", "periodo": 8, "id_malla": 31, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 31, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 31, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
132	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 31, "id_pro": 1, "estatus": "A", "periodo": 8, "id_malla": 31, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 31, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 31, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
133	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 32, "id_pro": 1, "estatus": "A", "periodo": 8, "id_malla": 32, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 32, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 32, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
134	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 32, "id_pro": 1, "estatus": "A", "periodo": 8, "id_malla": 32, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 32, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 32, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
135	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 33, "id_pro": 1, "estatus": "A", "periodo": 8, "id_malla": 33, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 33, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 33, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
136	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 33, "id_pro": 1, "estatus": "A", "periodo": 8, "id_malla": 33, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 33, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 33, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
137	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 34, "id_pro": 1, "estatus": "A", "periodo": 9, "id_malla": 34, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 34, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 34, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
138	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 34, "id_pro": 1, "estatus": "A", "periodo": 9, "id_malla": 34, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 34, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 34, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
139	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 35, "id_pro": 1, "estatus": "A", "periodo": 9, "id_malla": 35, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 35, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 35, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
140	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 35, "id_pro": 1, "estatus": "A", "periodo": 9, "id_malla": 35, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 35, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 35, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
402	\N	permisos_rol	INSERT	\N	{"id_pr": 154, "id_mod": 15, "id_rol": 3, "alcance": "TODO", "estatus": "A", "id_perm": 4}	2026-11-20 21:47:37.43496-04	\N	A
141	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 36, "id_pro": 1, "estatus": "A", "periodo": 9, "id_malla": 36, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 36, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 36, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
142	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 36, "id_pro": 1, "estatus": "A", "periodo": 9, "id_malla": 36, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 36, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 36, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
143	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 37, "id_pro": 1, "estatus": "A", "periodo": 9, "id_malla": 37, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 37, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 37, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
144	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 37, "id_pro": 1, "estatus": "A", "periodo": 9, "id_malla": 37, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 37, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 37, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
145	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 38, "id_pro": 1, "estatus": "A", "periodo": 10, "id_malla": 38, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 38, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 38, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
146	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 38, "id_pro": 1, "estatus": "A", "periodo": 10, "id_malla": 38, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 38, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 38, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
147	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 39, "id_pro": 1, "estatus": "A", "periodo": 10, "id_malla": 39, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 39, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 39, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
148	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 39, "id_pro": 1, "estatus": "A", "periodo": 10, "id_malla": 39, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 39, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 39, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
149	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 40, "id_pro": 1, "estatus": "A", "periodo": 10, "id_malla": 40, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 40, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 40, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
150	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 40, "id_pro": 1, "estatus": "A", "periodo": 10, "id_malla": 40, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 40, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 40, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
151	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 41, "id_pro": 1, "estatus": "A", "periodo": 10, "id_malla": 41, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 41, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 41, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
152	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 41, "id_pro": 1, "estatus": "A", "periodo": 10, "id_malla": 41, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 41, "id_pro": 1, "estatus": "A", "periodo": 1, "id_malla": 41, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
403	\N	permisos_rol	INSERT	\N	{"id_pr": 155, "id_mod": 10, "id_rol": 3, "alcance": "TODO", "estatus": "A", "id_perm": 4}	2026-11-20 22:18:59.282952-04	\N	A
153	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 42, "id_pro": 1, "estatus": "A", "periodo": 11, "id_malla": 42, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 42, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 42, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
154	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 42, "id_pro": 1, "estatus": "A", "periodo": 11, "id_malla": 42, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 42, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 42, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
155	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 43, "id_pro": 1, "estatus": "A", "periodo": 11, "id_malla": 43, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 43, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 43, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
156	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 43, "id_pro": 1, "estatus": "A", "periodo": 11, "id_malla": 43, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 43, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 43, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
157	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 44, "id_pro": 1, "estatus": "A", "periodo": 11, "id_malla": 44, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 44, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 44, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
158	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 44, "id_pro": 1, "estatus": "A", "periodo": 11, "id_malla": 44, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 44, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 44, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
159	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 45, "id_pro": 1, "estatus": "A", "periodo": 11, "id_malla": 45, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 45, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 45, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
160	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 45, "id_pro": 1, "estatus": "A", "periodo": 11, "id_malla": 45, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 45, "id_pro": 1, "estatus": "A", "periodo": 2, "id_malla": 45, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
161	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 46, "id_pro": 1, "estatus": "A", "periodo": 12, "id_malla": 46, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 46, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 46, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
162	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 46, "id_pro": 1, "estatus": "A", "periodo": 12, "id_malla": 46, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 46, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 46, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
163	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 47, "id_pro": 1, "estatus": "A", "periodo": 12, "id_malla": 47, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 47, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 47, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
164	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 47, "id_pro": 1, "estatus": "A", "periodo": 12, "id_malla": 47, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 47, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 47, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
165	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 48, "id_pro": 1, "estatus": "A", "periodo": 12, "id_malla": 48, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 48, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 48, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
166	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 48, "id_pro": 1, "estatus": "A", "periodo": 12, "id_malla": 48, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 48, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 48, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
167	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 49, "id_pro": 1, "estatus": "A", "periodo": 12, "id_malla": 49, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 49, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 49, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
168	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 49, "id_pro": 1, "estatus": "A", "periodo": 12, "id_malla": 49, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 49, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 49, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
169	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 50, "id_pro": 1, "estatus": "A", "periodo": 12, "id_malla": 50, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 50, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 50, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
170	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 50, "id_pro": 1, "estatus": "A", "periodo": 12, "id_malla": 50, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 50, "id_pro": 1, "estatus": "A", "periodo": 3, "id_malla": 50, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
171	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 63, "id_pro": 2, "estatus": "A", "periodo": 3, "id_malla": 63, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 63, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 63, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
172	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 63, "id_pro": 2, "estatus": "A", "periodo": 3, "id_malla": 63, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 63, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 63, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
173	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 64, "id_pro": 2, "estatus": "A", "periodo": 3, "id_malla": 64, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 64, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 64, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
174	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 64, "id_pro": 2, "estatus": "A", "periodo": 3, "id_malla": 64, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 64, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 64, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
175	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 65, "id_pro": 2, "estatus": "A", "periodo": 3, "id_malla": 65, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 65, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 65, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
176	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 65, "id_pro": 2, "estatus": "A", "periodo": 3, "id_malla": 65, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 65, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 65, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
177	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 66, "id_pro": 2, "estatus": "A", "periodo": 3, "id_malla": 66, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 66, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 66, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
178	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 66, "id_pro": 2, "estatus": "A", "periodo": 3, "id_malla": 66, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 66, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 66, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
179	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 67, "id_pro": 2, "estatus": "A", "periodo": 3, "id_malla": 67, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 67, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 67, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
180	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 67, "id_pro": 2, "estatus": "A", "periodo": 3, "id_malla": 67, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 67, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 67, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
181	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 68, "id_pro": 2, "estatus": "A", "periodo": 4, "id_malla": 68, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 68, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 68, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
182	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 68, "id_pro": 2, "estatus": "A", "periodo": 4, "id_malla": 68, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 68, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 68, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
183	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 69, "id_pro": 2, "estatus": "A", "periodo": 4, "id_malla": 69, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 69, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 69, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
184	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 69, "id_pro": 2, "estatus": "A", "periodo": 4, "id_malla": 69, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 69, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 69, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
185	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 70, "id_pro": 2, "estatus": "A", "periodo": 4, "id_malla": 70, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 70, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 70, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
186	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 70, "id_pro": 2, "estatus": "A", "periodo": 4, "id_malla": 70, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 70, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 70, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
187	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 71, "id_pro": 2, "estatus": "A", "periodo": 4, "id_malla": 71, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 71, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 71, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
188	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 71, "id_pro": 2, "estatus": "A", "periodo": 4, "id_malla": 71, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 71, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 71, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
189	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 72, "id_pro": 2, "estatus": "A", "periodo": 4, "id_malla": 72, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 72, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 72, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
190	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 72, "id_pro": 2, "estatus": "A", "periodo": 4, "id_malla": 72, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 72, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 72, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
191	\N	malla_curricular	UPDATE	{"orden": 6, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 73, "id_pro": 2, "estatus": "A", "periodo": 4, "id_malla": 73, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 6, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 73, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 73, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
192	\N	malla_curricular	UPDATE	{"orden": 6, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 73, "id_pro": 2, "estatus": "A", "periodo": 4, "id_malla": 73, "trayecto": 2, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 6, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 73, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 73, "trayecto": 2, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
193	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 74, "id_pro": 2, "estatus": "A", "periodo": 5, "id_malla": 74, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 74, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 74, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
194	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 74, "id_pro": 2, "estatus": "A", "periodo": 5, "id_malla": 74, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 74, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 74, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
195	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 75, "id_pro": 2, "estatus": "A", "periodo": 5, "id_malla": 75, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 75, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 75, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
196	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 75, "id_pro": 2, "estatus": "A", "periodo": 5, "id_malla": 75, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 75, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 75, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
197	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 76, "id_pro": 2, "estatus": "A", "periodo": 5, "id_malla": 76, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 76, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 76, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
198	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 76, "id_pro": 2, "estatus": "A", "periodo": 5, "id_malla": 76, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 76, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 76, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
199	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 77, "id_pro": 2, "estatus": "A", "periodo": 5, "id_malla": 77, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 77, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 77, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
200	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 77, "id_pro": 2, "estatus": "A", "periodo": 5, "id_malla": 77, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 77, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 77, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
201	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 78, "id_pro": 2, "estatus": "A", "periodo": 5, "id_malla": 78, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 78, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 78, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
202	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 78, "id_pro": 2, "estatus": "A", "periodo": 5, "id_malla": 78, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 78, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 78, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
203	\N	malla_curricular	UPDATE	{"orden": 6, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 79, "id_pro": 2, "estatus": "A", "periodo": 5, "id_malla": 79, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 6, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 79, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 79, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
204	\N	malla_curricular	UPDATE	{"orden": 6, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 79, "id_pro": 2, "estatus": "A", "periodo": 5, "id_malla": 79, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 6, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 79, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 79, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
205	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 80, "id_pro": 2, "estatus": "A", "periodo": 6, "id_malla": 80, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 80, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 80, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
206	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 80, "id_pro": 2, "estatus": "A", "periodo": 6, "id_malla": 80, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 80, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 80, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
207	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 81, "id_pro": 2, "estatus": "A", "periodo": 6, "id_malla": 81, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 81, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 81, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
208	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 81, "id_pro": 2, "estatus": "A", "periodo": 6, "id_malla": 81, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 81, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 81, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
209	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 82, "id_pro": 2, "estatus": "A", "periodo": 6, "id_malla": 82, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 82, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 82, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
210	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 82, "id_pro": 2, "estatus": "A", "periodo": 6, "id_malla": 82, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 82, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 82, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
211	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 83, "id_pro": 2, "estatus": "A", "periodo": 6, "id_malla": 83, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 83, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 83, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
212	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 83, "id_pro": 2, "estatus": "A", "periodo": 6, "id_malla": 83, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 83, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 83, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
213	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 84, "id_pro": 2, "estatus": "A", "periodo": 6, "id_malla": 84, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 84, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 84, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
214	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 84, "id_pro": 2, "estatus": "A", "periodo": 6, "id_malla": 84, "trayecto": 3, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 84, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 84, "trayecto": 3, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
215	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 85, "id_pro": 2, "estatus": "A", "periodo": 7, "id_malla": 85, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 85, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 85, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
216	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 85, "id_pro": 2, "estatus": "A", "periodo": 7, "id_malla": 85, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 85, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 85, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
217	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 86, "id_pro": 2, "estatus": "A", "periodo": 7, "id_malla": 86, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 86, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 86, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
218	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 86, "id_pro": 2, "estatus": "A", "periodo": 7, "id_malla": 86, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 86, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 86, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
219	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 87, "id_pro": 2, "estatus": "A", "periodo": 7, "id_malla": 87, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 87, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 87, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
220	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 87, "id_pro": 2, "estatus": "A", "periodo": 7, "id_malla": 87, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 87, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 87, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
221	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 88, "id_pro": 2, "estatus": "A", "periodo": 7, "id_malla": 88, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 88, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 88, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
222	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 88, "id_pro": 2, "estatus": "A", "periodo": 7, "id_malla": 88, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 88, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 88, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
223	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 89, "id_pro": 2, "estatus": "A", "periodo": 7, "id_malla": 89, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 89, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 89, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
224	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 89, "id_pro": 2, "estatus": "A", "periodo": 7, "id_malla": 89, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 89, "id_pro": 2, "estatus": "A", "periodo": 1, "id_malla": 89, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
225	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 90, "id_pro": 2, "estatus": "A", "periodo": 8, "id_malla": 90, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 90, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 90, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
226	\N	malla_curricular	UPDATE	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 90, "id_pro": 2, "estatus": "A", "periodo": 8, "id_malla": 90, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 1, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 90, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 90, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
227	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 91, "id_pro": 2, "estatus": "A", "periodo": 8, "id_malla": 91, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 91, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 91, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
228	\N	malla_curricular	UPDATE	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 91, "id_pro": 2, "estatus": "A", "periodo": 8, "id_malla": 91, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 2, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 91, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 91, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
229	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 92, "id_pro": 2, "estatus": "A", "periodo": 8, "id_malla": 92, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 92, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 92, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
230	\N	malla_curricular	UPDATE	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 92, "id_pro": 2, "estatus": "A", "periodo": 8, "id_malla": 92, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 3, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 92, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 92, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
231	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 93, "id_pro": 2, "estatus": "A", "periodo": 8, "id_malla": 93, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 93, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 93, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
232	\N	malla_curricular	UPDATE	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 93, "id_pro": 2, "estatus": "A", "periodo": 8, "id_malla": 93, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 4, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 93, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 93, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
233	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 94, "id_pro": 2, "estatus": "A", "periodo": 8, "id_malla": 94, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 94, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 94, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
234	\N	malla_curricular	UPDATE	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 94, "id_pro": 2, "estatus": "A", "periodo": 8, "id_malla": 94, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 5, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 94, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 94, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
235	\N	malla_curricular	UPDATE	{"orden": 6, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 95, "id_pro": 2, "estatus": "A", "periodo": 8, "id_malla": 95, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 6, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 95, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 95, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
236	\N	malla_curricular	UPDATE	{"orden": 6, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 95, "id_pro": 2, "estatus": "A", "periodo": 8, "id_malla": 95, "trayecto": 4, "actualizar": "2026-10-02T19:07:13.667971-04:00", "perequisito_id_mat": null}	{"orden": 6, "creado": "2026-10-02T19:07:13.667971-04:00", "id_mat": 95, "id_pro": 2, "estatus": "A", "periodo": 2, "id_malla": 95, "trayecto": 4, "actualizar": "2026-11-16T23:55:27.897546-04:00", "perequisito_id_mat": null}	2026-11-16 23:55:27.897546-04	\N	A
237	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 8, "id_per": 1, "estatus": "A", "id_nota": 2, "id_malla": 50, "actualizar": "2026-11-13T16:55:56.866854-04:00", "observaciones": "Calificación según acta de resultados", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 8, "id_per": 1, "estatus": "I", "id_nota": 2, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:00:50.635869-04	\N	A
238	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 11, "id_per": 1, "estatus": "A", "id_nota": 5, "id_malla": 50, "actualizar": "2026-11-13T16:55:56.866854-04:00", "observaciones": "Calificación según acta de resultados", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 11, "id_per": 1, "estatus": "I", "id_nota": 5, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:00:50.635869-04	\N	A
239	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 9, "id_per": 1, "estatus": "A", "id_nota": 3, "id_malla": 50, "actualizar": "2026-11-13T16:55:56.866854-04:00", "observaciones": "Calificación según acta de resultados", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 9, "id_per": 1, "estatus": "I", "id_nota": 3, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:00:50.635869-04	\N	A
240	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 12, "id_per": 1, "estatus": "A", "id_nota": 6, "id_malla": 50, "actualizar": "2026-11-13T16:55:56.866854-04:00", "observaciones": "Calificación según acta de resultados", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 12, "id_per": 1, "estatus": "I", "id_nota": 6, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:00:50.635869-04	\N	A
241	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 13, "id_per": 1, "estatus": "A", "id_nota": 7, "id_malla": 50, "actualizar": "2026-11-13T16:55:56.866854-04:00", "observaciones": "Calificación según acta de resultados", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 13, "id_per": 1, "estatus": "I", "id_nota": 7, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:00:50.635869-04	\N	A
242	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 7, "id_per": 1, "estatus": "A", "id_nota": 1, "id_malla": 50, "actualizar": "2026-11-13T16:55:56.866854-04:00", "observaciones": "Calificación según acta de resultados", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 7, "id_per": 1, "estatus": "I", "id_nota": 1, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:00:50.635869-04	\N	A
243	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 10, "id_per": 1, "estatus": "A", "id_nota": 4, "id_malla": 50, "actualizar": "2026-11-13T16:55:56.866854-04:00", "observaciones": "Calificación según acta de resultados", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 10, "id_per": 1, "estatus": "I", "id_nota": 4, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:00:50.635869-04	\N	A
244	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 7, "id_per": 1, "estatus": "I", "id_nota": 1, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 7, "id_per": 1, "estatus": "I", "id_nota": 1, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
245	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 8, "id_per": 1, "estatus": "I", "id_nota": 2, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 8, "id_per": 1, "estatus": "I", "id_nota": 2, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
275	\N	dias_laborales	UPDATE	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "A"}	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "I"}	2026-11-17 07:31:55.472019-04	\N	A
246	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 9, "id_per": 1, "estatus": "I", "id_nota": 3, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 9, "id_per": 1, "estatus": "I", "id_nota": 3, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
247	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 10, "id_per": 1, "estatus": "I", "id_nota": 4, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 10, "id_per": 1, "estatus": "I", "id_nota": 4, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
248	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 11, "id_per": 1, "estatus": "I", "id_nota": 5, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 11, "id_per": 1, "estatus": "I", "id_nota": 5, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
249	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 12, "id_per": 1, "estatus": "I", "id_nota": 6, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 12, "id_per": 1, "estatus": "I", "id_nota": 6, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
250	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 13, "id_per": 1, "estatus": "I", "id_nota": 7, "id_malla": 50, "actualizar": "2026-11-17T00:00:50.635869-04:00", "observaciones": "Anulada: materia no correspondía al trayecto del estudiante", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 13, "id_per": 1, "estatus": "I", "id_nota": 7, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
251	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 7, "id_per": 1, "estatus": "I", "id_nota": 1, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 18.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 7, "id_per": 1, "estatus": "I", "id_nota": 1, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
252	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 8, "id_per": 1, "estatus": "I", "id_nota": 2, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 15.50, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 8, "id_per": 1, "estatus": "I", "id_nota": 2, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
253	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 9, "id_per": 1, "estatus": "I", "id_nota": 3, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 12.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 9, "id_per": 1, "estatus": "I", "id_nota": 3, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
254	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 10, "id_per": 1, "estatus": "I", "id_nota": 4, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 16.75, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 10, "id_per": 1, "estatus": "I", "id_nota": 4, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
276	\N	dias_laborales	UPDATE	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "A"}	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "I"}	2026-11-17 07:31:56.199915-04	\N	A
255	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 11, "id_per": 1, "estatus": "I", "id_nota": 5, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 9.50, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 11, "id_per": 1, "estatus": "I", "id_nota": 5, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
256	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 12, "id_per": 1, "estatus": "I", "id_nota": 6, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 14.25, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 12, "id_per": 1, "estatus": "I", "id_nota": 6, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
257	\N	notas	UPDATE	{"nota": 6.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 13, "id_per": 1, "estatus": "I", "id_nota": 7, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 19.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 13, "id_per": 1, "estatus": "I", "id_nota": 7, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
258	\N	notas	INSERT	\N	{"nota": 16.00, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 1, "id_per": 2, "estatus": "A", "id_nota": 8, "id_malla": 74, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
259	\N	notas	INSERT	\N	{"nota": 13.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 2, "id_per": 2, "estatus": "A", "id_nota": 9, "id_malla": 74, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
260	\N	notas	INSERT	\N	{"nota": 18.25, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 3, "id_per": 2, "estatus": "A", "id_nota": 10, "id_malla": 74, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
261	\N	notas	INSERT	\N	{"nota": 11.00, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 4, "id_per": 2, "estatus": "A", "id_nota": 11, "id_malla": 74, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
262	\N	notas	INSERT	\N	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
263	\N	notas	INSERT	\N	{"nota": 17.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 6, "id_per": 2, "estatus": "A", "id_nota": 13, "id_malla": 74, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:01:05.65978-04	\N	A
264	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-16T22:58:15.258047-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T00:11:14.020336-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-17 00:11:14.010329-04	\N	A
265	\N	notas	UPDATE	{"nota": 18.25, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 3, "id_per": 2, "estatus": "A", "id_nota": 10, "id_malla": 74, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 18.25, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 3, "id_per": 2, "estatus": "A", "id_nota": 10, "id_malla": 74, "actualizar": "2026-11-17T00:12:12.025187-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:12:12.025187-04	\N	A
266	\N	notas	UPDATE	{"nota": 11.00, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 4, "id_per": 2, "estatus": "A", "id_nota": 11, "id_malla": 74, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 11.00, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 4, "id_per": 2, "estatus": "A", "id_nota": 11, "id_malla": 74, "actualizar": "2026-11-17T00:12:12.025187-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:12:12.025187-04	\N	A
278	\N	dias_laborales	UPDATE	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "A"}	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "I"}	2026-11-17 07:31:57.309522-04	\N	A
279	\N	dias_laborales	UPDATE	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "I"}	{"dia": "Lunes", "orden": 1, "id_dia": 1, "estatus": "A"}	2026-11-17 07:40:11.453323-04	\N	A
267	\N	notas	UPDATE	{"nota": 17.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 6, "id_per": 2, "estatus": "A", "id_nota": 13, "id_malla": 74, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 17.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 6, "id_per": 2, "estatus": "A", "id_nota": 13, "id_malla": 74, "actualizar": "2026-11-17T00:12:12.025187-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:12:12.025187-04	\N	A
268	\N	notas	UPDATE	{"nota": 16.00, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 1, "id_per": 2, "estatus": "A", "id_nota": 8, "id_malla": 74, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 16.00, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 1, "id_per": 2, "estatus": "A", "id_nota": 8, "id_malla": 74, "actualizar": "2026-11-17T00:12:12.025187-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:12:12.025187-04	\N	A
269	\N	notas	UPDATE	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-17T00:12:12.025187-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:12:12.025187-04	\N	A
270	\N	notas	UPDATE	{"nota": 13.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 2, "id_per": 2, "estatus": "A", "id_nota": 9, "id_malla": 74, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 13.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 2, "id_per": 2, "estatus": "A", "id_nota": 9, "id_malla": 74, "actualizar": "2026-11-17T00:12:12.025187-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:12:12.025187-04	\N	A
271	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T00:11:14.020336-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T00:41:19.806744-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-17 00:41:19.802387-04	\N	A
272	\N	notas	UPDATE	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-17T00:12:12.025187-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "I", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-17T00:42:07.008396-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 00:42:07.008396-04	\N	A
273	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T00:41:19.806744-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T01:32:44.964696-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-17 01:32:44.942282-04	\N	A
274	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T01:32:44.964696-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T07:27:09.907336-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-17 07:27:09.894997-04	\N	A
277	\N	dias_laborales	UPDATE	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "A"}	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "I"}	2026-11-17 07:31:56.908755-04	\N	A
283	\N	notas	UPDATE	{"nota": 17.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 6, "id_per": 2, "estatus": "A", "id_nota": 13, "id_malla": 74, "actualizar": "2026-11-17T00:12:12.025187-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 17.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 6, "id_per": 2, "estatus": "I", "id_nota": 13, "id_malla": 74, "actualizar": "2026-11-17T07:47:33.520324-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 07:47:33.520324-04	\N	A
284	\N	notas	UPDATE	{"nota": 17.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 6, "id_per": 2, "estatus": "I", "id_nota": 13, "id_malla": 74, "actualizar": "2026-11-17T07:47:33.520324-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 17.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 6, "id_per": 2, "estatus": "A", "id_nota": 13, "id_malla": 74, "actualizar": "2026-11-17T07:47:39.219708-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 07:47:39.219708-04	\N	A
288	\N	dias_laborales	UPDATE	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "A"}	{"dia": "Jueves", "orden": 4, "id_dia": 4, "estatus": "I"}	2026-11-17 08:26:47.478008-04	\N	A
290	\N	dias_laborales	UPDATE	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "A"}	{"dia": "Martes", "orden": 2, "id_dia": 2, "estatus": "I"}	2026-11-17 08:26:49.359487-04	\N	A
293	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T08:24:48.519433-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T09:20:50.030698-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-17 09:20:50.02806-04	\N	A
285	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T07:27:09.907336-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T07:27:09.907336-04:00", "bloqueado_hasta": null, "intentos_fallidos": 1}	2026-11-17 07:55:44.304413-04	\N	A
292	\N	notas	UPDATE	{"nota": 17.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 6, "id_per": 2, "estatus": "A", "id_nota": 13, "id_malla": 74, "actualizar": "2026-11-17T07:47:39.219708-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 17.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 6, "id_per": 2, "estatus": "I", "id_nota": 13, "id_malla": 74, "actualizar": "2026-11-17T08:28:25.706009-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-17 08:28:25.706009-04	\N	A
286	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T07:27:09.907336-04:00", "bloqueado_hasta": null, "intentos_fallidos": 1}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T07:55:51.065601-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-17 07:55:51.061254-04	\N	A
287	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T07:55:51.065601-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T08:24:48.519433-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-17 08:24:48.517516-04	\N	A
289	\N	dias_laborales	UPDATE	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "A"}	{"dia": "Miércoles", "orden": 3, "id_dia": 3, "estatus": "I"}	2026-11-17 08:26:48.382973-04	\N	A
326	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T09:20:50.030698-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T14:45:12.632483-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-17 14:45:12.62784-04	\N	A
327	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T14:45:12.632483-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T14:57:50.243655-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-17 14:57:50.237157-04	\N	A
338	\N	docentes	UPDATE	{"cedula": "V-13792150", "creado": "2026-11-13T16:55:56.866854-04:00", "id_doc": 4, "id_mun": 23, "id_usu": null, "nombre": "ERIKA DE LA CONSOLACION", "estatus": "A", "apellido": "VARELA SAYAGO", "foto_url": null, "telefono": "04264937637", "actualizar": "2026-11-15T15:25:16.886234-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 0}	{"cedula": "V-13792150", "creado": "2026-11-13T16:55:56.866854-04:00", "id_doc": 4, "id_mun": 23, "id_usu": null, "nombre": "ERIKA DE LA CONSOLACION", "estatus": "A", "apellido": "VARELA SAYAGO", "foto_url": null, "telefono": "04264937637", "actualizar": "2026-11-17T18:09:32.72661-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 20}	2026-11-17 18:09:32.72661-04	\N	A
339	\N	docentes	UPDATE	{"cedula": "V-11492534", "creado": "2026-11-13T16:20:59.408443-04:00", "id_doc": 3, "id_mun": 23, "id_usu": null, "nombre": "IRIS MARISOL", "estatus": "A", "apellido": "RAMIREZ HERNANDEZ", "foto_url": null, "telefono": "04161740853", "actualizar": "2026-11-15T22:43:51.983198-04:00", "especialidad": "Educación Especial", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 0}	{"cedula": "V-11492534", "creado": "2026-11-13T16:20:59.408443-04:00", "id_doc": 3, "id_mun": 23, "id_usu": null, "nombre": "IRIS MARISOL", "estatus": "A", "apellido": "RAMIREZ HERNANDEZ", "foto_url": null, "telefono": "04161740853", "actualizar": "2026-11-17T18:09:32.72661-04:00", "especialidad": "Educación Especial", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 20}	2026-11-17 18:09:32.72661-04	\N	A
340	\N	permisos_rol	INSERT	\N	{"id_pr": 146, "id_mod": 16, "id_rol": 2, "alcance": "TODO", "estatus": "A", "id_perm": 3}	2026-11-17 18:10:14.466479-04	\N	A
341	\N	permisos_rol	INSERT	\N	{"id_pr": 147, "id_mod": 15, "id_rol": 4, "alcance": "SP", "estatus": "A", "id_perm": 2}	2026-11-17 18:10:14.466479-04	\N	A
342	\N	permisos_rol	INSERT	\N	{"id_pr": 148, "id_mod": 16, "id_rol": 4, "alcance": "TODO", "estatus": "A", "id_perm": 3}	2026-11-17 18:10:14.466479-04	\N	A
343	\N	roles	UPDATE	{"rol": "ESTUDIANTE", "id_rol": 5, "estatus": "A", "descripcion": "Estudiante con acceso a su horario y notas"}	{"rol": "ESTUDIANTE", "id_rol": 5, "estatus": "A", "descripcion": "Rol reservado sin acceso al sistema: la matrícula estudiantil no opera el módulo administrativo. Se conserva para futuras integraciones (portal de consulta de calificaciones)."}	2026-11-17 18:10:21.291439-04	\N	A
344	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T14:57:50.243655-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T18:24:58.681421-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-17 18:24:58.646606-04	\N	A
345	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T18:24:58.681421-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T21:21:24.927126-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-17 21:21:24.915398-04	\N	A
346	1	asig_carga_horarias	INSERT	\N	{"creado": "2026-11-18T01:36:18.511075-04:00", "id_dia": 5, "id_doc": 4, "id_esp": 3, "id_per": 2, "id_sec": null, "estatus": "A", "id_asig": 8, "hora_fin": "08:00:00", "id_malla": 3, "actualizar": "2026-11-18T01:36:18.511082-04:00", "hora_inicio": "07:00:00", "observaciones": "Asignación directa", "tipo_actividad": "Carga Académica"}	2026-11-17 21:36:18.469709-04	127.0.0.1	A
347	1	docentes	UPDATE	{"cedula": "V-13792150", "creado": "2026-11-13T16:55:56.866854-04:00", "id_doc": 4, "id_mun": 23, "id_usu": null, "nombre": "ERIKA DE LA CONSOLACION", "estatus": "A", "apellido": "VARELA SAYAGO", "foto_url": null, "telefono": "04264937637", "actualizar": "2026-11-17T18:09:32.72661-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 0, "horas_disponibles": 20}	{"cedula": "V-13792150", "creado": "2026-11-13T16:55:56.866854-04:00", "id_doc": 4, "id_mun": 23, "id_usu": null, "nombre": "ERIKA DE LA CONSOLACION", "estatus": "A", "apellido": "VARELA SAYAGO", "foto_url": null, "telefono": "04264937637", "actualizar": "2026-11-17T21:36:18.469709-04:00", "especialidad": "Educación Primaria", "horas_max_sem": 20, "observaciones": null, "tipo_contrato": "Estipendio", "horas_asignadas": 1, "horas_disponibles": 19}	2026-11-17 21:36:18.469709-04	127.0.0.1	A
348	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T21:21:24.927126-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T22:01:29.500751-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-17 22:01:29.499681-04	\N	A
349	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-17T22:01:29.500751-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T09:14:01.666073-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 09:14:01.60541-04	\N	A
350	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T09:14:01.666073-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T10:08:59.609225-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 10:08:59.599071-04	\N	A
351	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T10:08:59.609225-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T11:08:43.657923-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 11:08:43.642618-04	\N	A
352	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T11:08:43.657923-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T12:02:15.998331-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 12:02:15.984185-04	\N	A
353	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T12:02:15.998331-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T16:37:54.694424-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 16:37:54.690553-04	\N	A
354	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T16:37:54.694424-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T16:52:19.210167-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 16:52:19.209341-04	\N	A
355	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T16:52:19.210167-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T17:23:58.039343-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 17:23:58.036708-04	\N	A
356	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T17:23:58.039343-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T18:24:30.086445-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 18:24:30.079784-04	\N	A
357	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T18:24:30.086445-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T18:36:01.339063-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 18:36:01.337204-04	\N	A
358	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T18:36:01.339063-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T19:08:07.645564-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 19:08:07.638586-04	\N	A
359	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T19:08:07.645564-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T20:03:01.930142-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 20:03:01.923777-04	\N	A
360	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T20:03:01.930142-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T20:12:15.375-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 20:12:15.36354-04	\N	A
361	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T20:12:15.375-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T21:49:44.562408-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 21:49:44.555409-04	\N	A
362	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T21:49:44.562408-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T23:50:38.819628-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-18 23:50:38.812902-04	\N	A
363	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-18T23:50:38.819628-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T08:57:02.240427-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-19 08:57:02.220448-04	\N	A
364	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T08:57:02.240427-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T11:39:37.931606-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-19 11:39:37.924876-04	\N	A
367	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T11:39:37.931606-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T12:11:12.801733-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-19 12:11:12.798795-04	\N	A
368	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T12:11:12.801733-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T17:37:10.154913-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-19 17:37:10.104319-04	\N	A
369	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T17:37:10.154913-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T18:25:23.395832-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-19 18:25:23.382379-04	\N	A
370	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T18:25:23.395832-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T19:50:00.032937-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-19 19:50:00.030828-04	\N	A
371	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T19:50:00.032937-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T20:48:34.162411-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-19 20:48:34.160119-04	\N	A
372	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T20:48:34.162411-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T21:54:01.779087-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-19 21:54:01.771963-04	\N	A
373	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-19T21:54:01.779087-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T00:07:40.832509-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 00:07:40.826232-04	\N	A
374	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T00:07:40.832509-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T00:48:22.015281-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 00:48:22.01256-04	\N	A
375	1	notas	UPDATE	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "I", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-17T00:42:07.008396-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-20T01:09:21.442603-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-20 01:09:21.442603-04	127.0.0.1	A
376	1	notas	UPDATE	{"nota": 17.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 6, "id_per": 2, "estatus": "I", "id_nota": 13, "id_malla": 74, "actualizar": "2026-11-17T08:28:25.706009-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 17.50, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 6, "id_per": 2, "estatus": "A", "id_nota": 13, "id_malla": 74, "actualizar": "2026-11-20T01:09:24.253805-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-20 01:09:24.253805-04	127.0.0.1	A
390	1	espacios_fis	UPDATE	{"creado": "2026-11-20T10:52:50.664432-04:00", "id_esp": 16, "id_mun": 23, "estatus": "A", "capacidad": 30, "ubicacion": "Aula 16", "actualizar": "2026-11-20T17:49:09.953246-04:00", "equipamiento": null, "tipo_espacio": "Aula", "nombre_centro": "Escuela Bustamante", "disponibilidad": false}	{"creado": "2026-11-20T10:52:50.664432-04:00", "id_esp": 16, "id_mun": 23, "estatus": "I", "capacidad": 30, "ubicacion": "Aula 16", "actualizar": "2026-11-20T17:49:25.404452-04:00", "equipamiento": null, "tipo_espacio": "Aula", "nombre_centro": "Escuela Bustamante", "disponibilidad": false}	2026-11-20 17:49:25.404452-04	127.0.0.1	A
377	1	notas	UPDATE	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-20T01:09:21.442603-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "I", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-20T01:13:01.320268-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-20 01:13:01.320268-04	127.0.0.1	A
378	1	notas	UPDATE	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "I", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-20T01:13:01.320268-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-20T01:13:08.697868-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-20 01:13:08.697868-04	127.0.0.1	A
379	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T00:48:22.015281-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T01:21:19.294523-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 01:21:19.29163-04	\N	A
382	1	notas	UPDATE	{"nota": 19.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 13, "id_per": 1, "estatus": "I", "id_nota": 7, "id_malla": 26, "actualizar": "2026-11-17T00:01:05.65978-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	{"nota": 19.00, "creado": "2026-11-13T16:55:56.866854-04:00", "id_est": 13, "id_per": 1, "estatus": "A", "id_nota": 7, "id_malla": 26, "actualizar": "2026-11-20T01:35:58.829939-04:00", "observaciones": "Acta de demostración — Proyecto III (T3·P1)", "fecha_registro": "2026-11-13T16:55:56.866854-04:00", "tipo_evaluacion": "Final"}	2026-11-20 01:35:58.829939-04	127.0.0.1	A
383	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T01:21:19.294523-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T10:21:40.283461-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 10:21:40.262712-04	\N	A
384	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T10:21:40.283461-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T10:52:05.410629-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 10:52:05.405066-04	\N	A
385	1	espacios_fis	INSERT	\N	{"creado": "2026-11-20T10:52:50.664432-04:00", "id_esp": 16, "id_mun": 23, "estatus": "A", "capacidad": 30, "ubicacion": "Aula 16", "actualizar": "2026-11-20T10:52:50.664432-04:00", "equipamiento": null, "tipo_espacio": "Aula", "nombre_centro": "Escuela Bustamante", "disponibilidad": true}	2026-11-20 10:52:50.664432-04	127.0.0.1	A
386	1	espacios_fis	UPDATE	{"creado": "2026-11-20T10:52:50.664432-04:00", "id_esp": 16, "id_mun": 23, "estatus": "A", "capacidad": 30, "ubicacion": "Aula 16", "actualizar": "2026-11-20T10:52:50.664432-04:00", "equipamiento": null, "tipo_espacio": "Aula", "nombre_centro": "Escuela Bustamante", "disponibilidad": true}	{"creado": "2026-11-20T10:52:50.664432-04:00", "id_esp": 16, "id_mun": 23, "estatus": "A", "capacidad": 30, "ubicacion": "Aula 16", "actualizar": "2026-11-20T10:53:19.281082-04:00", "equipamiento": null, "tipo_espacio": "Aula", "nombre_centro": "Escuela Bustamante", "disponibilidad": false}	2026-11-20 10:53:19.281082-04	127.0.0.1	A
387	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T10:52:05.410629-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T17:23:21.816872-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 17:23:21.786551-04	\N	A
388	1	espacios_fis	UPDATE	{"creado": "2026-11-20T10:52:50.664432-04:00", "id_esp": 16, "id_mun": 23, "estatus": "A", "capacidad": 30, "ubicacion": "Aula 16", "actualizar": "2026-11-20T10:53:19.281082-04:00", "equipamiento": null, "tipo_espacio": "Aula", "nombre_centro": "Escuela Bustamante", "disponibilidad": false}	{"creado": "2026-11-20T10:52:50.664432-04:00", "id_esp": 16, "id_mun": 23, "estatus": "I", "capacidad": 30, "ubicacion": "Aula 16", "actualizar": "2026-11-20T17:23:34.681465-04:00", "equipamiento": null, "tipo_espacio": "Aula", "nombre_centro": "Escuela Bustamante", "disponibilidad": false}	2026-11-20 17:23:34.681465-04	127.0.0.1	A
389	1	espacios_fis	UPDATE	{"creado": "2026-11-20T10:52:50.664432-04:00", "id_esp": 16, "id_mun": 23, "estatus": "I", "capacidad": 30, "ubicacion": "Aula 16", "actualizar": "2026-11-20T17:23:34.681465-04:00", "equipamiento": null, "tipo_espacio": "Aula", "nombre_centro": "Escuela Bustamante", "disponibilidad": false}	{"creado": "2026-11-20T10:52:50.664432-04:00", "id_esp": 16, "id_mun": 23, "estatus": "A", "capacidad": 30, "ubicacion": "Aula 16", "actualizar": "2026-11-20T17:49:09.953246-04:00", "equipamiento": null, "tipo_espacio": "Aula", "nombre_centro": "Escuela Bustamante", "disponibilidad": false}	2026-11-20 17:49:09.953246-04	127.0.0.1	A
408	\N	permisos_rol	UPDATE	{"id_pr": 86, "id_mod": 6, "id_rol": 2, "alcance": "NAD", "estatus": "A", "id_perm": 3}	{"id_pr": 86, "id_mod": 6, "id_rol": 2, "alcance": "LIM", "estatus": "A", "id_perm": 3}	2026-11-20 23:16:14.142562-04	\N	A
391	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T17:23:21.816872-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T18:21:32.067655-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 18:21:32.061668-04	\N	A
392	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T18:21:32.067655-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T18:28:48.697758-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 18:28:48.693424-04	\N	A
393	1	usuarios	INSERT	\N	{"email": "coordinador1@unem.edu.ve", "creado": "2026-11-20T18:29:53.653537-04:00", "id_rol": 3, "id_usu": 2, "estatus": "A", "username": "coordinador1", "actualizar": "2026-11-20T18:29:53.653537-04:00"}	2026-11-20 18:29:53.653537-04	127.0.0.1	A
394	1	credenciales	INSERT	\N	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": null, "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 18:29:53.653537-04	127.0.0.1	A
395	\N	credenciales	UPDATE	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": null, "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T18:34:34.924835-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 18:34:34.922487-04	\N	A
396	\N	credenciales	UPDATE	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T18:34:34.924835-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T18:35:32.439061-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 18:35:32.435737-04	\N	A
397	\N	credenciales	UPDATE	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T18:35:32.439061-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T18:52:32.004153-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 18:52:31.997513-04	\N	A
398	\N	credenciales	UPDATE	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T18:52:32.004153-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T18:55:54.805877-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 18:55:54.80294-04	\N	A
399	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T18:28:48.697758-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T19:03:23.713987-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 19:03:23.712671-04	\N	A
400	\N	credenciales	UPDATE	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T18:55:54.805877-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T19:15:22.223346-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 19:15:22.219089-04	\N	A
404	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T19:03:23.713987-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T22:26:07.024889-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 22:26:07.018321-04	\N	A
405	\N	credenciales	UPDATE	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T19:15:22.223346-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T22:33:22.690875-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 22:33:22.68869-04	\N	A
406	2	notas	UPDATE	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-20T01:13:08.697868-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	{"nota": 8.75, "creado": "2026-11-17T00:01:05.65978-04:00", "id_est": 5, "id_per": 2, "estatus": "I", "id_nota": 12, "id_malla": 74, "actualizar": "2026-11-20T22:35:10.803523-04:00", "observaciones": "Acta de demostración — PSI V (T3·P1)", "fecha_registro": "2026-11-17T00:01:05.65978-04:00", "tipo_evaluacion": "Final"}	2026-11-20 22:35:10.803523-04	127.0.0.1	A
407	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T22:26:07.024889-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T22:38:38.728901-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 22:38:38.727887-04	\N	A
410	\N	permisos_rol	UPDATE	{"id_pr": 104, "id_mod": 14, "id_rol": 3, "alcance": "SP", "estatus": "A", "id_perm": 2}	{"id_pr": 104, "id_mod": 14, "id_rol": 3, "alcance": "SP", "estatus": "I", "id_perm": 2}	2026-11-20 23:17:01.594141-04	\N	A
411	\N	permisos_rol	DELETE	{"id_pr": 108, "id_mod": 11, "id_rol": 3, "alcance": "TODO", "estatus": "A", "id_perm": 3}	\N	2026-11-20 23:32:49.74866-04	\N	A
412	\N	credenciales	UPDATE	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T22:33:22.690875-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T23:36:01.35986-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 23:36:01.353343-04	\N	A
413	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T22:38:38.728901-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T23:40:51.159603-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-20 23:40:51.157571-04	\N	A
414	\N	permisos_rol	UPDATE	{"id_pr": 101, "id_mod": 13, "id_rol": 3, "alcance": "SP", "estatus": "A", "id_perm": 3}	{"id_pr": 101, "id_mod": 13, "id_rol": 3, "alcance": "TODO", "estatus": "A", "id_perm": 3}	2026-11-20 23:48:34.584831-04	\N	A
415	\N	permisos_rol	UPDATE	{"id_pr": 103, "id_mod": 14, "id_rol": 3, "alcance": "SP", "estatus": "A", "id_perm": 3}	{"id_pr": 103, "id_mod": 14, "id_rol": 3, "alcance": "TODO", "estatus": "A", "id_perm": 3}	2026-11-20 23:48:34.584831-04	\N	A
416	\N	permisos_rol	UPDATE	{"id_pr": 105, "id_mod": 10, "id_rol": 3, "alcance": "SP", "estatus": "A", "id_perm": 3}	{"id_pr": 105, "id_mod": 10, "id_rol": 3, "alcance": "TODO", "estatus": "A", "id_perm": 3}	2026-11-20 23:48:48.111534-04	\N	A
417	\N	credenciales	UPDATE	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-20T23:36:01.35986-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-21T00:03:58.350688-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-21 00:03:58.345359-04	\N	A
418	\N	credenciales	UPDATE	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-21T00:03:58.350688-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 2, "id_usu": 2, "password_hash": "$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg", "ultimo_acceso": "2026-11-21T00:30:53.287009-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-21 00:30:53.271464-04	\N	A
419	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-20T23:40:51.159603-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-21T00:32:18.477299-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-21 00:32:18.467538-04	\N	A
420	1	estudiantes	UPDATE	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 23, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "A", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-15T15:52:10.975223-04:00"}	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 23, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "I", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-21T00:32:26.984184-04:00"}	2026-11-21 00:32:26.984184-04	127.0.0.1	A
421	1	estudiantes	UPDATE	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 23, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "I", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-21T00:32:26.984184-04:00"}	{"cedula": "V-12516920", "creado": "2026-11-13T16:20:59.408443-04:00", "id_est": 1, "id_mun": 23, "id_pro": 2, "id_sec": 5, "id_usu": null, "nombre": "JAHYDDY GUADALUPE", "estatus": "A", "apellido": "HANTUCH MENDOZA", "foto_url": null, "trayecto": 3, "actualizar": "2026-11-21T00:32:30.593315-04:00"}	2026-11-21 00:32:30.593315-04	127.0.0.1	A
422	\N	credenciales	UPDATE	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-21T00:32:18.477299-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	{"id_cre": 1, "id_usu": 1, "password_hash": "$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4", "ultimo_acceso": "2026-11-21T00:49:59.609507-04:00", "bloqueado_hasta": null, "intentos_fallidos": 0}	2026-11-21 00:49:59.593884-04	\N	A
423	\N	notas	INSERT	\N	{"nota": 13.75, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 8, "id_per": 1, "estatus": "A", "id_nota": 21, "id_malla": 27, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
424	\N	notas	INSERT	\N	{"nota": 16.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 8, "id_per": 1, "estatus": "A", "id_nota": 22, "id_malla": 28, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
425	\N	notas	INSERT	\N	{"nota": 19.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 8, "id_per": 1, "estatus": "A", "id_nota": 23, "id_malla": 29, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
426	\N	notas	INSERT	\N	{"nota": 10.50, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 11, "id_per": 1, "estatus": "A", "id_nota": 25, "id_malla": 27, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
427	\N	notas	INSERT	\N	{"nota": 13.75, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 11, "id_per": 1, "estatus": "A", "id_nota": 26, "id_malla": 28, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
428	\N	notas	INSERT	\N	{"nota": 16.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 11, "id_per": 1, "estatus": "A", "id_nota": 27, "id_malla": 29, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
429	\N	notas	INSERT	\N	{"nota": 8.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 9, "id_per": 1, "estatus": "A", "id_nota": 29, "id_malla": 27, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
430	\N	notas	INSERT	\N	{"nota": 11.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 9, "id_per": 1, "estatus": "A", "id_nota": 30, "id_malla": 28, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
431	\N	notas	INSERT	\N	{"nota": 14.50, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 9, "id_per": 1, "estatus": "A", "id_nota": 31, "id_malla": 29, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
432	\N	notas	INSERT	\N	{"nota": 17.75, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 12, "id_per": 1, "estatus": "A", "id_nota": 33, "id_malla": 27, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
433	\N	notas	INSERT	\N	{"nota": 8.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 12, "id_per": 1, "estatus": "A", "id_nota": 34, "id_malla": 28, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
434	\N	notas	INSERT	\N	{"nota": 11.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 12, "id_per": 1, "estatus": "A", "id_nota": 35, "id_malla": 29, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
435	\N	notas	INSERT	\N	{"nota": 12.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 13, "id_per": 1, "estatus": "A", "id_nota": 37, "id_malla": 27, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
436	\N	notas	INSERT	\N	{"nota": 15.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 13, "id_per": 1, "estatus": "A", "id_nota": 38, "id_malla": 28, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
437	\N	notas	INSERT	\N	{"nota": 18.50, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 13, "id_per": 1, "estatus": "A", "id_nota": 39, "id_malla": 29, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
438	\N	notas	INSERT	\N	{"nota": 18.50, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 7, "id_per": 1, "estatus": "A", "id_nota": 41, "id_malla": 27, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
439	\N	notas	INSERT	\N	{"nota": 9.75, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 7, "id_per": 1, "estatus": "A", "id_nota": 42, "id_malla": 28, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
440	\N	notas	INSERT	\N	{"nota": 12.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 7, "id_per": 1, "estatus": "A", "id_nota": 43, "id_malla": 29, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
441	\N	notas	INSERT	\N	{"nota": 15.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 10, "id_per": 1, "estatus": "A", "id_nota": 45, "id_malla": 27, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
442	\N	notas	INSERT	\N	{"nota": 18.50, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 10, "id_per": 1, "estatus": "A", "id_nota": 46, "id_malla": 28, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
443	\N	notas	INSERT	\N	{"nota": 9.75, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 10, "id_per": 1, "estatus": "A", "id_nota": 47, "id_malla": 29, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LPRI T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
444	\N	notas	INSERT	\N	{"nota": 15.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 2, "id_per": 2, "estatus": "A", "id_nota": 49, "id_malla": 75, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
445	\N	notas	INSERT	\N	{"nota": 18.50, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 2, "id_per": 2, "estatus": "A", "id_nota": 50, "id_malla": 76, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
446	\N	notas	INSERT	\N	{"nota": 9.75, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 2, "id_per": 2, "estatus": "A", "id_nota": 51, "id_malla": 77, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
447	\N	notas	INSERT	\N	{"nota": 12.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 2, "id_per": 2, "estatus": "A", "id_nota": 52, "id_malla": 78, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
448	\N	notas	INSERT	\N	{"nota": 15.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 2, "id_per": 2, "estatus": "A", "id_nota": 53, "id_malla": 79, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
449	\N	notas	INSERT	\N	{"nota": 8.50, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 3, "id_per": 2, "estatus": "A", "id_nota": 55, "id_malla": 75, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
450	\N	notas	INSERT	\N	{"nota": 11.75, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 3, "id_per": 2, "estatus": "A", "id_nota": 56, "id_malla": 76, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
451	\N	notas	INSERT	\N	{"nota": 14.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 3, "id_per": 2, "estatus": "A", "id_nota": 57, "id_malla": 77, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
452	\N	notas	INSERT	\N	{"nota": 17.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 3, "id_per": 2, "estatus": "A", "id_nota": 58, "id_malla": 78, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
453	\N	notas	INSERT	\N	{"nota": 8.50, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 3, "id_per": 2, "estatus": "A", "id_nota": 59, "id_malla": 79, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
454	\N	notas	INSERT	\N	{"nota": 13.75, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 4, "id_per": 2, "estatus": "A", "id_nota": 61, "id_malla": 75, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
455	\N	notas	INSERT	\N	{"nota": 16.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 4, "id_per": 2, "estatus": "A", "id_nota": 62, "id_malla": 76, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
456	\N	notas	INSERT	\N	{"nota": 19.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 4, "id_per": 2, "estatus": "A", "id_nota": 63, "id_malla": 77, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
457	\N	notas	INSERT	\N	{"nota": 10.50, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 4, "id_per": 2, "estatus": "A", "id_nota": 64, "id_malla": 78, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
458	\N	notas	INSERT	\N	{"nota": 13.75, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 4, "id_per": 2, "estatus": "A", "id_nota": 65, "id_malla": 79, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
459	\N	notas	INSERT	\N	{"nota": 18.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 67, "id_malla": 75, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
460	\N	notas	INSERT	\N	{"nota": 9.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 68, "id_malla": 76, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
461	\N	notas	INSERT	\N	{"nota": 12.50, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 69, "id_malla": 77, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
462	\N	notas	INSERT	\N	{"nota": 15.75, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 70, "id_malla": 78, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
463	\N	notas	INSERT	\N	{"nota": 18.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 5, "id_per": 2, "estatus": "A", "id_nota": 71, "id_malla": 79, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
464	\N	notas	INSERT	\N	{"nota": 11.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 6, "id_per": 2, "estatus": "A", "id_nota": 73, "id_malla": 75, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
465	\N	notas	INSERT	\N	{"nota": 14.50, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 6, "id_per": 2, "estatus": "A", "id_nota": 74, "id_malla": 76, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
466	\N	notas	INSERT	\N	{"nota": 17.75, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 6, "id_per": 2, "estatus": "A", "id_nota": 75, "id_malla": 77, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
467	\N	notas	INSERT	\N	{"nota": 8.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 6, "id_per": 2, "estatus": "A", "id_nota": 76, "id_malla": 78, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
468	\N	notas	INSERT	\N	{"nota": 11.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 6, "id_per": 2, "estatus": "A", "id_nota": 77, "id_malla": 79, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
469	\N	notas	INSERT	\N	{"nota": 10.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 1, "id_per": 2, "estatus": "A", "id_nota": 79, "id_malla": 75, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
470	\N	notas	INSERT	\N	{"nota": 13.25, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 1, "id_per": 2, "estatus": "A", "id_nota": 80, "id_malla": 76, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
471	\N	notas	INSERT	\N	{"nota": 16.50, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 1, "id_per": 2, "estatus": "A", "id_nota": 81, "id_malla": 77, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
472	\N	notas	INSERT	\N	{"nota": 19.75, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 1, "id_per": 2, "estatus": "A", "id_nota": 82, "id_malla": 78, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
473	\N	notas	INSERT	\N	{"nota": 10.00, "creado": "2026-11-21T09:23:06.684512-04:00", "id_est": 1, "id_per": 2, "estatus": "A", "id_nota": 83, "id_malla": 79, "actualizar": "2026-11-21T09:23:06.684512-04:00", "observaciones": "Acta de demostración — carga masiva LESP T3P1", "fecha_registro": "2026-11-21T09:23:06.684512-04:00", "tipo_evaluacion": "Final"}	2026-11-21 09:23:06.684512-04	\N	A
\.


--
-- TOC entry 5404 (class 0 OID 65698)
-- Dependencies: 263
-- Data for Name: credenciales; Type: TABLE DATA; Schema: general; Owner: postgres
--

COPY general.credenciales (id_cre, id_usu, password_hash, ultimo_acceso, intentos_fallidos, bloqueado_hasta) FROM stdin;
2	2	$pbkdf2-sha256$29000$iLF2LqUUgtB6b.3937s3Bg$s8i.pCBKeTR.qN9PlQ64bagD0EOYlWsUHJ/g77JvFrg	2026-11-21 00:30:53.287009-04	0	\N
1	1	$pbkdf2-sha256$29000$gHCO8T6HcO59rzVmrJWy1g$/a2dYJv0EHxFIjloonscbWfBjmuO/jL59TpBJU/M6c4	2026-11-21 00:49:59.609507-04	0	\N
\.


--
-- TOC entry 5400 (class 0 OID 65666)
-- Dependencies: 259
-- Data for Name: dias_laborales; Type: TABLE DATA; Schema: general; Owner: postgres
--

COPY general.dias_laborales (id_dia, dia, orden, estatus) FROM stdin;
5	Viernes	5	A
6	Sábado	6	A
4	Jueves	4	I
3	Miércoles	3	I
2	Martes	2	I
1	Lunes	1	I
\.


--
-- TOC entry 5430 (class 0 OID 114841)
-- Dependencies: 294
-- Data for Name: modulos; Type: TABLE DATA; Schema: general; Owner: postgres
--

COPY general.modulos (id_mod, codigo, nombre, descripcion, estatus) FROM stdin;
1	roles	Roles	Gestión de roles del sistema	A
2	malla	Malla Curricular	Gestión de la malla curricular	A
3	materias	Materias	Gestión de unidades curriculares	A
4	programas	Programas	Gestión de programas académicos	A
5	secciones	Secciones	Gestión de secciones	A
6	aud_mov	Auditoría	Consulta de bitácora de auditoría	A
7	dias	Días Laborales	Gestión de días laborales	A
8	municipios	Municipios	Gestión de municipios	A
9	usuarios	Usuarios	Gestión de usuarios del sistema	A
10	asig_carga	Asignación de Carga Horaria	Gestión de asignaciones de horario	A
11	espacios	Espacios Físicos	Gestión de aulas y espacios	A
12	disponibilidad	Disponibilidad Docente	Gestión de disponibilidad de docentes	A
13	docentes	Docentes	Gestión de docentes	A
14	estudiantes	Estudiantes	Gestión de estudiantes	A
15	notas	Registro de Notas	Gestión de calificaciones de estudiantes	A
16	periodos	Períodos Académicos	Gestión de períodos académicos	A
\.


--
-- TOC entry 5398 (class 0 OID 65652)
-- Dependencies: 257
-- Data for Name: municipios; Type: TABLE DATA; Schema: general; Owner: postgres
--

COPY general.municipios (id_mun, nombre, estatus) FROM stdin;
1	Andrés Bello	A
3	Ayacucho	A
4	Bolívar	A
5	Cárdenas	A
6	Córdoba	A
7	Fernández Feo	A
8	Francisco de Miranda	A
9	García de Hevia	A
10	Guásimos	A
11	Independencia	A
12	Jáuregui	A
13	José María Vargas	A
14	Junín	A
15	Libertad	A
16	Libertador	A
17	Lobatera	A
18	Michelena	A
19	Panamericano	A
20	Pedro María Ureña	A
21	Rafael Urdaneta	A
22	Samuel Darío Maldonado	A
23	San Cristóbal	A
24	Seboruco	A
25	Simón Rodríguez	A
26	Sucre	A
27	Torbes	A
28	Uribante	A
29	San Judas Tadeo	A
2	Antonio Rómulo Costa	A
\.


--
-- TOC entry 5432 (class 0 OID 114858)
-- Dependencies: 296
-- Data for Name: permisos; Type: TABLE DATA; Schema: general; Owner: postgres
--

COPY general.permisos (id_perm, codigo, nombre, descripcion) FROM stdin;
1	CRE	Crear	Permiso para crear nuevos registros
2	ACT	Actualizar	Permiso para modificar registros existentes
3	LEC	Leer	Permiso para consultar/visualizar registros
4	BOR	Borrar	Permiso para eliminar registros (lógico)
\.


--
-- TOC entry 5434 (class 0 OID 114872)
-- Dependencies: 298
-- Data for Name: permisos_rol; Type: TABLE DATA; Schema: general; Owner: postgres
--

COPY general.permisos_rol (id_pr, id_rol, id_mod, id_perm, alcance, estatus) FROM stdin;
1	1	1	1	TODO	A
2	1	1	2	TODO	A
3	1	1	3	TODO	A
4	1	1	4	TODO	A
5	1	2	1	TODO	A
6	1	2	2	TODO	A
7	1	2	3	TODO	A
8	1	2	4	TODO	A
9	1	3	1	TODO	A
10	1	3	2	TODO	A
11	1	3	3	TODO	A
12	1	3	4	TODO	A
13	1	4	1	TODO	A
14	1	4	2	TODO	A
15	1	4	3	TODO	A
16	1	4	4	TODO	A
17	1	5	1	TODO	A
18	1	5	2	TODO	A
19	1	5	3	TODO	A
20	1	5	4	TODO	A
21	1	6	1	TODO	A
22	1	6	2	TODO	A
23	1	6	3	TODO	A
24	1	6	4	TODO	A
25	1	7	1	TODO	A
26	1	7	2	TODO	A
27	1	7	3	TODO	A
28	1	7	4	TODO	A
29	1	8	1	TODO	A
30	1	8	2	TODO	A
31	1	8	3	TODO	A
32	1	8	4	TODO	A
33	1	9	1	TODO	A
34	1	9	2	TODO	A
35	1	9	3	TODO	A
36	1	9	4	TODO	A
37	1	10	1	TODO	A
38	1	10	2	TODO	A
39	1	10	3	TODO	A
40	1	10	4	TODO	A
41	1	11	1	TODO	A
42	1	11	2	TODO	A
43	1	11	3	TODO	A
44	1	11	4	TODO	A
45	1	12	1	TODO	A
46	1	12	2	TODO	A
47	1	12	3	TODO	A
48	1	12	4	TODO	A
49	1	13	1	TODO	A
50	1	13	2	TODO	A
51	1	13	3	TODO	A
52	1	13	4	TODO	A
53	1	14	1	TODO	A
54	1	14	2	TODO	A
55	1	14	3	TODO	A
56	1	14	4	TODO	A
57	1	15	1	TODO	A
58	1	15	2	TODO	A
59	1	15	3	TODO	A
60	1	15	4	TODO	A
61	1	16	1	TODO	A
62	1	16	2	TODO	A
63	1	16	3	TODO	A
64	1	16	4	TODO	A
65	2	13	3	TODO	A
66	2	13	1	TODO	A
67	2	13	2	TODO	A
68	2	14	3	TODO	A
69	2	14	1	TODO	A
70	2	14	2	TODO	A
71	2	2	3	SP	A
72	2	2	1	TODO	A
73	2	2	2	TODO	A
74	2	10	3	SP	A
75	2	10	1	TODO	A
76	2	10	2	TODO	A
77	2	5	3	SP	A
78	2	5	1	TODO	A
79	2	5	2	TODO	A
80	2	4	3	SP	A
81	2	4	1	TODO	A
82	2	4	2	TODO	A
83	2	11	3	TODO	A
84	2	11	1	TODO	A
85	2	11	2	TODO	A
87	2	7	3	TODO	A
88	2	7	1	TODO	A
89	2	7	2	TODO	A
90	2	8	3	TODO	A
91	2	8	1	TODO	A
92	2	8	2	TODO	A
93	2	9	3	SP	A
94	2	9	1	SP	A
95	2	9	2	SP	A
96	2	12	3	TODO	A
97	2	12	1	NAD	A
98	2	3	3	SP	A
99	2	3	1	TODO	A
100	2	3	2	TODO	A
106	3	10	1	TODO	A
107	3	10	2	TODO	A
109	3	12	3	SP	A
110	3	12	1	TODO	A
111	3	12	2	TODO	A
113	3	15	1	TODO	A
114	3	15	2	TODO	A
115	3	2	3	SP	A
116	3	3	3	SP	A
117	3	4	3	SP	A
118	3	5	3	SP	A
119	3	7	3	TODO	A
120	3	8	3	TODO	A
121	3	9	3	SP	A
122	3	9	2	SP	A
123	4	13	3	SP	A
124	4	14	3	SP	A
125	4	14	2	SP	A
126	4	10	3	SP	A
127	4	11	3	SP	A
129	4	2	3	SP	A
130	4	3	3	SP	A
131	4	4	3	SP	A
132	4	5	3	SP	A
133	4	7	3	TODO	A
134	4	8	3	TODO	A
135	4	9	3	SP	A
136	4	9	2	SP	A
112	3	15	3	TODO	A
137	2	15	3	TODO	A
128	4	15	3	SP	A
147	4	15	2	SP	A
148	4	16	3	TODO	A
146	2	16	3	TODO	A
153	3	16	3	SP	A
154	3	15	4	TODO	A
155	3	10	4	TODO	A
86	2	6	3	LIM	A
101	3	13	3	TODO	A
103	3	14	3	TODO	A
102	3	13	2	SP	I
104	3	14	2	SP	I
105	3	10	3	TODO	A
\.


--
-- TOC entry 5436 (class 0 OID 114908)
-- Dependencies: 300
-- Data for Name: permisos_usuario; Type: TABLE DATA; Schema: general; Owner: postgres
--

COPY general.permisos_usuario (id_pu, id_usu, id_mod, id_perm, alcance, estatus) FROM stdin;
\.


--
-- TOC entry 5396 (class 0 OID 65637)
-- Dependencies: 255
-- Data for Name: roles; Type: TABLE DATA; Schema: general; Owner: postgres
--

COPY general.roles (id_rol, rol, descripcion, estatus) FROM stdin;
1	ADMIN	Administrador del sistema con acceso total	A
2	VICERRECTOR	Vicerrector con visión global de la sede	A
3	COORDINADOR	Coordinador de programa (Primaria/Especial)	A
4	DOCENTE	Docente con acceso a su carga horaria y asesorías	A
5	ESTUDIANTE	Rol reservado sin acceso al sistema: la matrícula estudiantil no opera el módulo administrativo. Se conserva para futuras integraciones (portal de consulta de calificaciones).	A
\.


--
-- TOC entry 5402 (class 0 OID 65681)
-- Dependencies: 261
-- Data for Name: usuarios; Type: TABLE DATA; Schema: general; Owner: postgres
--

COPY general.usuarios (id_usu, username, id_rol, estatus, creado, actualizar, email) FROM stdin;
1	admin	1	A	2026-10-29 03:05:47.546227-04	2026-10-29 03:05:47.546404-04	\N
2	coordinador1	3	A	2026-11-20 18:29:53.653537-04	2026-11-20 18:29:53.653537-04	coordinador1@unem.edu.ve
\.


--
-- TOC entry 5416 (class 0 OID 65855)
-- Dependencies: 275
-- Data for Name: asig_carga_horarias; Type: TABLE DATA; Schema: horarios; Owner: postgres
--

COPY horarios.asig_carga_horarias (id_asig, id_doc, id_esp, id_dia, id_malla, id_per, hora_inicio, hora_fin, tipo_actividad, observaciones, estatus, creado, actualizar, id_sec) FROM stdin;
1	1	1	1	1	1	08:00:00	10:00:00	Carga Académica	\N	A	2026-10-03 10:55:20.264002-04	2026-10-03 10:55:20.264002-04	\N
2	2	2	1	51	2	08:00:00	10:00:00	Carga Académica	\N	A	2026-10-03 10:55:20.264002-04	2026-10-03 10:55:20.264002-04	\N
3	2	3	2	\N	2	10:00:00	12:00:00	Asesoría	\N	A	2026-10-03 10:55:20.264002-04	2026-10-03 10:55:20.264002-04	\N
4	2	10	1	2	1	07:00:00	08:00:00	Carga Académica	Asignación directa	A	2026-11-12 22:24:22.497011-04	2026-11-12 22:24:22.497037-04	\N
6	2	1	3	8	1	07:00:00	08:00:00	Carga Académica	Asignación directa	A	2026-11-12 22:54:26.031262-04	2026-11-12 22:54:26.031291-04	\N
7	1	11	2	4	1	07:00:00	11:00:00	Carga Académica	Asignación directa	A	2026-11-13 02:56:20.453382-04	2026-11-13 02:56:20.453395-04	\N
8	4	3	5	3	2	07:00:00	08:00:00	Carga Académica	Asignación directa	A	2026-11-18 01:36:18.511075-04	2026-11-18 01:36:18.511082-04	\N
\.


--
-- TOC entry 5414 (class 0 OID 65809)
-- Dependencies: 273
-- Data for Name: espacios_fis; Type: TABLE DATA; Schema: infraestructura; Owner: postgres
--

COPY infraestructura.espacios_fis (id_esp, id_mun, nombre_centro, ubicacion, tipo_espacio, capacidad, equipamiento, disponibilidad, estatus, creado, actualizar) FROM stdin;
1	23	Escuela Bustamante	Aula 1	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
2	23	Escuela Bustamante	Aula 2	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
3	23	Escuela Bustamante	Aula 3	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
4	23	Escuela Bustamante	Aula 4	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
5	23	Escuela Bustamante	Aula 5	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
6	23	Escuela Bustamante	Aula 6	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
7	23	Escuela Bustamante	Aula 7	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
8	23	Escuela Bustamante	Aula 8	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
9	23	Escuela Bustamante	Aula 9	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
10	23	Escuela Bustamante	Aula 10	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
11	23	Escuela Bustamante	Aula 11	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
12	23	Escuela Bustamante	Aula 12	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
13	23	Escuela Bustamante	Aula 13	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
14	23	Escuela Bustamante	Aula 14	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
15	23	Escuela Bustamante	Aula 15	Aula	30	Pizarrón, Proyector, 30 pupitres	t	A	2026-10-03 10:55:20.264002-04	2026-11-14 15:13:47.405095-04
16	23	Escuela Bustamante	Aula 16	Aula	30	\N	f	I	2026-11-20 10:52:50.664432-04	2026-11-20 17:49:25.404452-04
\.


--
-- TOC entry 5412 (class 0 OID 65788)
-- Dependencies: 271
-- Data for Name: disponibilidad_docente; Type: TABLE DATA; Schema: personas; Owner: postgres
--

COPY personas.disponibilidad_docente (id_disp, id_doc, id_dia, hora_inicio, hora_fin, estatus) FROM stdin;
\.


--
-- TOC entry 5408 (class 0 OID 65728)
-- Dependencies: 267
-- Data for Name: docentes; Type: TABLE DATA; Schema: personas; Owner: postgres
--

COPY personas.docentes (id_doc, id_usu, cedula, nombre, apellido, id_mun, especialidad, tipo_contrato, horas_max_sem, horas_asignadas, horas_disponibles, telefono, estatus, creado, actualizar, observaciones, foto_url) FROM stdin;
3	\N	V-11492534	IRIS MARISOL	RAMIREZ HERNANDEZ	23	Educación Especial	Estipendio	20	0	20	04161740853	A	2026-11-13 16:20:59.408443-04	2026-11-17 18:09:32.72661-04	\N	\N
4	\N	V-13792150	ERIKA DE LA CONSOLACION	VARELA SAYAGO	23	Educación Primaria	Estipendio	20	1	19	04264937637	A	2026-11-13 16:55:56.866854-04	2026-11-17 21:36:18.469709-04	\N	\N
2	\N	V-87654321	Carlos	Rodríguez López	23	Educación Especial	Contratado	30	6	24	04249876543	A	2026-10-03 10:55:20.264002-04	2026-11-15 22:43:40.539145-04	\N	\N
1	\N	V-12345678	María	González	23	Educación Primaria	Estipendio	20	6	14	04149998877	A	2026-10-03 10:55:20.264002-04	2026-11-16 20:13:23.095142-04	\N	\N
\.


--
-- TOC entry 5410 (class 0 OID 65764)
-- Dependencies: 269
-- Data for Name: estudiantes; Type: TABLE DATA; Schema: personas; Owner: postgres
--

COPY personas.estudiantes (id_est, id_usu, cedula, id_mun, nombre, apellido, id_pro, id_sec, trayecto, estatus, creado, actualizar, foto_url) FROM stdin;
3	\N	V-14602580	23	YASMIN VICTORIA	GOMEZ DE OCORO	2	5	3	A	2026-11-13 16:20:59.408443-04	2026-11-15 11:37:12.091811-04	\N
4	\N	V-14606863	23	LUZ MARINA	GOMEZ URIBE	2	5	3	A	2026-11-13 16:20:59.408443-04	2026-11-15 11:37:18.853449-04	\N
6	\N	V-20618493	23	SIASKA LORENA	GRANADOS JAIMES	2	5	3	A	2026-11-13 16:20:59.408443-04	2026-11-15 11:37:23.889603-04	\N
8	\N	V-13172105	23	GERMAN YOBANNY	GUERRERO MORA	1	6	3	A	2026-11-13 16:55:56.866854-04	2026-11-15 11:37:30.538896-04	\N
5	\N	V-16230741	23	YURI COROMOTO	MESA GARZON	2	5	3	A	2026-11-13 16:20:59.408443-04	2026-11-15 11:37:39.9358-04	\N
11	\N	V-10167912	23	LUZ MARINA	MONTILVA DE ORTEGA	1	6	3	A	2026-11-13 16:55:56.866854-04	2026-11-15 11:37:45.282443-04	\N
2	\N	V-14225517	23	MAYE ALEJANDRA	NIÑO COLMENARES	2	5	3	A	2026-11-13 16:20:59.408443-04	2026-11-15 11:37:51.28813-04	\N
9	\N	V-15157076	23	YADELSY MAGALY	NOVA BECERRA	1	6	3	A	2026-11-13 16:55:56.866854-04	2026-11-15 11:37:55.416809-04	\N
12	\N	V-15881009	23	INGRID NAYARI	ONTIVEROS ONTIVEROS	1	6	3	A	2026-11-13 16:55:56.866854-04	2026-11-15 11:37:59.442007-04	\N
13	\N	V-21003553	23	ANNY YOHANA	SANABRIA ONTIVEROS	1	6	3	A	2026-11-13 16:55:56.866854-04	2026-11-15 11:38:05.916871-04	\N
7	\N	V-13171134	23	DAYGNE YUBISAY	TREJO MORALES	1	6	3	A	2026-11-13 16:55:56.866854-04	2026-11-15 11:38:11.129673-04	\N
10	\N	V-7873867	23	NIRIA ZULAY	COLINA GONZALEZ	1	6	3	A	2026-11-13 16:55:56.866854-04	2026-11-15 11:38:45.167368-04	\N
1	\N	V-12516920	23	JAHYDDY GUADALUPE	HANTUCH MENDOZA	2	5	3	A	2026-11-13 16:20:59.408443-04	2026-11-21 00:32:30.593315-04	\N
\.


--
-- TOC entry 5711 (class 0 OID 0)
-- Dependencies: 278
-- Name: ejes_formativos_id_eje_seq; Type: SEQUENCE SET; Schema: academico; Owner: postgres
--

SELECT pg_catalog.setval('academico.ejes_formativos_id_eje_seq', 6, true);


--
-- TOC entry 5712 (class 0 OID 0)
-- Dependencies: 282
-- Name: malla_curricular_id_malla_seq; Type: SEQUENCE SET; Schema: academico; Owner: postgres
--

SELECT pg_catalog.setval('academico.malla_curricular_id_malla_seq', 95, true);


--
-- TOC entry 5713 (class 0 OID 0)
-- Dependencies: 280
-- Name: materias_id_mat_seq; Type: SEQUENCE SET; Schema: academico; Owner: postgres
--

SELECT pg_catalog.setval('academico.materias_id_mat_seq', 95, true);


--
-- TOC entry 5714 (class 0 OID 0)
-- Dependencies: 301
-- Name: notas_id_nota_seq; Type: SEQUENCE SET; Schema: academico; Owner: postgres
--

SELECT pg_catalog.setval('academico.notas_id_nota_seq', 147, true);


--
-- TOC entry 5715 (class 0 OID 0)
-- Dependencies: 284
-- Name: periodos_academicos_id_per_seq; Type: SEQUENCE SET; Schema: academico; Owner: postgres
--

SELECT pg_catalog.setval('academico.periodos_academicos_id_per_seq', 2, true);


--
-- TOC entry 5716 (class 0 OID 0)
-- Dependencies: 276
-- Name: programas_id_pro_seq; Type: SEQUENCE SET; Schema: academico; Owner: postgres
--

SELECT pg_catalog.setval('academico.programas_id_pro_seq', 2, true);


--
-- TOC entry 5717 (class 0 OID 0)
-- Dependencies: 286
-- Name: secciones_id_sec_seq; Type: SEQUENCE SET; Schema: academico; Owner: postgres
--

SELECT pg_catalog.setval('academico.secciones_id_sec_seq', 6, true);


--
-- TOC entry 5718 (class 0 OID 0)
-- Dependencies: 264
-- Name: aud_mov_id_aud_seq; Type: SEQUENCE SET; Schema: general; Owner: postgres
--

SELECT pg_catalog.setval('general.aud_mov_id_aud_seq', 473, true);


--
-- TOC entry 5719 (class 0 OID 0)
-- Dependencies: 262
-- Name: credenciales_id_cre_seq; Type: SEQUENCE SET; Schema: general; Owner: postgres
--

SELECT pg_catalog.setval('general.credenciales_id_cre_seq', 2, true);


--
-- TOC entry 5720 (class 0 OID 0)
-- Dependencies: 258
-- Name: dias_laborales_id_dia_seq; Type: SEQUENCE SET; Schema: general; Owner: postgres
--

SELECT pg_catalog.setval('general.dias_laborales_id_dia_seq', 7, true);


--
-- TOC entry 5721 (class 0 OID 0)
-- Dependencies: 293
-- Name: modulos_id_mod_seq; Type: SEQUENCE SET; Schema: general; Owner: postgres
--

SELECT pg_catalog.setval('general.modulos_id_mod_seq', 16, true);


--
-- TOC entry 5722 (class 0 OID 0)
-- Dependencies: 256
-- Name: municipios_id_mun_seq; Type: SEQUENCE SET; Schema: general; Owner: postgres
--

SELECT pg_catalog.setval('general.municipios_id_mun_seq', 29, true);


--
-- TOC entry 5723 (class 0 OID 0)
-- Dependencies: 295
-- Name: permisos_id_perm_seq; Type: SEQUENCE SET; Schema: general; Owner: postgres
--

SELECT pg_catalog.setval('general.permisos_id_perm_seq', 4, true);


--
-- TOC entry 5724 (class 0 OID 0)
-- Dependencies: 297
-- Name: permisos_rol_id_pr_seq; Type: SEQUENCE SET; Schema: general; Owner: postgres
--

SELECT pg_catalog.setval('general.permisos_rol_id_pr_seq', 155, true);


--
-- TOC entry 5725 (class 0 OID 0)
-- Dependencies: 299
-- Name: permisos_usuario_id_pu_seq; Type: SEQUENCE SET; Schema: general; Owner: postgres
--

SELECT pg_catalog.setval('general.permisos_usuario_id_pu_seq', 1, false);


--
-- TOC entry 5726 (class 0 OID 0)
-- Dependencies: 254
-- Name: roles_id_rol_seq; Type: SEQUENCE SET; Schema: general; Owner: postgres
--

SELECT pg_catalog.setval('general.roles_id_rol_seq', 5, true);


--
-- TOC entry 5727 (class 0 OID 0)
-- Dependencies: 260
-- Name: usuarios_id_usu_seq; Type: SEQUENCE SET; Schema: general; Owner: postgres
--

SELECT pg_catalog.setval('general.usuarios_id_usu_seq', 2, true);


--
-- TOC entry 5728 (class 0 OID 0)
-- Dependencies: 274
-- Name: asig_carga_horarias_id_asig_seq; Type: SEQUENCE SET; Schema: horarios; Owner: postgres
--

SELECT pg_catalog.setval('horarios.asig_carga_horarias_id_asig_seq', 8, true);


--
-- TOC entry 5729 (class 0 OID 0)
-- Dependencies: 272
-- Name: espacios_fis_id_esp_seq; Type: SEQUENCE SET; Schema: infraestructura; Owner: postgres
--

SELECT pg_catalog.setval('infraestructura.espacios_fis_id_esp_seq', 16, true);


--
-- TOC entry 5730 (class 0 OID 0)
-- Dependencies: 270
-- Name: disponibilidad_docente_id_disp_seq; Type: SEQUENCE SET; Schema: personas; Owner: postgres
--

SELECT pg_catalog.setval('personas.disponibilidad_docente_id_disp_seq', 1, false);


--
-- TOC entry 5731 (class 0 OID 0)
-- Dependencies: 266
-- Name: docentes_id_doc_seq; Type: SEQUENCE SET; Schema: personas; Owner: postgres
--

SELECT pg_catalog.setval('personas.docentes_id_doc_seq', 4, true);


--
-- TOC entry 5732 (class 0 OID 0)
-- Dependencies: 268
-- Name: estudiantes_id_est_seq; Type: SEQUENCE SET; Schema: personas; Owner: postgres
--

SELECT pg_catalog.setval('personas.estudiantes_id_est_seq', 13, true);


--
-- TOC entry 5123 (class 2606 OID 65927)
-- Name: ejes_formativos pk_ejes; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.ejes_formativos
    ADD CONSTRAINT pk_ejes PRIMARY KEY (id_eje);


--
-- TOC entry 5733 (class 0 OID 0)
-- Dependencies: 5123
-- Name: CONSTRAINT pk_ejes ON ejes_formativos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_ejes ON academico.ejes_formativos IS 'Llave primaria para el identificador único del eje formativo.';


--
-- TOC entry 5136 (class 2606 OID 65975)
-- Name: malla_curricular pk_malla; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.malla_curricular
    ADD CONSTRAINT pk_malla PRIMARY KEY (id_malla);


--
-- TOC entry 5734 (class 0 OID 0)
-- Dependencies: 5136
-- Name: CONSTRAINT pk_malla ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_malla ON academico.malla_curricular IS 'Llave primaria de la tabla malla_curricular.';


--
-- TOC entry 5129 (class 2606 OID 65950)
-- Name: materias pk_materias; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.materias
    ADD CONSTRAINT pk_materias PRIMARY KEY (id_mat);


--
-- TOC entry 5735 (class 0 OID 0)
-- Dependencies: 5129
-- Name: CONSTRAINT pk_materias ON materias; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_materias ON academico.materias IS 'Llave primaria para identificar de forma única cada materia.';


--
-- TOC entry 5173 (class 2606 OID 114966)
-- Name: notas pk_notas; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.notas
    ADD CONSTRAINT pk_notas PRIMARY KEY (id_nota);


--
-- TOC entry 5736 (class 0 OID 0)
-- Dependencies: 5173
-- Name: CONSTRAINT pk_notas ON notas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_notas ON academico.notas IS 'Llave primaria de la tabla de notas.';


--
-- TOC entry 5140 (class 2606 OID 66001)
-- Name: periodos_academicos pk_periodos; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.periodos_academicos
    ADD CONSTRAINT pk_periodos PRIMARY KEY (id_per);


--
-- TOC entry 5737 (class 0 OID 0)
-- Dependencies: 5140
-- Name: CONSTRAINT pk_periodos ON periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_periodos ON academico.periodos_academicos IS 'Llave primaria de la tabla periodos_academicos.';


--
-- TOC entry 5119 (class 2606 OID 65911)
-- Name: programas pk_programas; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.programas
    ADD CONSTRAINT pk_programas PRIMARY KEY (id_pro);


--
-- TOC entry 5738 (class 0 OID 0)
-- Dependencies: 5119
-- Name: CONSTRAINT pk_programas ON programas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_programas ON academico.programas IS 'Llave primaria del catálogo de programas académicos.';


--
-- TOC entry 5143 (class 2606 OID 66025)
-- Name: secciones pk_secciones; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.secciones
    ADD CONSTRAINT pk_secciones PRIMARY KEY (id_sec);


--
-- TOC entry 5739 (class 0 OID 0)
-- Dependencies: 5143
-- Name: CONSTRAINT pk_secciones ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT pk_secciones ON academico.secciones IS 'Llave primaria de la tabla de secciones.';


--
-- TOC entry 5125 (class 2606 OID 65929)
-- Name: ejes_formativos unq_ejes_codigo; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.ejes_formativos
    ADD CONSTRAINT unq_ejes_codigo UNIQUE (codigo);


--
-- TOC entry 5740 (class 0 OID 0)
-- Dependencies: 5125
-- Name: CONSTRAINT unq_ejes_codigo ON ejes_formativos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT unq_ejes_codigo ON academico.ejes_formativos IS 'Regla de unicidad para garantizar que ningún código de eje se repita.';


--
-- TOC entry 5131 (class 2606 OID 65952)
-- Name: materias unq_materias_codigo; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.materias
    ADD CONSTRAINT unq_materias_codigo UNIQUE (codigo);


--
-- TOC entry 5741 (class 0 OID 0)
-- Dependencies: 5131
-- Name: CONSTRAINT unq_materias_codigo ON materias; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT unq_materias_codigo ON academico.materias IS 'Regla que impide registrar dos materias con el mismo código.';


--
-- TOC entry 5175 (class 2606 OID 114968)
-- Name: notas unq_nota_estudiante_materia_periodo; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.notas
    ADD CONSTRAINT unq_nota_estudiante_materia_periodo UNIQUE (id_est, id_malla, id_per, tipo_evaluacion);


--
-- TOC entry 5742 (class 0 OID 0)
-- Dependencies: 5175
-- Name: CONSTRAINT unq_nota_estudiante_materia_periodo ON notas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT unq_nota_estudiante_materia_periodo ON academico.notas IS 'Evita notas duplicadas para el mismo estudiante, materia, período y tipo de evaluación.';


--
-- TOC entry 5121 (class 2606 OID 65913)
-- Name: programas unq_programas_codigo; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.programas
    ADD CONSTRAINT unq_programas_codigo UNIQUE (codigo);


--
-- TOC entry 5743 (class 0 OID 0)
-- Dependencies: 5121
-- Name: CONSTRAINT unq_programas_codigo ON programas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT unq_programas_codigo ON academico.programas IS 'Regla de base de datos que prohíbe códigos de programa duplicados.';


--
-- TOC entry 5145 (class 2606 OID 66027)
-- Name: secciones unq_secciones_codigo; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.secciones
    ADD CONSTRAINT unq_secciones_codigo UNIQUE (codigo);


--
-- TOC entry 5744 (class 0 OID 0)
-- Dependencies: 5145
-- Name: CONSTRAINT unq_secciones_codigo ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT unq_secciones_codigo ON academico.secciones IS 'Evita la creación de dos secciones con el mismo código exacto.';


--
-- TOC entry 5061 (class 2606 OID 65679)
-- Name: dias_laborales dia_lab_unq; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.dias_laborales
    ADD CONSTRAINT dia_lab_unq UNIQUE (dia);


--
-- TOC entry 5745 (class 0 OID 0)
-- Dependencies: 5061
-- Name: CONSTRAINT dia_lab_unq ON dias_laborales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT dia_lab_unq ON general.dias_laborales IS 'Comprobación única para que no se repitan los días';


--
-- TOC entry 5072 (class 2606 OID 65709)
-- Name: credenciales id_usu_unq; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.credenciales
    ADD CONSTRAINT id_usu_unq UNIQUE (id_usu);


--
-- TOC entry 5746 (class 0 OID 0)
-- Dependencies: 5072
-- Name: CONSTRAINT id_usu_unq ON credenciales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT id_usu_unq ON general.credenciales IS 'Regla para que el identificador del usuario sea único';


--
-- TOC entry 5057 (class 2606 OID 65664)
-- Name: municipios mun_nom; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.municipios
    ADD CONSTRAINT mun_nom UNIQUE (nombre);


--
-- TOC entry 5747 (class 0 OID 0)
-- Dependencies: 5057
-- Name: CONSTRAINT mun_nom ON municipios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT mun_nom ON general.municipios IS 'Regla que hace unico cadaa nombre del municipio para que no se repitan';


--
-- TOC entry 5063 (class 2606 OID 65677)
-- Name: dias_laborales pk_id; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.dias_laborales
    ADD CONSTRAINT pk_id PRIMARY KEY (id_dia);


--
-- TOC entry 5748 (class 0 OID 0)
-- Dependencies: 5063
-- Name: CONSTRAINT pk_id ON dias_laborales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_id ON general.dias_laborales IS 'Llave primaria del Identificador';


--
-- TOC entry 5080 (class 2606 OID 65726)
-- Name: aud_mov pk_id_aud; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.aud_mov
    ADD CONSTRAINT pk_id_aud PRIMARY KEY (id_aud);


--
-- TOC entry 5749 (class 0 OID 0)
-- Dependencies: 5080
-- Name: CONSTRAINT pk_id_aud ON aud_mov; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_id_aud ON general.aud_mov IS 'Llave primaria del id serializado de auditoria';


--
-- TOC entry 5074 (class 2606 OID 65707)
-- Name: credenciales pk_id_cre; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.credenciales
    ADD CONSTRAINT pk_id_cre PRIMARY KEY (id_cre);


--
-- TOC entry 5750 (class 0 OID 0)
-- Dependencies: 5074
-- Name: CONSTRAINT pk_id_cre ON credenciales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_id_cre ON general.credenciales IS 'Llave primaria de los identificadores de credenciales';


--
-- TOC entry 5055 (class 2606 OID 65650)
-- Name: roles pk_id_rol; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.roles
    ADD CONSTRAINT pk_id_rol PRIMARY KEY (id_rol);


--
-- TOC entry 5751 (class 0 OID 0)
-- Dependencies: 5055
-- Name: CONSTRAINT pk_id_rol ON roles; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_id_rol ON general.roles IS 'Llave primaria para el identificador del rol';


--
-- TOC entry 5068 (class 2606 OID 65696)
-- Name: usuarios pk_id_usu; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.usuarios
    ADD CONSTRAINT pk_id_usu PRIMARY KEY (id_usu);


--
-- TOC entry 5752 (class 0 OID 0)
-- Dependencies: 5068
-- Name: CONSTRAINT pk_id_usu ON usuarios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_id_usu ON general.usuarios IS 'Llave primaria del identificador de usuario';


--
-- TOC entry 5147 (class 2606 OID 114854)
-- Name: modulos pk_modulos; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.modulos
    ADD CONSTRAINT pk_modulos PRIMARY KEY (id_mod);


--
-- TOC entry 5753 (class 0 OID 0)
-- Dependencies: 5147
-- Name: CONSTRAINT pk_modulos ON modulos; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_modulos ON general.modulos IS 'Llave primaria del catálogo de módulos.';


--
-- TOC entry 5059 (class 2606 OID 65662)
-- Name: municipios pk_mun; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.municipios
    ADD CONSTRAINT pk_mun PRIMARY KEY (id_mun);


--
-- TOC entry 5754 (class 0 OID 0)
-- Dependencies: 5059
-- Name: CONSTRAINT pk_mun ON municipios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_mun ON general.municipios IS 'Llave primaria del municipio';


--
-- TOC entry 5151 (class 2606 OID 114868)
-- Name: permisos pk_permisos; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos
    ADD CONSTRAINT pk_permisos PRIMARY KEY (id_perm);


--
-- TOC entry 5755 (class 0 OID 0)
-- Dependencies: 5151
-- Name: CONSTRAINT pk_permisos ON permisos; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_permisos ON general.permisos IS 'Llave primaria del catálogo de permisos.';


--
-- TOC entry 5158 (class 2606 OID 114887)
-- Name: permisos_rol pk_permisos_rol; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos_rol
    ADD CONSTRAINT pk_permisos_rol PRIMARY KEY (id_pr);


--
-- TOC entry 5756 (class 0 OID 0)
-- Dependencies: 5158
-- Name: CONSTRAINT pk_permisos_rol ON permisos_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_permisos_rol ON general.permisos_rol IS 'Llave primaria de permisos por rol.';


--
-- TOC entry 5164 (class 2606 OID 114921)
-- Name: permisos_usuario pk_permisos_usuario; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos_usuario
    ADD CONSTRAINT pk_permisos_usuario PRIMARY KEY (id_pu);


--
-- TOC entry 5757 (class 0 OID 0)
-- Dependencies: 5164
-- Name: CONSTRAINT pk_permisos_usuario ON permisos_usuario; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT pk_permisos_usuario ON general.permisos_usuario IS 'Llave primaria de permisos de usuario.';


--
-- TOC entry 5149 (class 2606 OID 114856)
-- Name: modulos unq_modulos_codigo; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.modulos
    ADD CONSTRAINT unq_modulos_codigo UNIQUE (codigo);


--
-- TOC entry 5758 (class 0 OID 0)
-- Dependencies: 5149
-- Name: CONSTRAINT unq_modulos_codigo ON modulos; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT unq_modulos_codigo ON general.modulos IS 'Garantiza que no existan dos módulos con el mismo código. Crea índice implícito para búsquedas rápidas.';


--
-- TOC entry 5153 (class 2606 OID 114870)
-- Name: permisos unq_permisos_codigo; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos
    ADD CONSTRAINT unq_permisos_codigo UNIQUE (codigo);


--
-- TOC entry 5759 (class 0 OID 0)
-- Dependencies: 5153
-- Name: CONSTRAINT unq_permisos_codigo ON permisos; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT unq_permisos_codigo ON general.permisos IS 'Garantiza que no existan dos permisos con el mismo código.';


--
-- TOC entry 5160 (class 2606 OID 114889)
-- Name: permisos_rol unq_permisos_rol; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos_rol
    ADD CONSTRAINT unq_permisos_rol UNIQUE (id_rol, id_mod, id_perm);


--
-- TOC entry 5760 (class 0 OID 0)
-- Dependencies: 5160
-- Name: CONSTRAINT unq_permisos_rol ON permisos_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT unq_permisos_rol ON general.permisos_rol IS 'Evita duplicar la combinación rol+módulo+permiso.';


--
-- TOC entry 5166 (class 2606 OID 114923)
-- Name: permisos_usuario unq_permisos_usuario; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos_usuario
    ADD CONSTRAINT unq_permisos_usuario UNIQUE (id_usu, id_mod, id_perm);


--
-- TOC entry 5761 (class 0 OID 0)
-- Dependencies: 5166
-- Name: CONSTRAINT unq_permisos_usuario ON permisos_usuario; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT unq_permisos_usuario ON general.permisos_usuario IS 'Evita duplicar la combinación usuario+módulo+permiso.';


--
-- TOC entry 5070 (class 2606 OID 114795)
-- Name: usuarios unq_usuarios_email; Type: CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.usuarios
    ADD CONSTRAINT unq_usuarios_email UNIQUE (email);


--
-- TOC entry 5762 (class 0 OID 0)
-- Dependencies: 5070
-- Name: CONSTRAINT unq_usuarios_email ON usuarios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT unq_usuarios_email ON general.usuarios IS 'Garantiza que no existan dos usuarios con el mismo correo electrónico. Agregado en v3.5.';


--
-- TOC entry 5116 (class 2606 OID 65876)
-- Name: asig_carga_horarias pk_asig; Type: CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT pk_asig PRIMARY KEY (id_asig);


--
-- TOC entry 5763 (class 0 OID 0)
-- Dependencies: 5116
-- Name: CONSTRAINT pk_asig ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT pk_asig ON horarios.asig_carga_horarias IS 'Clave primaria que identifica de manera única e irrepetible cada registro de asignación de carga horaria.';


--
-- TOC entry 5106 (class 2606 OID 65834)
-- Name: espacios_fis pk_espacios; Type: CONSTRAINT; Schema: infraestructura; Owner: postgres
--

ALTER TABLE ONLY infraestructura.espacios_fis
    ADD CONSTRAINT pk_espacios PRIMARY KEY (id_esp);


--
-- TOC entry 5764 (class 0 OID 0)
-- Dependencies: 5106
-- Name: CONSTRAINT pk_espacios ON espacios_fis; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON CONSTRAINT pk_espacios ON infraestructura.espacios_fis IS 'Llave primaria para identificar los espacios físicos disponibles';


--
-- TOC entry 5102 (class 2606 OID 65802)
-- Name: disponibilidad_docente pk_disponibilidad; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.disponibilidad_docente
    ADD CONSTRAINT pk_disponibilidad PRIMARY KEY (id_disp);


--
-- TOC entry 5765 (class 0 OID 0)
-- Dependencies: 5102
-- Name: CONSTRAINT pk_disponibilidad ON disponibilidad_docente; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT pk_disponibilidad ON personas.disponibilidad_docente IS 'Llave primaria de la disponibilidad de los docentes';


--
-- TOC entry 5095 (class 2606 OID 65782)
-- Name: estudiantes pk_estudiantes; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes
    ADD CONSTRAINT pk_estudiantes PRIMARY KEY (id_est);


--
-- TOC entry 5766 (class 0 OID 0)
-- Dependencies: 5095
-- Name: CONSTRAINT pk_estudiantes ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT pk_estudiantes ON personas.estudiantes IS 'Llave primaria para el identificador de los estudiantes';


--
-- TOC entry 5086 (class 2606 OID 65758)
-- Name: docentes pk_id_docentes; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.docentes
    ADD CONSTRAINT pk_id_docentes PRIMARY KEY (id_doc);


--
-- TOC entry 5767 (class 0 OID 0)
-- Dependencies: 5086
-- Name: CONSTRAINT pk_id_docentes ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT pk_id_docentes ON personas.docentes IS 'Llave primaria del identificador serializado de los docentes';


--
-- TOC entry 5088 (class 2606 OID 65760)
-- Name: docentes unq_docentes_cedula; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.docentes
    ADD CONSTRAINT unq_docentes_cedula UNIQUE (cedula);


--
-- TOC entry 5768 (class 0 OID 0)
-- Dependencies: 5088
-- Name: CONSTRAINT unq_docentes_cedula ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT unq_docentes_cedula ON personas.docentes IS 'Identificar que la cedula del docente sea única';


--
-- TOC entry 5090 (class 2606 OID 65762)
-- Name: docentes unq_docentes_usuario; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.docentes
    ADD CONSTRAINT unq_docentes_usuario UNIQUE (id_usu);


--
-- TOC entry 5769 (class 0 OID 0)
-- Dependencies: 5090
-- Name: CONSTRAINT unq_docentes_usuario ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT unq_docentes_usuario ON personas.docentes IS 'Identificcar que el identificador del usuario del docente sea único';


--
-- TOC entry 5097 (class 2606 OID 65784)
-- Name: estudiantes unq_estudiantes_cedula; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes
    ADD CONSTRAINT unq_estudiantes_cedula UNIQUE (cedula);


--
-- TOC entry 5770 (class 0 OID 0)
-- Dependencies: 5097
-- Name: CONSTRAINT unq_estudiantes_cedula ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT unq_estudiantes_cedula ON personas.estudiantes IS 'Las cedulas de los estudiantes son únicas';


--
-- TOC entry 5099 (class 2606 OID 65786)
-- Name: estudiantes unq_estudiantes_usuario; Type: CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes
    ADD CONSTRAINT unq_estudiantes_usuario UNIQUE (id_usu);


--
-- TOC entry 5771 (class 0 OID 0)
-- Dependencies: 5099
-- Name: CONSTRAINT unq_estudiantes_usuario ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT unq_estudiantes_usuario ON personas.estudiantes IS 'llave única del usuario del estudiante';


--
-- TOC entry 5132 (class 1259 OID 66032)
-- Name: idx_malla_materia; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_malla_materia ON academico.malla_curricular USING btree (id_mat);


--
-- TOC entry 5133 (class 1259 OID 66031)
-- Name: idx_malla_programa; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_malla_programa ON academico.malla_curricular USING btree (id_pro);


--
-- TOC entry 5134 (class 1259 OID 66033)
-- Name: idx_malla_trayecto_periodo; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_malla_trayecto_periodo ON academico.malla_curricular USING btree (trayecto, periodo);


--
-- TOC entry 5126 (class 1259 OID 66029)
-- Name: idx_materias_codigo; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_materias_codigo ON academico.materias USING btree (codigo);


--
-- TOC entry 5127 (class 1259 OID 66030)
-- Name: idx_materias_eje; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_materias_eje ON academico.materias USING btree (id_eje);


--
-- TOC entry 5167 (class 1259 OID 131406)
-- Name: idx_notas_compuesto; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_notas_compuesto ON academico.notas USING btree (id_est, id_malla, id_per, tipo_evaluacion);


--
-- TOC entry 5772 (class 0 OID 0)
-- Dependencies: 5167
-- Name: INDEX idx_notas_compuesto; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON INDEX academico.idx_notas_compuesto IS 'Índice compuesto para acelerar validación de unicidad en notas. Agregado en v4.1.';


--
-- TOC entry 5168 (class 1259 OID 114984)
-- Name: idx_notas_estudiante; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_notas_estudiante ON academico.notas USING btree (id_est);


--
-- TOC entry 5773 (class 0 OID 0)
-- Dependencies: 5168
-- Name: INDEX idx_notas_estudiante; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON INDEX academico.idx_notas_estudiante IS 'Índice para buscar notas por estudiante.';


--
-- TOC entry 5169 (class 1259 OID 114985)
-- Name: idx_notas_malla; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_notas_malla ON academico.notas USING btree (id_malla);


--
-- TOC entry 5774 (class 0 OID 0)
-- Dependencies: 5169
-- Name: INDEX idx_notas_malla; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON INDEX academico.idx_notas_malla IS 'Índice para buscar notas por materia.';


--
-- TOC entry 5170 (class 1259 OID 114987)
-- Name: idx_notas_nota; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_notas_nota ON academico.notas USING btree (nota);


--
-- TOC entry 5775 (class 0 OID 0)
-- Dependencies: 5170
-- Name: INDEX idx_notas_nota; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON INDEX academico.idx_notas_nota IS 'Índice para análisis estadístico de notas.';


--
-- TOC entry 5171 (class 1259 OID 114986)
-- Name: idx_notas_periodo; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_notas_periodo ON academico.notas USING btree (id_per);


--
-- TOC entry 5776 (class 0 OID 0)
-- Dependencies: 5171
-- Name: INDEX idx_notas_periodo; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON INDEX academico.idx_notas_periodo IS 'Índice para buscar notas por período.';


--
-- TOC entry 5137 (class 1259 OID 66034)
-- Name: idx_periodos_activo; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_periodos_activo ON academico.periodos_academicos USING btree (activo) WHERE (activo = true);


--
-- TOC entry 5117 (class 1259 OID 66028)
-- Name: idx_programas_codigo; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_programas_codigo ON academico.programas USING btree (codigo);


--
-- TOC entry 5141 (class 1259 OID 66035)
-- Name: idx_secciones_programa; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE INDEX idx_secciones_programa ON academico.secciones USING btree (id_pro);


--
-- TOC entry 5138 (class 1259 OID 180561)
-- Name: idx_unq_periodo_vigente_por_tipo; Type: INDEX; Schema: academico; Owner: postgres
--

CREATE UNIQUE INDEX idx_unq_periodo_vigente_por_tipo ON academico.periodos_academicos USING btree (tipo) WHERE (activo = true);


--
-- TOC entry 5075 (class 1259 OID 65884)
-- Name: idx_aud_mov_fecha; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_aud_mov_fecha ON general.aud_mov USING btree (fec_hor);


--
-- TOC entry 5777 (class 0 OID 0)
-- Dependencies: 5075
-- Name: INDEX idx_aud_mov_fecha; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_aud_mov_fecha IS 'Índice para consultar por rango de fechas';


--
-- TOC entry 5076 (class 1259 OID 65883)
-- Name: idx_aud_mov_tabla; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_aud_mov_tabla ON general.aud_mov USING btree (tabla_mod);


--
-- TOC entry 5778 (class 0 OID 0)
-- Dependencies: 5076
-- Name: INDEX idx_aud_mov_tabla; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_aud_mov_tabla IS 'Índice para filtrar por tabla modificada';


--
-- TOC entry 5077 (class 1259 OID 65882)
-- Name: idx_aud_mov_usu; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_aud_mov_usu ON general.aud_mov USING btree (id_usu);


--
-- TOC entry 5779 (class 0 OID 0)
-- Dependencies: 5077
-- Name: INDEX idx_aud_mov_usu; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_aud_mov_usu IS 'Índice para buscar auditoría por usuario';


--
-- TOC entry 5078 (class 1259 OID 131414)
-- Name: idx_auditoria_compuesto; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_auditoria_compuesto ON general.aud_mov USING btree (tabla_mod, fec_hor);


--
-- TOC entry 5780 (class 0 OID 0)
-- Dependencies: 5078
-- Name: INDEX idx_auditoria_compuesto; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_auditoria_compuesto IS 'Índice compuesto para acelerar consultas de auditoría por tabla y fecha. Agregado en v4.1.';


--
-- TOC entry 5154 (class 1259 OID 131404)
-- Name: idx_permisos_rol_compuesto; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_permisos_rol_compuesto ON general.permisos_rol USING btree (id_rol, id_mod, id_perm);


--
-- TOC entry 5781 (class 0 OID 0)
-- Dependencies: 5154
-- Name: INDEX idx_permisos_rol_compuesto; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_permisos_rol_compuesto IS 'Índice compuesto para acelerar validación de unicidad en permisos por rol. Agregado en v4.1.';


--
-- TOC entry 5155 (class 1259 OID 114906)
-- Name: idx_permisos_rol_mod; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_permisos_rol_mod ON general.permisos_rol USING btree (id_mod);


--
-- TOC entry 5782 (class 0 OID 0)
-- Dependencies: 5155
-- Name: INDEX idx_permisos_rol_mod; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_permisos_rol_mod IS 'Índice para buscar permisos por módulo.';


--
-- TOC entry 5156 (class 1259 OID 114905)
-- Name: idx_permisos_rol_rol; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_permisos_rol_rol ON general.permisos_rol USING btree (id_rol);


--
-- TOC entry 5783 (class 0 OID 0)
-- Dependencies: 5156
-- Name: INDEX idx_permisos_rol_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_permisos_rol_rol IS 'Índice para buscar permisos por rol rápidamente.';


--
-- TOC entry 5161 (class 1259 OID 131405)
-- Name: idx_permisos_usuario_compuesto; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_permisos_usuario_compuesto ON general.permisos_usuario USING btree (id_usu, id_mod, id_perm);


--
-- TOC entry 5784 (class 0 OID 0)
-- Dependencies: 5161
-- Name: INDEX idx_permisos_usuario_compuesto; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_permisos_usuario_compuesto IS 'Índice compuesto para acelerar validación de unicidad en permisos por usuario. Agregado en v4.1.';


--
-- TOC entry 5162 (class 1259 OID 114939)
-- Name: idx_permisos_usuario_usu; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_permisos_usuario_usu ON general.permisos_usuario USING btree (id_usu);


--
-- TOC entry 5785 (class 0 OID 0)
-- Dependencies: 5162
-- Name: INDEX idx_permisos_usuario_usu; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_permisos_usuario_usu IS 'Índice para buscar permisos personalizados por usuario.';


--
-- TOC entry 5064 (class 1259 OID 114797)
-- Name: idx_usuarios_email; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_usuarios_email ON general.usuarios USING btree (email);


--
-- TOC entry 5786 (class 0 OID 0)
-- Dependencies: 5064
-- Name: INDEX idx_usuarios_email; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_usuarios_email IS 'Índice para acelerar búsquedas y validaciones de correo electrónico. Agregado en v3.5.';


--
-- TOC entry 5065 (class 1259 OID 131413)
-- Name: idx_usuarios_rol; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_usuarios_rol ON general.usuarios USING btree (id_rol);


--
-- TOC entry 5787 (class 0 OID 0)
-- Dependencies: 5065
-- Name: INDEX idx_usuarios_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_usuarios_rol IS 'Índice para acelerar consultas de usuarios por rol. Agregado en v4.1.';


--
-- TOC entry 5066 (class 1259 OID 131412)
-- Name: idx_usuarios_username; Type: INDEX; Schema: general; Owner: postgres
--

CREATE INDEX idx_usuarios_username ON general.usuarios USING btree (username);


--
-- TOC entry 5788 (class 0 OID 0)
-- Dependencies: 5066
-- Name: INDEX idx_usuarios_username; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON INDEX general.idx_usuarios_username IS 'Índice para acelerar búsquedas de usuarios por nombre (login). Agregado en v4.1.';


--
-- TOC entry 5107 (class 1259 OID 65879)
-- Name: idx_asig_dia; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE INDEX idx_asig_dia ON horarios.asig_carga_horarias USING btree (id_dia);


--
-- TOC entry 5108 (class 1259 OID 65877)
-- Name: idx_asig_docente; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE INDEX idx_asig_docente ON horarios.asig_carga_horarias USING btree (id_doc);


--
-- TOC entry 5109 (class 1259 OID 65878)
-- Name: idx_asig_espacio; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE INDEX idx_asig_espacio ON horarios.asig_carga_horarias USING btree (id_esp);


--
-- TOC entry 5110 (class 1259 OID 131407)
-- Name: idx_asig_malla; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE INDEX idx_asig_malla ON horarios.asig_carga_horarias USING btree (id_malla);


--
-- TOC entry 5789 (class 0 OID 0)
-- Dependencies: 5110
-- Name: INDEX idx_asig_malla; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON INDEX horarios.idx_asig_malla IS 'Índice para acelerar JOINs entre asignaciones y malla curricular. Agregado en v4.1.';


--
-- TOC entry 5111 (class 1259 OID 131408)
-- Name: idx_asig_periodo; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE INDEX idx_asig_periodo ON horarios.asig_carga_horarias USING btree (id_per);


--
-- TOC entry 5790 (class 0 OID 0)
-- Dependencies: 5111
-- Name: INDEX idx_asig_periodo; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON INDEX horarios.idx_asig_periodo IS 'Índice para acelerar JOINs entre asignaciones y períodos académicos. Agregado en v4.1.';


--
-- TOC entry 5112 (class 1259 OID 139598)
-- Name: idx_asig_seccion; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE INDEX idx_asig_seccion ON horarios.asig_carga_horarias USING btree (id_sec);


--
-- TOC entry 5113 (class 1259 OID 65880)
-- Name: idx_unq_doc_dia_hora; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE UNIQUE INDEX idx_unq_doc_dia_hora ON horarios.asig_carga_horarias USING btree (id_doc, id_dia, hora_inicio) WHERE ((estatus = 'A'::bpchar) AND (id_doc IS NOT NULL));


--
-- TOC entry 5114 (class 1259 OID 65881)
-- Name: idx_unq_esp_dia_hora; Type: INDEX; Schema: horarios; Owner: postgres
--

CREATE UNIQUE INDEX idx_unq_esp_dia_hora ON horarios.asig_carga_horarias USING btree (id_esp, id_dia, hora_inicio) WHERE ((estatus = 'A'::bpchar) AND (id_esp IS NOT NULL));


--
-- TOC entry 5103 (class 1259 OID 65836)
-- Name: idx_espacios_centro; Type: INDEX; Schema: infraestructura; Owner: postgres
--

CREATE INDEX idx_espacios_centro ON infraestructura.espacios_fis USING btree (nombre_centro);


--
-- TOC entry 5104 (class 1259 OID 65835)
-- Name: idx_espacios_municipio; Type: INDEX; Schema: infraestructura; Owner: postgres
--

CREATE INDEX idx_espacios_municipio ON infraestructura.espacios_fis USING btree (id_mun);


--
-- TOC entry 5100 (class 1259 OID 65807)
-- Name: idx_disp_docente_dia; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_disp_docente_dia ON personas.disponibilidad_docente USING btree (id_doc, id_dia);


--
-- TOC entry 5081 (class 1259 OID 65803)
-- Name: idx_docentes_cedulas; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_docentes_cedulas ON personas.docentes USING btree (cedula);


--
-- TOC entry 5082 (class 1259 OID 65805)
-- Name: idx_docentes_contrato; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_docentes_contrato ON personas.docentes USING btree (tipo_contrato);


--
-- TOC entry 5083 (class 1259 OID 65804)
-- Name: idx_docentes_municipio; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_docentes_municipio ON personas.docentes USING btree (id_mun);


--
-- TOC entry 5084 (class 1259 OID 131411)
-- Name: idx_docentes_usuario; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_docentes_usuario ON personas.docentes USING btree (id_usu);


--
-- TOC entry 5791 (class 0 OID 0)
-- Dependencies: 5084
-- Name: INDEX idx_docentes_usuario; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON INDEX personas.idx_docentes_usuario IS 'Índice para acelerar JOINs entre docentes y usuarios. Agregado en v4.1.';


--
-- TOC entry 5091 (class 1259 OID 65806)
-- Name: idx_estudiantes_cedula; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_estudiantes_cedula ON personas.estudiantes USING btree (cedula);


--
-- TOC entry 5092 (class 1259 OID 131409)
-- Name: idx_estudiantes_programa; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_estudiantes_programa ON personas.estudiantes USING btree (id_pro);


--
-- TOC entry 5792 (class 0 OID 0)
-- Dependencies: 5092
-- Name: INDEX idx_estudiantes_programa; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON INDEX personas.idx_estudiantes_programa IS 'Índice para acelerar consultas de estudiantes por programa. Agregado en v4.1.';


--
-- TOC entry 5093 (class 1259 OID 131410)
-- Name: idx_estudiantes_seccion; Type: INDEX; Schema: personas; Owner: postgres
--

CREATE INDEX idx_estudiantes_seccion ON personas.estudiantes USING btree (id_sec);


--
-- TOC entry 5793 (class 0 OID 0)
-- Dependencies: 5093
-- Name: INDEX idx_estudiantes_seccion; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON INDEX personas.idx_estudiantes_seccion IS 'Índice para acelerar consultas de estudiantes por sección. Agregado en v4.1.';


--
-- TOC entry 5225 (class 2620 OID 131401)
-- Name: ejes_formativos trg_aud_ejes_formativos; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_aud_ejes_formativos AFTER INSERT OR DELETE OR UPDATE ON academico.ejes_formativos FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5794 (class 0 OID 0)
-- Dependencies: 5225
-- Name: TRIGGER trg_aud_ejes_formativos ON ejes_formativos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_ejes_formativos ON academico.ejes_formativos IS 'Trigger de auditoría para ejes formativos. Agregado en v4.1.';


--
-- TOC entry 5228 (class 2620 OID 131396)
-- Name: malla_curricular trg_aud_malla_curricular; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_aud_malla_curricular AFTER INSERT OR DELETE OR UPDATE ON academico.malla_curricular FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5795 (class 0 OID 0)
-- Dependencies: 5228
-- Name: TRIGGER trg_aud_malla_curricular ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_malla_curricular ON academico.malla_curricular IS 'Trigger de auditoría para malla curricular. Registra cambios en el pensum académico. Agregado en v4.1.';


--
-- TOC entry 5226 (class 2620 OID 131397)
-- Name: materias trg_aud_materias; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_aud_materias AFTER INSERT OR DELETE OR UPDATE ON academico.materias FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5796 (class 0 OID 0)
-- Dependencies: 5226
-- Name: TRIGGER trg_aud_materias ON materias; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_materias ON academico.materias IS 'Trigger de auditoría para materias. Registra modificaciones en unidades curriculares. Agregado en v4.1.';


--
-- TOC entry 5238 (class 2620 OID 114989)
-- Name: notas trg_aud_notas; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_aud_notas AFTER INSERT OR DELETE OR UPDATE ON academico.notas FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5797 (class 0 OID 0)
-- Dependencies: 5238
-- Name: TRIGGER trg_aud_notas ON notas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_notas ON academico.notas IS 'Trigger de auditoría para notas. Registra INSERT, UPDATE y DELETE en la bitácora forense.';


--
-- TOC entry 5230 (class 2620 OID 131399)
-- Name: periodos_academicos trg_aud_periodos_academicos; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_aud_periodos_academicos AFTER INSERT OR DELETE OR UPDATE ON academico.periodos_academicos FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5798 (class 0 OID 0)
-- Dependencies: 5230
-- Name: TRIGGER trg_aud_periodos_academicos ON periodos_academicos; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_periodos_academicos ON academico.periodos_academicos IS 'Trigger de auditoría para períodos académicos. Agregado en v4.1.';


--
-- TOC entry 5223 (class 2620 OID 131398)
-- Name: programas trg_aud_programas; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_aud_programas AFTER INSERT OR DELETE OR UPDATE ON academico.programas FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5799 (class 0 OID 0)
-- Dependencies: 5223
-- Name: TRIGGER trg_aud_programas ON programas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_programas ON academico.programas IS 'Trigger de auditoría para programas académicos. Agregado en v4.1.';


--
-- TOC entry 5232 (class 2620 OID 131400)
-- Name: secciones trg_aud_secciones; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_aud_secciones AFTER INSERT OR DELETE OR UPDATE ON academico.secciones FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5800 (class 0 OID 0)
-- Dependencies: 5232
-- Name: TRIGGER trg_aud_secciones ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_secciones ON academico.secciones IS 'Trigger de auditoría para secciones de clases. Agregado en v4.1.';


--
-- TOC entry 5229 (class 2620 OID 66046)
-- Name: malla_curricular trg_malla_curricular; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_malla_curricular BEFORE UPDATE ON academico.malla_curricular FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5227 (class 2620 OID 66045)
-- Name: materias trg_materias_actualizar; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_materias_actualizar BEFORE UPDATE ON academico.materias FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5239 (class 2620 OID 114988)
-- Name: notas trg_notas_actualizar; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_notas_actualizar BEFORE UPDATE ON academico.notas FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5801 (class 0 OID 0)
-- Dependencies: 5239
-- Name: TRIGGER trg_notas_actualizar ON notas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON TRIGGER trg_notas_actualizar ON academico.notas IS 'Trigger para actualizar automáticamente el campo actualizar con CURRENT_TIMESTAMP en notas.';


--
-- TOC entry 5231 (class 2620 OID 66047)
-- Name: periodos_academicos trg_periodos_actualizar; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_periodos_actualizar BEFORE UPDATE ON academico.periodos_academicos FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5224 (class 2620 OID 66044)
-- Name: programas trg_programas_actualizar; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_programas_actualizar BEFORE UPDATE ON academico.programas FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5233 (class 2620 OID 66048)
-- Name: secciones trg_secciones_actualizar; Type: TRIGGER; Schema: academico; Owner: postgres
--

CREATE TRIGGER trg_secciones_actualizar BEFORE UPDATE ON academico.secciones FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5212 (class 2620 OID 115002)
-- Name: credenciales trg_aud_credenciales; Type: TRIGGER; Schema: general; Owner: postgres
--

CREATE TRIGGER trg_aud_credenciales AFTER INSERT OR DELETE OR UPDATE ON general.credenciales FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5802 (class 0 OID 0)
-- Dependencies: 5212
-- Name: TRIGGER trg_aud_credenciales ON credenciales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_credenciales ON general.credenciales IS 'Trigger de auditoría para credenciales. Registra cambios de contraseña, bloqueos e intentos fallidos. Agregado en v3.9.';


--
-- TOC entry 5210 (class 2620 OID 131402)
-- Name: dias_laborales trg_aud_dias_laborales; Type: TRIGGER; Schema: general; Owner: postgres
--

CREATE TRIGGER trg_aud_dias_laborales AFTER INSERT OR DELETE OR UPDATE ON general.dias_laborales FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5803 (class 0 OID 0)
-- Dependencies: 5210
-- Name: TRIGGER trg_aud_dias_laborales ON dias_laborales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_dias_laborales ON general.dias_laborales IS 'Trigger de auditoría para catálogo de días laborales. Agregado en v4.1.';


--
-- TOC entry 5234 (class 2620 OID 115006)
-- Name: modulos trg_aud_modulos; Type: TRIGGER; Schema: general; Owner: postgres
--

CREATE TRIGGER trg_aud_modulos AFTER INSERT OR DELETE OR UPDATE ON general.modulos FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5804 (class 0 OID 0)
-- Dependencies: 5234
-- Name: TRIGGER trg_aud_modulos ON modulos; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_modulos ON general.modulos IS 'Trigger de auditoría para catálogo de módulos. Agregado en v3.9.';


--
-- TOC entry 5209 (class 2620 OID 131403)
-- Name: municipios trg_aud_municipios; Type: TRIGGER; Schema: general; Owner: postgres
--

CREATE TRIGGER trg_aud_municipios AFTER INSERT OR DELETE OR UPDATE ON general.municipios FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5805 (class 0 OID 0)
-- Dependencies: 5209
-- Name: TRIGGER trg_aud_municipios ON municipios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_municipios ON general.municipios IS 'Trigger de auditoría para catálogo de municipios. Agregado en v4.1.';


--
-- TOC entry 5235 (class 2620 OID 115007)
-- Name: permisos trg_aud_permisos; Type: TRIGGER; Schema: general; Owner: postgres
--

CREATE TRIGGER trg_aud_permisos AFTER INSERT OR DELETE OR UPDATE ON general.permisos FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5806 (class 0 OID 0)
-- Dependencies: 5235
-- Name: TRIGGER trg_aud_permisos ON permisos; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_permisos ON general.permisos IS 'Trigger de auditoría para catálogo de permisos/acciones. Agregado en v3.9.';


--
-- TOC entry 5236 (class 2620 OID 115004)
-- Name: permisos_rol trg_aud_permisos_rol; Type: TRIGGER; Schema: general; Owner: postgres
--

CREATE TRIGGER trg_aud_permisos_rol AFTER INSERT OR DELETE OR UPDATE ON general.permisos_rol FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5807 (class 0 OID 0)
-- Dependencies: 5236
-- Name: TRIGGER trg_aud_permisos_rol ON permisos_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_permisos_rol ON general.permisos_rol IS 'Trigger de auditoría para permisos base por rol. Registra cambios en la matriz de permisos del sistema. Agregado en v3.9.';


--
-- TOC entry 5237 (class 2620 OID 115005)
-- Name: permisos_usuario trg_aud_permisos_usuario; Type: TRIGGER; Schema: general; Owner: postgres
--

CREATE TRIGGER trg_aud_permisos_usuario AFTER INSERT OR DELETE OR UPDATE ON general.permisos_usuario FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5808 (class 0 OID 0)
-- Dependencies: 5237
-- Name: TRIGGER trg_aud_permisos_usuario ON permisos_usuario; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_permisos_usuario ON general.permisos_usuario IS 'Trigger de auditoría para overrides de permisos por usuario. Registra personalizaciones de permisos. Agregado en v3.9.';


--
-- TOC entry 5208 (class 2620 OID 115003)
-- Name: roles trg_aud_roles; Type: TRIGGER; Schema: general; Owner: postgres
--

CREATE TRIGGER trg_aud_roles AFTER INSERT OR DELETE OR UPDATE ON general.roles FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5809 (class 0 OID 0)
-- Dependencies: 5208
-- Name: TRIGGER trg_aud_roles ON roles; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_roles ON general.roles IS 'Trigger de auditoría para roles. Registra creación, modificación y eliminación de roles. Agregado en v3.9.';


--
-- TOC entry 5211 (class 2620 OID 115001)
-- Name: usuarios trg_aud_usuarios; Type: TRIGGER; Schema: general; Owner: postgres
--

CREATE TRIGGER trg_aud_usuarios AFTER INSERT OR DELETE OR UPDATE ON general.usuarios FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5810 (class 0 OID 0)
-- Dependencies: 5211
-- Name: TRIGGER trg_aud_usuarios ON usuarios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_usuarios ON general.usuarios IS 'Trigger de auditoría para usuarios. Registra creación, modificación y eliminación de usuarios del sistema. Agregado en v3.9.';


--
-- TOC entry 5220 (class 2620 OID 66041)
-- Name: asig_carga_horarias trg_asig_actualizar; Type: TRIGGER; Schema: horarios; Owner: postgres
--

CREATE TRIGGER trg_asig_actualizar BEFORE UPDATE ON horarios.asig_carga_horarias FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5221 (class 2620 OID 66037)
-- Name: asig_carga_horarias trg_aud_asig; Type: TRIGGER; Schema: horarios; Owner: postgres
--

CREATE TRIGGER trg_aud_asig AFTER INSERT OR DELETE OR UPDATE ON horarios.asig_carga_horarias FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5222 (class 2620 OID 66157)
-- Name: asig_carga_horarias trg_calcular_horas_docente; Type: TRIGGER; Schema: horarios; Owner: postgres
--

CREATE TRIGGER trg_calcular_horas_docente AFTER INSERT OR DELETE OR UPDATE OF id_doc, hora_inicio, hora_fin, estatus ON horarios.asig_carga_horarias FOR EACH ROW EXECUTE FUNCTION horarios.fn_calcular_horas_docente();


--
-- TOC entry 5218 (class 2620 OID 66038)
-- Name: espacios_fis trg_aud_espacios; Type: TRIGGER; Schema: infraestructura; Owner: postgres
--

CREATE TRIGGER trg_aud_espacios AFTER INSERT OR DELETE OR UPDATE ON infraestructura.espacios_fis FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5219 (class 2620 OID 66042)
-- Name: espacios_fis trg_espacios_actualizar; Type: TRIGGER; Schema: infraestructura; Owner: postgres
--

CREATE TRIGGER trg_espacios_actualizar BEFORE UPDATE ON infraestructura.espacios_fis FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5217 (class 2620 OID 66039)
-- Name: disponibilidad_docente trg_aud_disponibilidad; Type: TRIGGER; Schema: personas; Owner: postgres
--

CREATE TRIGGER trg_aud_disponibilidad AFTER INSERT OR DELETE OR UPDATE ON personas.disponibilidad_docente FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5213 (class 2620 OID 65887)
-- Name: docentes trg_aud_docentes; Type: TRIGGER; Schema: personas; Owner: postgres
--

CREATE TRIGGER trg_aud_docentes AFTER INSERT OR DELETE OR UPDATE ON personas.docentes FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5811 (class 0 OID 0)
-- Dependencies: 5213
-- Name: TRIGGER trg_aud_docentes ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON TRIGGER trg_aud_docentes ON personas.docentes IS 'Trigger de auditoría para docentes';


--
-- TOC entry 5215 (class 2620 OID 66036)
-- Name: estudiantes trg_aud_estudiantes; Type: TRIGGER; Schema: personas; Owner: postgres
--

CREATE TRIGGER trg_aud_estudiantes AFTER INSERT OR DELETE OR UPDATE ON personas.estudiantes FOR EACH ROW EXECUTE FUNCTION general.fn_auditoria_general();


--
-- TOC entry 5214 (class 2620 OID 65888)
-- Name: docentes trg_docentes_actualizar; Type: TRIGGER; Schema: personas; Owner: postgres
--

CREATE TRIGGER trg_docentes_actualizar BEFORE UPDATE ON personas.docentes FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5216 (class 2620 OID 66040)
-- Name: estudiantes trg_estudiantes_actualizar; Type: TRIGGER; Schema: personas; Owner: postgres
--

CREATE TRIGGER trg_estudiantes_actualizar BEFORE UPDATE ON personas.estudiantes FOR EACH ROW EXECUTE FUNCTION general.f_actualizar_timestamp();


--
-- TOC entry 5195 (class 2606 OID 66139)
-- Name: malla_curricular fk_malla_materia; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.malla_curricular
    ADD CONSTRAINT fk_malla_materia FOREIGN KEY (id_mat) REFERENCES academico.materias(id_mat) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5812 (class 0 OID 0)
-- Dependencies: 5195
-- Name: CONSTRAINT fk_malla_materia ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_malla_materia ON academico.malla_curricular IS 'Llave foránea que relaciona este registro de la malla con la tabla de materias.';


--
-- TOC entry 5196 (class 2606 OID 66144)
-- Name: malla_curricular fk_malla_prerequisito; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.malla_curricular
    ADD CONSTRAINT fk_malla_prerequisito FOREIGN KEY (perequisito_id_mat) REFERENCES academico.materias(id_mat) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5813 (class 0 OID 0)
-- Dependencies: 5196
-- Name: CONSTRAINT fk_malla_prerequisito ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_malla_prerequisito ON academico.malla_curricular IS 'Llave foránea recursiva que relaciona la materia actual con otra materia que es su prerrequisito.';


--
-- TOC entry 5197 (class 2606 OID 66134)
-- Name: malla_curricular fk_malla_programa; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.malla_curricular
    ADD CONSTRAINT fk_malla_programa FOREIGN KEY (id_pro) REFERENCES academico.programas(id_pro) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5814 (class 0 OID 0)
-- Dependencies: 5197
-- Name: CONSTRAINT fk_malla_programa ON malla_curricular; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_malla_programa ON academico.malla_curricular IS 'Llave foránea que relaciona este registro de la malla con la tabla de programas académicos.';


--
-- TOC entry 5194 (class 2606 OID 66129)
-- Name: materias fk_materias_eje; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.materias
    ADD CONSTRAINT fk_materias_eje FOREIGN KEY (id_eje) REFERENCES academico.ejes_formativos(id_eje) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5815 (class 0 OID 0)
-- Dependencies: 5194
-- Name: CONSTRAINT fk_materias_eje ON materias; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_materias_eje ON academico.materias IS 'Llave foránea que vincula la materia con su respectivo eje formativo.';


--
-- TOC entry 5205 (class 2606 OID 114969)
-- Name: notas fk_nota_estudiante; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.notas
    ADD CONSTRAINT fk_nota_estudiante FOREIGN KEY (id_est) REFERENCES personas.estudiantes(id_est) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5816 (class 0 OID 0)
-- Dependencies: 5205
-- Name: CONSTRAINT fk_nota_estudiante ON notas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_nota_estudiante ON academico.notas IS 'Relación con la tabla de estudiantes. RESTRICT para preservar histórico.';


--
-- TOC entry 5206 (class 2606 OID 114974)
-- Name: notas fk_nota_malla; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.notas
    ADD CONSTRAINT fk_nota_malla FOREIGN KEY (id_malla) REFERENCES academico.malla_curricular(id_malla) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5817 (class 0 OID 0)
-- Dependencies: 5206
-- Name: CONSTRAINT fk_nota_malla ON notas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_nota_malla ON academico.notas IS 'Relación con la malla curricular. RESTRICT para preservar histórico.';


--
-- TOC entry 5207 (class 2606 OID 114979)
-- Name: notas fk_nota_periodo; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.notas
    ADD CONSTRAINT fk_nota_periodo FOREIGN KEY (id_per) REFERENCES academico.periodos_academicos(id_per) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5818 (class 0 OID 0)
-- Dependencies: 5207
-- Name: CONSTRAINT fk_nota_periodo ON notas; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_nota_periodo ON academico.notas IS 'Relación con períodos académicos. RESTRICT para preservar histórico.';


--
-- TOC entry 5198 (class 2606 OID 66149)
-- Name: secciones fk_secciones_programa; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.secciones
    ADD CONSTRAINT fk_secciones_programa FOREIGN KEY (id_pro) REFERENCES academico.programas(id_pro) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5819 (class 0 OID 0)
-- Dependencies: 5198
-- Name: CONSTRAINT fk_secciones_programa ON secciones; Type: COMMENT; Schema: academico; Owner: postgres
--

COMMENT ON CONSTRAINT fk_secciones_programa ON academico.secciones IS 'Llave foránea que relaciona la sección con un programa académico válido.';


--
-- TOC entry 5178 (class 2606 OID 66059)
-- Name: aud_mov fk_aud_mov_usuario; Type: FK CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.aud_mov
    ADD CONSTRAINT fk_aud_mov_usuario FOREIGN KEY (id_usu) REFERENCES general.usuarios(id_usu);


--
-- TOC entry 5820 (class 0 OID 0)
-- Dependencies: 5178
-- Name: CONSTRAINT fk_aud_mov_usuario ON aud_mov; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT fk_aud_mov_usuario ON general.aud_mov IS 'Llave foranea que viene de la tabla usuarios y trae el identificador de usuarios';


--
-- TOC entry 5177 (class 2606 OID 66054)
-- Name: credenciales fk_credendiales_usuario; Type: FK CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.credenciales
    ADD CONSTRAINT fk_credendiales_usuario FOREIGN KEY (id_usu) REFERENCES general.usuarios(id_usu) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5821 (class 0 OID 0)
-- Dependencies: 5177
-- Name: CONSTRAINT fk_credendiales_usuario ON credenciales; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT fk_credendiales_usuario ON general.credenciales IS 'Llave foranea del identificador del usuario';


--
-- TOC entry 5199 (class 2606 OID 114895)
-- Name: permisos_rol fk_pr_mod; Type: FK CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos_rol
    ADD CONSTRAINT fk_pr_mod FOREIGN KEY (id_mod) REFERENCES general.modulos(id_mod) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5822 (class 0 OID 0)
-- Dependencies: 5199
-- Name: CONSTRAINT fk_pr_mod ON permisos_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT fk_pr_mod ON general.permisos_rol IS 'Relación con la tabla de módulos.';


--
-- TOC entry 5200 (class 2606 OID 114900)
-- Name: permisos_rol fk_pr_perm; Type: FK CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos_rol
    ADD CONSTRAINT fk_pr_perm FOREIGN KEY (id_perm) REFERENCES general.permisos(id_perm) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5823 (class 0 OID 0)
-- Dependencies: 5200
-- Name: CONSTRAINT fk_pr_perm ON permisos_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT fk_pr_perm ON general.permisos_rol IS 'Relación con la tabla de permisos.';


--
-- TOC entry 5201 (class 2606 OID 114890)
-- Name: permisos_rol fk_pr_rol; Type: FK CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos_rol
    ADD CONSTRAINT fk_pr_rol FOREIGN KEY (id_rol) REFERENCES general.roles(id_rol) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5824 (class 0 OID 0)
-- Dependencies: 5201
-- Name: CONSTRAINT fk_pr_rol ON permisos_rol; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT fk_pr_rol ON general.permisos_rol IS 'Relación con la tabla de roles.';


--
-- TOC entry 5202 (class 2606 OID 114929)
-- Name: permisos_usuario fk_pu_mod; Type: FK CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos_usuario
    ADD CONSTRAINT fk_pu_mod FOREIGN KEY (id_mod) REFERENCES general.modulos(id_mod) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5825 (class 0 OID 0)
-- Dependencies: 5202
-- Name: CONSTRAINT fk_pu_mod ON permisos_usuario; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT fk_pu_mod ON general.permisos_usuario IS 'Relación con la tabla de módulos.';


--
-- TOC entry 5203 (class 2606 OID 114934)
-- Name: permisos_usuario fk_pu_perm; Type: FK CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos_usuario
    ADD CONSTRAINT fk_pu_perm FOREIGN KEY (id_perm) REFERENCES general.permisos(id_perm) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5826 (class 0 OID 0)
-- Dependencies: 5203
-- Name: CONSTRAINT fk_pu_perm ON permisos_usuario; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT fk_pu_perm ON general.permisos_usuario IS 'Relación con la tabla de permisos.';


--
-- TOC entry 5204 (class 2606 OID 114924)
-- Name: permisos_usuario fk_pu_usuario; Type: FK CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.permisos_usuario
    ADD CONSTRAINT fk_pu_usuario FOREIGN KEY (id_usu) REFERENCES general.usuarios(id_usu) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5827 (class 0 OID 0)
-- Dependencies: 5204
-- Name: CONSTRAINT fk_pu_usuario ON permisos_usuario; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT fk_pu_usuario ON general.permisos_usuario IS 'Relación con la tabla de usuarios.';


--
-- TOC entry 5176 (class 2606 OID 66049)
-- Name: usuarios fk_rol_id; Type: FK CONSTRAINT; Schema: general; Owner: postgres
--

ALTER TABLE ONLY general.usuarios
    ADD CONSTRAINT fk_rol_id FOREIGN KEY (id_rol) REFERENCES general.roles(id_rol) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5828 (class 0 OID 0)
-- Dependencies: 5176
-- Name: CONSTRAINT fk_rol_id ON usuarios; Type: COMMENT; Schema: general; Owner: postgres
--

COMMENT ON CONSTRAINT fk_rol_id ON general.usuarios IS 'Llave foranea del identificador de los roles';


--
-- TOC entry 5188 (class 2606 OID 66109)
-- Name: asig_carga_horarias fk_asig_dia; Type: FK CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT fk_asig_dia FOREIGN KEY (id_dia) REFERENCES general.dias_laborales(id_dia) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5829 (class 0 OID 0)
-- Dependencies: 5188
-- Name: CONSTRAINT fk_asig_dia ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT fk_asig_dia ON horarios.asig_carga_horarias IS 'Clave foránea que relaciona la asignación con el día específico de la semana en el que se imparte.';


--
-- TOC entry 5189 (class 2606 OID 66099)
-- Name: asig_carga_horarias fk_asig_docente; Type: FK CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT fk_asig_docente FOREIGN KEY (id_doc) REFERENCES personas.docentes(id_doc) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5830 (class 0 OID 0)
-- Dependencies: 5189
-- Name: CONSTRAINT fk_asig_docente ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT fk_asig_docente ON horarios.asig_carga_horarias IS 'Clave foránea que vincula la asignación de carga horaria con el docente responsable (referencia a la tabla personas.docentes).';


--
-- TOC entry 5190 (class 2606 OID 66104)
-- Name: asig_carga_horarias fk_asig_espacio; Type: FK CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT fk_asig_espacio FOREIGN KEY (id_esp) REFERENCES infraestructura.espacios_fis(id_esp) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5831 (class 0 OID 0)
-- Dependencies: 5190
-- Name: CONSTRAINT fk_asig_espacio ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT fk_asig_espacio ON horarios.asig_carga_horarias IS 'Clave foránea que asocia la asignación con el aula, laboratorio o espacio físico donde se desarrollará la actividad (referencia a la tabla infraestructura.espacios_fis).';


--
-- TOC entry 5191 (class 2606 OID 66119)
-- Name: asig_carga_horarias fk_asig_malla; Type: FK CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT fk_asig_malla FOREIGN KEY (id_malla) REFERENCES academico.malla_curricular(id_malla) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5832 (class 0 OID 0)
-- Dependencies: 5191
-- Name: CONSTRAINT fk_asig_malla ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT fk_asig_malla ON horarios.asig_carga_horarias IS 'Clave foránea que asocia la carga horaria con una asignatura o elemento específico de la malla curricular del estudiante o carrera.';


--
-- TOC entry 5192 (class 2606 OID 114832)
-- Name: asig_carga_horarias fk_asig_periodo; Type: FK CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT fk_asig_periodo FOREIGN KEY (id_per) REFERENCES academico.periodos_academicos(id_per) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5193 (class 2606 OID 139593)
-- Name: asig_carga_horarias fk_asig_seccion; Type: FK CONSTRAINT; Schema: horarios; Owner: postgres
--

ALTER TABLE ONLY horarios.asig_carga_horarias
    ADD CONSTRAINT fk_asig_seccion FOREIGN KEY (id_sec) REFERENCES academico.secciones(id_sec) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5833 (class 0 OID 0)
-- Dependencies: 5193
-- Name: CONSTRAINT fk_asig_seccion ON asig_carga_horarias; Type: COMMENT; Schema: horarios; Owner: postgres
--

COMMENT ON CONSTRAINT fk_asig_seccion ON horarios.asig_carga_horarias IS 'Relación con la tabla de secciones';


--
-- TOC entry 5187 (class 2606 OID 66094)
-- Name: espacios_fis fk_espacios_municipio; Type: FK CONSTRAINT; Schema: infraestructura; Owner: postgres
--

ALTER TABLE ONLY infraestructura.espacios_fis
    ADD CONSTRAINT fk_espacios_municipio FOREIGN KEY (id_mun) REFERENCES general.municipios(id_mun) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5834 (class 0 OID 0)
-- Dependencies: 5187
-- Name: CONSTRAINT fk_espacios_municipio ON espacios_fis; Type: COMMENT; Schema: infraestructura; Owner: postgres
--

COMMENT ON CONSTRAINT fk_espacios_municipio ON infraestructura.espacios_fis IS 'Llaveforanea que trae el identificador de los municipios';


--
-- TOC entry 5185 (class 2606 OID 114801)
-- Name: disponibilidad_docente fk_dip_docente; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.disponibilidad_docente
    ADD CONSTRAINT fk_dip_docente FOREIGN KEY (id_doc) REFERENCES personas.docentes(id_doc) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5835 (class 0 OID 0)
-- Dependencies: 5185
-- Name: CONSTRAINT fk_dip_docente ON disponibilidad_docente; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT fk_dip_docente ON personas.disponibilidad_docente IS 'Llave foránea con RESTRICT para mantener coherencia con la política de borrado lógico del sistema. Cambiado de CASCADE a RESTRICT en v3.8.';


--
-- TOC entry 5186 (class 2606 OID 66089)
-- Name: disponibilidad_docente fk_disp_dia; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.disponibilidad_docente
    ADD CONSTRAINT fk_disp_dia FOREIGN KEY (id_dia) REFERENCES general.dias_laborales(id_dia) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5179 (class 2606 OID 66064)
-- Name: docentes fk_docentes_usuario; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.docentes
    ADD CONSTRAINT fk_docentes_usuario FOREIGN KEY (id_usu) REFERENCES general.usuarios(id_usu) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5836 (class 0 OID 0)
-- Dependencies: 5179
-- Name: CONSTRAINT fk_docentes_usuario ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT fk_docentes_usuario ON personas.docentes IS 'Llave foranea del identificador del usuario';


--
-- TOC entry 5181 (class 2606 OID 66074)
-- Name: estudiantes fk_estudiante_usuario; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes
    ADD CONSTRAINT fk_estudiante_usuario FOREIGN KEY (id_usu) REFERENCES general.usuarios(id_usu) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5837 (class 0 OID 0)
-- Dependencies: 5181
-- Name: CONSTRAINT fk_estudiante_usuario ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT fk_estudiante_usuario ON personas.estudiantes IS 'Llave foranea del identificador del usuario';


--
-- TOC entry 5182 (class 2606 OID 172355)
-- Name: estudiantes fk_estudiantes_municipio; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes
    ADD CONSTRAINT fk_estudiantes_municipio FOREIGN KEY (id_mun) REFERENCES general.municipios(id_mun) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5838 (class 0 OID 0)
-- Dependencies: 5182
-- Name: CONSTRAINT fk_estudiantes_municipio ON estudiantes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT fk_estudiantes_municipio ON personas.estudiantes IS 'Llave foránea al municipio. ON UPDATE CASCADE para permitir renumeración de IDs; RESTRICT para borrado físico.';


--
-- TOC entry 5183 (class 2606 OID 114822)
-- Name: estudiantes fk_estudiantes_programa; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes
    ADD CONSTRAINT fk_estudiantes_programa FOREIGN KEY (id_pro) REFERENCES academico.programas(id_pro) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5184 (class 2606 OID 114827)
-- Name: estudiantes fk_estudiantes_seccion; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.estudiantes
    ADD CONSTRAINT fk_estudiantes_seccion FOREIGN KEY (id_sec) REFERENCES academico.secciones(id_sec) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5180 (class 2606 OID 66069)
-- Name: docentes fk_id_mun; Type: FK CONSTRAINT; Schema: personas; Owner: postgres
--

ALTER TABLE ONLY personas.docentes
    ADD CONSTRAINT fk_id_mun FOREIGN KEY (id_mun) REFERENCES general.municipios(id_mun) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5839 (class 0 OID 0)
-- Dependencies: 5180
-- Name: CONSTRAINT fk_id_mun ON docentes; Type: COMMENT; Schema: personas; Owner: postgres
--

COMMENT ON CONSTRAINT fk_id_mun ON personas.docentes IS 'Llave foranea del identificador del municipio';


-- Completed on 2026-11-21 09:27:14

--
-- PostgreSQL database dump complete
--

\unrestrict g7c4xvRAuuRNAPx9H6hNQsUzSBAL7eFCEFgdPf60FOHyAZ3wSxCfMYft0LjeO1l

