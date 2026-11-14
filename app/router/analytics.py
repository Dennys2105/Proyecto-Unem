from fastapi import APIRouter, Depends, HTTPException, status,Query
from sqlmodel import Session, text
from typing import Optional
from datetime import date
from app.dependencies.auth_deps import verificar_permiso
from app.config.db_conection import get_session 
from app.models.model_read_only import VwResumenEstadisticoRead,VwPermisosEfectivosRead,VwMovimientosRead,VwHorarioCompletoDocenteRead, VwDocentesPorContratoRead, VwDocentesPorProgramaMunicipioRead, VwAnalisisNotas
router = APIRouter(prefix="/analytics", tags=["Analítica y Reportes"])

#No se a implementado la funcion de autenticacion para facilitar las pruebas 

@router.get("/resumen", response_model=VwResumenEstadisticoRead)
def obtener_resumen_dashboard(session: Session = Depends(get_session), usuario_actual: dict = Depends(verificar_permiso("usuarios", "LEC","LIM"))):
    statement = text("SELECT * FROM general.vw_resumen_estadistico")
    
    resultado = session.exec(statement).mappings().first()
    
    if not resultado:
        return {} 
        
    return VwResumenEstadisticoRead(**resultado)

@router.get("/analisis_notas", response_model=VwAnalisisNotas)
def obtner_analisis_notas(
    cod_programa: Optional[str] = Query(None, description="Filtrar por Codigo de materia"),
    session: Session = Depends(get_session), 
    usuario_actual: dict = Depends(verificar_permiso("estudiantes", "LEC", "LIM"))):

    statement = text("SELECT * FROM academico.vw_analisis_notas WHERE cod_programa = :cod_programa").params(cod_programa=cod_programa)
    resultados = session.exec(statement).mappings().all()
    
    if not resultados:
        raise HTTPException(status_code=404, detail="No se encontraron datos para analisar")
        
    return [VwAnalisisNotas(**row) for row in resultados]

@router.get("/permisos", response_model=list[VwPermisosEfectivosRead])
def obtener_permiso_usuarios(usuario_id: int, session: Session = Depends(get_session)):
    
    statement = text("""
        SELECT *
        FROM general.vw_permisos_efectivos_usuario 
        WHERE id_usu = :usuario_id
    """).params(usuario_id=usuario_id)
    
    resultados = session.exec(statement).mappings().all()
    
    if not resultados:
        raise HTTPException(status_code=404, detail="No se encontraron permisos para este usuario.")
        
    return [VwPermisosEfectivosRead(**row) for row in resultados]

