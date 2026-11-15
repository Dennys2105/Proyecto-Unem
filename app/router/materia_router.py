from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import Session, text
from typing import Optional, List
from app.dependencies.auth_deps import verificar_permiso
from app.config.db_conection import get_session
from app.dependencies.pruebas_optimizacion import validar_unicidad
import app.service.materias_service as service
from app.schemas.esq_materias import MateriaCreate,MateriaResponse,MateriaUpdate,MateriaRead
from app.models.unem_db_models import Materia
from app.queries.materias_queries import MATERIAS_READ

router = APIRouter(prefix="/materias", tags=["Materias"])

@router.get("/", response_model=List[MateriaRead])
def listar_materias(
    busqueda: Optional[str] = Query(None, description="Buscar por código o nombre"),
    id_eje: Optional[int] = Query(None, description="Filtrar por eje formativo"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("materias", "LEC", "TODO"))
):
    # Consulta base con JOINs para traer nombres de ejes y conteo de programas
    query = MATERIAS_READ
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

# --- CREATE ---
@router.post("/", response_model=MateriaResponse, status_code=status.HTTP_201_CREATED)
def crear_materia(materia_in: MateriaCreate, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('malla','CRE','LIM'))):
    validar_unicidad(Materia,['codigo'])(materia_in,session)
    mun_id = service.existe_llave_foranea_eje(session,materia_in.id_eje)
    if not mun_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El Eje Formativo no existe")
    
    return service.crear(session, materia_in)

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{materia_id}", response_model=MateriaResponse)
def actualizar_parcial_materia(materia_id: int, dato_in: MateriaUpdate, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('malla','ACT','LIM'))):
    if not service.existe_llave_foranea_eje(session,dato_in.id_eje):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Eje Formativo no encontrado")
    
    db_dato = service.obtener_dato_por_id(materia_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)

# --- DELETE LOGICO ---
@router.delete("/{materia_id}", status_code=status.HTTP_200_OK)
def eliminar_materia(materia_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('malla','BOR','LIM'))):
    db_dato = service.obtener_dato_por_id(materia_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Materia eliminada exitosamente"}