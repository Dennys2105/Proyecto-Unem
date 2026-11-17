from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import Session, text
from typing import Optional, List
from pydantic import BaseModel
from app.dependencies.auth_deps import verificar_permiso
from app.dependencies.session_auditable import get_session_auditable as get_session

router = APIRouter(prefix="/espacios_fisicos", tags=["Espacios Físicos"])

class EspacioFisicoRead(BaseModel):
    id_esp: int
    nombre_centro: str
    ubicacion: str
    tipo_espacio: str
    capacidad: int
    equipamiento: Optional[str] = None
    disponibilidad: bool
    municipio: str
    total_asignaciones: int = 0
    horas_ocupadas: float = 0.0

@router.get("/", response_model=List[EspacioFisicoRead])
def listar_espacios(
    tipo: Optional[str] = Query(None, description="Filtrar por tipo (Aula, Laboratorio, Auditorio, Cancha)"),
    disponible: Optional[bool] = Query(None, description="Filtrar por disponibilidad"),
    capacidad_min: Optional[int] = Query(None, description="Capacidad mínima"),
    busqueda: Optional[str] = Query(None, description="Buscar por nombre o ubicación"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("espacios", "LEC", "TODO"))
):
    query = """
        SELECT 
            e.id_esp,
            e.nombre_centro,
            e.ubicacion,
            e.tipo_espacio,
            e.capacidad,
            e.equipamiento,
            e.disponibilidad,
            m.nombre AS municipio,
            COUNT(a.id_asig) AS total_asignaciones,
            COALESCE(SUM(EXTRACT(EPOCH FROM (a.hora_fin - a.hora_inicio)) / 3600.0), 0) AS horas_ocupadas
        FROM infraestructura.espacios_fis e
        LEFT JOIN general.municipios m ON m.id_mun = e.id_mun
        LEFT JOIN horarios.asig_carga_horarias a ON a.id_esp = e.id_esp AND a.estatus = 'A'
        WHERE e.estatus = 'A'
    """
    params = {}
    
    if tipo:
        query += " AND e.tipo_espacio = :tipo"
        params["tipo"] = tipo
    if disponible is not None:
        query += " AND e.disponibilidad = :disponible"
        params["disponible"] = disponible
    if capacidad_min:
        query += " AND e.capacidad >= :capacidad_min"
        params["capacidad_min"] = capacidad_min
    if busqueda:
        query += " AND (e.nombre_centro ILIKE :busqueda OR e.ubicacion ILIKE :busqueda)"
        params["busqueda"] = f"%{busqueda}%"
    
    query += " GROUP BY e.id_esp, e.nombre_centro, e.ubicacion, e.tipo_espacio, e.capacidad, e.equipamiento, e.disponibilidad, m.nombre"
    query += " ORDER BY e.nombre_centro, (NULLIF(regexp_replace(e.ubicacion, '[^0-9]', '', 'g'), '')::int) NULLS LAST, e.ubicacion"
    
    resultados = session.exec(text(query).params(**params)).mappings().all()
    return [EspacioFisicoRead(**dict(r)) for r in resultados]