@router.get("/auditoria/movimientos", response_model=list[VwMovimientosRead])
def consultar_auditoria_avanzada(
    tabla: Optional[str] = Query(None, description="Filtrar por tabla afectada"),
    usuario: Optional[str] = Query(None, description="Filtrar por nombre de usuario"),
    fecha_inicio: Optional[date] = Query(None, description="Filtrar desde la fecha (YYYY-MM-DD)"),
    session: Session = Depends(get_session)
):
    query = """
        SELECT 
            am.id_aud,
            am.fec_hor AS fecha,
            COALESCE(u.username, 'Sistema') AS usuario,
            am.tabla_mod AS tabla_afectada,
            am.accion,
            CASE
                -- DOCENTES: cédula + nombre completo
                WHEN am.tabla_mod = 'docentes' THEN
                    COALESCE(CONCAT(d.cedula, ' - ', d.nombre, ' ', d.apellido),
                             vl.registro_identificador, 'N/A')
                -- ESTUDIANTES: cédula + nombre completo
                WHEN am.tabla_mod = 'estudiantes' THEN
                    COALESCE(CONCAT(e.cedula, ' - ', e.nombre, ' ', e.apellido),
                             vl.registro_identificador, 'N/A')
                -- NOTAS: estudiante + materia + valor nota
                WHEN am.tabla_mod = 'notas' THEN
                    COALESCE(
                        CONCAT(e.nombre, ' ', e.apellido, ' | ', m_n.nombre, ' | Nota: ', n.nota),
                        CONCAT('NotaID:', COALESCE(am.val_despues->>'id_nota', am.val_antes->>'id_nota', '?'))
                    )
                -- CREDENCIALES: username del usuario dueño
                WHEN am.tabla_mod = 'credenciales' THEN
                    COALESCE(CONCAT('Usuario: ', u_c.username),
                             CONCAT('CreID:', COALESCE(am.val_despues->>'id_cre', am.val_antes->>'id_cre', '?')))
                -- ASIGNACIONES: docente + día
                WHEN am.tabla_mod = 'asig_carga_horarias' THEN
                    COALESCE(CONCAT(d.nombre, ' ', d.apellido, ' | ', dia.dia),
                             vl.registro_identificador, 'N/A')
                -- SECCIONES: código + programa
                WHEN am.tabla_mod = 'secciones' THEN
                    COALESCE(CONCAT(s.codigo, ' (', p2.nombre, ')'),
                             CONCAT('SecID:', COALESCE(am.val_despues->>'id_sec', am.val_antes->>'id_sec', '?')))
                -- MATERIAS: nombre real
                WHEN am.tabla_mod = 'materias' THEN
                    COALESCE(mat.nombre, vl.registro_identificador, 'N/A')
                -- PROGRAMAS: nombre real
                WHEN am.tabla_mod = 'programas' THEN
                    COALESCE(p.nombre, vl.registro_identificador, 'N/A')
                -- MUNICIPIOS: nombre real
                WHEN am.tabla_mod = 'municipios' THEN
                    COALESCE(mun.nombre, vl.registro_identificador, 'N/A')
                -- DÍAS LABORALES: nombre del día
                WHEN am.tabla_mod = 'dias_laborales' THEN
                    COALESCE(dia.dia, vl.registro_identificador, 'N/A')
                -- ESPACIOS FÍSICOS: centro + ubicación
                WHEN am.tabla_mod = 'espacios_fis' THEN
                    COALESCE(CONCAT(esp.nombre_centro, ' - ', esp.ubicacion),
                             vl.registro_identificador, 'N/A')
                -- USUARIOS: username (la vista ya lo trae)
                WHEN am.tabla_mod = 'usuarios' THEN
                    COALESCE(vl.registro_identificador, 'N/A')
                -- RESTO: usar lo que diga la vista
                ELSE COALESCE(vl.registro_identificador, 'N/A')
            END AS registro_identificador,
            vl.resumen_cambio AS resumen_cambios,
            am.dir_ip AS ip_origen
        FROM general.aud_mov am
        LEFT JOIN general.usuarios u ON u.id_usu = am.id_usu
        LEFT JOIN general.vw_auditoria_legible vl ON vl.id_aud = am.id_aud
        -- JOINs con esquemas CORRECTOS (verificados contra BD 4.3)
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
    params = {}

    if tabla:
        query += " AND am.tabla_mod = :tabla"
        params["tabla"] = tabla
    if usuario:
        query += " AND u.username ILIKE :usuario"
        params["usuario"] = f"%{usuario}%"
    if fecha_inicio:
        query += " AND am.fec_hor >= :fecha_inicio"
        params["fecha_inicio"] = fecha_inicio

    query += " ORDER BY am.fec_hor DESC LIMIT 100"

    resultados = session.exec(text(query).params(**params)).mappings().all()
    return [VwMovimientosRead(**row) for row in resultados]

@router.get("/Horario_docente", response_model=list[VwHorarioCompletoDocenteRead])
def horario_completo_docente(
    cedula: Optional[str] = Query(None, description="Filtrar por cédula exacta del docente (ej: V-14567890)"),
    cod_materia: Optional[str] = Query(None, description="Filtrar por el código de la materia (ej: INF-T1P1-PRO)"),
    cod_programa: Optional[str] = Query(None, description="Filtrar por el código del programa (ej: INF)"),
    session: Session = Depends(get_session)
):

    # Construcción dinámica ajustada exactamente a los campos de la vista personas.vw_horario_completo_docente
    query = """
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
    params = {}
    
    if cedula:
        query += " AND cedula = :cedula"
        params["cedula"] = cedula
    if cod_materia:
        query += " AND cod_materia ILIKE :cod_materia"
        params["cod_materia"] = f"%{cod_materia}%"
    if cod_programa:
        query += " AND cod_programa ILIKE :cod_programa"
        params["cod_programa"] = f"%{cod_programa}%"
        
    query += " ORDER BY hora_inicio ASC LIMIT 100"
    
    resultados = session.exec(text(query).params(**params)).mappings().all()
    
    return [VwHorarioCompletoDocenteRead(**row) for row in resultados]