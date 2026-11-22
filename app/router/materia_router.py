from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import Session, text
from typing import Optional, List
from pydantic import BaseModel
from app.dependencies.auth_deps import verificar_permiso
from app.dependencies.session_auditable import get_session_auditable as get_session
from app.dependencies.pruebas_optimizacion import validar_unicidad
from app.models.unem_db_models import EjeFormativo, Materia
from app.schemas.esq_materias import MateriaCreate, MateriaResponse, MateriaUpdate
import app.service.materias_service as service

router = APIRouter(prefix="/materias", tags=["Materias"])
ROLES_AUTORIZADOS_GESTIONAR_MATERIAS = {1, 2}


def _verificar_rol_gestion(usuario_actual: dict) -> None:
    if usuario_actual.get("rol") not in ROLES_AUTORIZADOS_GESTIONAR_MATERIAS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo Administrador o Vicerrector pueden crear o editar materias.",
        )


def _validar_eje_activo(session: Session, id_eje: int) -> None:
    eje = session.get(EjeFormativo, id_eje)
    if not eje or eje.estatus != "A":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El eje formativo seleccionado no existe o está inactivo.",
        )

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
    usuario_actual: dict = Depends(verificar_permiso("materias", "LEC", "SP"))
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


@router.post("/", response_model=MateriaResponse, status_code=status.HTTP_201_CREATED)
def crear_materia(
    materia_in: MateriaCreate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("materias", "CRE", "LIM")),
):
    _verificar_rol_gestion(usuario_actual)
    validar_unicidad(Materia, "codigo")(materia_in, session)
    _validar_eje_activo(session, materia_in.id_eje)
    return service.crear(session, materia_in)


@router.patch("/{materia_id}", response_model=MateriaResponse)
def actualizar_materia(
    materia_id: int,
    dato_in: MateriaUpdate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("materias", "ACT", "LIM")),
):
    _verificar_rol_gestion(usuario_actual)
    db_dato = service.obtener_dato_por_id(materia_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")

    validar_unicidad(Materia, "codigo", "id_mat")(dato_in, session, materia_id)
    if dato_in.id_eje is not None:
        _validar_eje_activo(session, dato_in.id_eje)

    return service.actualizar(session, db_dato, dato_in, parcial=True)