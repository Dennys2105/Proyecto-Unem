from fastapi import APIRouter, Depends, HTTPException, status,Query
from sqlmodel import Session, text
from typing import Optional
from datetime import date
import app.queries.analitics_queries as q
from app.dependencies.auth_deps import verificar_permiso
from app.config.db_conection import get_session 
from app.models.model_read_only import VwResumenEstadisticoRead,VwPermisosEfectivosRead,VwMovimientosRead,VwHorarioCompletoDocenteRead, VwDocentesPorContratoRead, VwDocentesPorProgramaMunicipioRead, VwAnalisisNotas
import app.service.analitycs_service as s

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

    return s.aud_avanzada(tabla,usuario,fecha_inicio,session)

@router.get("/Horario_docente", response_model=list[VwHorarioCompletoDocenteRead])
def horario_completo_docente(
    cedula: Optional[str] = Query(None, description="Filtrar por cédula exacta del docente (ej: V-14567890)"),
    cod_materia: Optional[str] = Query(None, description="Filtrar por el código de la materia (ej: INF-T1P1-PRO)"),
    cod_programa: Optional[str] = Query(None, description="Filtrar por el código del programa (ej: INF)"),
    session: Session = Depends(get_session)
):
    
    return s.horario_comp_doc(cedula,cod_materia,cod_programa,session)