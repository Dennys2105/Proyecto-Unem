"""Endpoints de reportes de seguridad. Solo accesibles con permiso
de lectura sobre el módulo de auditoría ('aud_mov')."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.config.db_conection import get_session
from app.dependencies.auth_deps import verificar_permiso
from app.service.audit_report_service import AuditReportService

router = APIRouter(prefix="/reportes-seguridad", tags=["Reportes de Seguridad"])

# Alcance LIM: ADMIN (TODO) pasa; roles sin permiso explícito quedan fuera.
_LECTOR = Depends(verificar_permiso("aud_mov", "LEC", "LIM"))


@router.get("/diario")
def reporte_diario(
    fecha: date = Query(None, description="Fecha a analizar (YYYY-MM-DD). Default: hoy"),
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    fecha = fecha or date.today()
    return AuditReportService.reporte_diario(session, fecha)


@router.get("/anomalias")
def anomalias(
    fecha: date = Query(None),
    ventana_min: int = Query(10, ge=1, le=120, description="Ventana en minutos para ráfagas"),
    umbral_rafaga: int = Query(3, ge=2, le=50, description="Movimientos que definen ráfaga"),
    umbral_borrados: int = Query(5, ge=1, le=100, description="Anulaciones que definen borrado masivo"),
    hora_min: int = Query(7, ge=0, le=23, description="Inicio del horario operativo"),
    hora_max: int = Query(21, ge=0, le=23, description="Fin del horario operativo"),
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    return AuditReportService.detectar_anomalias(
        session, fecha, ventana_min, umbral_rafaga, umbral_borrados, hora_min, hora_max
    )


@router.get("/notas")
def cambios_notas(
    desde: date = Query(None),
    hasta: date = Query(None),
    limite: int = Query(100, ge=1, le=500),
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    hasta = hasta or date.today()
    desde = desde or (hasta - timedelta(days=30))
    return AuditReportService.cambios_de_notas(session, desde, hasta, limite)


@router.get("/permisos")
def cambios_permisos(
    desde: date = Query(None),
    hasta: date = Query(None),
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    hasta = hasta or date.today()
    desde = desde or (hasta - timedelta(days=30))
    return AuditReportService.cambios_de_privilegios(session, desde, hasta)


@router.get("/accesos")
def accesos(
    desde: date = Query(None),
    hasta: date = Query(None),
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    hasta = hasta or date.today()
    desde = desde or (hasta - timedelta(days=7))
    return AuditReportService.eventos_de_acceso(session, desde, hasta)


@router.get("/ejecutivo")
def reporte_ejecutivo(
    fecha: date = Query(None, description="Default: hoy"),
    session: Session = Depends(get_session),
    usuario_actual: dict = _LECTOR,
):
    fecha = fecha or date.today()
    return AuditReportService.reporte_ejecutivo(session, fecha)