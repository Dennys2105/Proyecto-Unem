from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import Session, text
from typing import Optional, List
from pydantic import BaseModel
from app.dependencies.auth_deps import verificar_permiso
from app.dependencies.session_auditable import get_session_auditable as get_session

router = APIRouter(prefix="/materias", tags=["Materias"])

class MateriaRead(BaseModel):
    id_mat: int
    codigo: str
    nombre: str
    unidades_creditos: int
    id_eje: Optional[int] = None
    eje_nombre: Optional[str] = None
    descripcion: Optional[str] = None
    estatus: str
    programas_count: int
    programas_nombres: Optional[str] = None

@router.get("/", response_model=List[MateriaRead])
def listar_materias(
    busqueda: Optional[str] = Query(None, description="Buscar por código o nombre"),
    id_eje: Optional[int] = Query(None, description="Filtrar por eje formativo"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("materias", "LEC", "TODO"))
):
    # Consulta base con JOINs para traer nombres de ejes y conteo de programas
    query = """
        SELECT 
            m.id_mat,
            m.codigo,
            m.nombre,
            m.unidades_creditos,
            m.id_eje,
            e.nombre AS eje_nombre,
            m.descripcion,
            m.estatus,
            COUNT(DISTINCT mc.id_pro) AS programas_count,
            STRING_AGG(DISTINCT p.nombre, ', ') AS programas_nombres
        FROM academico.materias m
        LEFT JOIN academico.ejes_formativos e ON e.id_eje = m.id_eje
        LEFT JOIN academico.malla_curricular mc ON mc.id_mat = m.id_mat AND mc.estatus = 'A'
        LEFT JOIN academico.programas p ON p.id_pro = mc.id_pro AND p.estatus = 'A'
        WHERE m.estatus = 'A'
    """
    params = {}
    
    # Agregar filtros dinámicamente si existen
    if busqueda:
        query += " AND (m.codigo ILIKE :busqueda OR m.nombre ILIKE :busqueda)"
        params["busqueda"] = f"%{busqueda}%"
    
    if id_eje:
        query += " AND m.id_eje = :id_eje"
        params["id_eje"] = id_eje

    # Agrupar por todos los campos no agregados
    query += " GROUP BY m.id_mat, m.codigo, m.nombre, m.unidades_creditos, m.id_eje, e.nombre, m.descripcion, m.estatus"
    query += " ORDER BY m.codigo ASC"
    
    resultados = session.exec(text(query).params(**params)).mappings().all()
    return [MateriaRead(**dict(r)) for r in resultados]