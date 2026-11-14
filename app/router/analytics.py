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
    tabla: Optional[str] = Query(None, description="Filtrar por tabla afectada (ej: docentes, notas)"),
    usuario: Optional[str] = Query(None, description="Filtrar por nombre de usuario"),
    fecha_inicio: Optional[date] = Query(None, description="Filtrar desde la fecha (YYYY-MM-DD)"),
    session: Session = Depends(get_session)
):
    # Construcción dinámica y segura de la consulta con filtros opcionales
    query = """
        SELECT 
            id_aud, 
            fecha_hora AS fecha, 
            usuario, 
            tabla_afectada, 
            accion, 
            registro_identificador, 
            resumen_cambio AS resumen_cambios, 
            ip_origen,
            val_antes, val_despues
        FROM general.vw_auditoria_legible
        WHERE 1=1
    """
    params = {}
    
    if tabla:
        query += " AND tabla_afectada = :tabla"
        params["tabla"] = tabla
    if usuario:
        query += " AND usuario ILIKE :usuario"
        params["usuario"] = f"%{usuario}%"
    if fecha_inicio:
        query += " AND fecha_hora >= :fecha_inicio"
        params["fecha_inicio"] = fecha_inicio
        
    query += " ORDER BY fecha_hora DESC LIMIT 100"
    
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