from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, text
from typing import Optional, List
from pydantic import BaseModel
from app.dependencies.auth_deps import (
    verificar_permiso, docente_del_usuario, materias_del_docente, es_docente_sp,
)
from app.dependencies.session_auditable import get_session_auditable as get_session

router = APIRouter(prefix="/mallas", tags=["Malla Curricular"])

# Esquemas de respuesta anidados
class MateriaInfo(BaseModel):
    id_mat: int
    codigo: str
    nombre: str
    unidades_creditos: int
    eje_nombre: Optional[str] = None

class ProgramaInfo(BaseModel):
    id_pro: int
    codigo: str
    nombre: str

class MallaRead(BaseModel):
    id_malla: int
    id_pro: int
    id_mat: int
    trayecto: int
    periodo: int
    orden: int
    perequisito_id_mat: Optional[int] = None
    programa: ProgramaInfo
    materia: MateriaInfo
    prerequisito: Optional[MateriaInfo] = None

@router.get("/", response_model=List[MallaRead])
def listar_mallas(
    id_pro: Optional[int] = Query(None, description="Filtrar por programa"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("malla", "LEC", "SP"))
):
    # ✅ Consulta corregida: ahora incluye pre.unidades_creditos
    query = """
        SELECT 
            mc.id_malla, mc.id_pro, mc.id_mat, mc.trayecto, mc.periodo, 
            mc.orden, mc.perequisito_id_mat,
            -- Datos del Programa
            p.id_pro as prog_id, p.codigo as prog_codigo, p.nombre as prog_nombre,
            -- Datos de la Materia
            m.id_mat as mat_id, m.codigo as mat_codigo, m.nombre as mat_nombre, 
            m.unidades_creditos as mat_uc, e.nombre as eje_nombre,
            -- Datos del Prerrequisito (si existe)
            pre.id_mat as pre_id, pre.codigo as pre_codigo, pre.nombre as pre_nombre, pre.unidades_creditos as pre_uc
        FROM academico.malla_curricular mc
        JOIN academico.programas p ON p.id_pro = mc.id_pro
        JOIN academico.materias m ON m.id_mat = mc.id_mat
        LEFT JOIN academico.ejes_formativos e ON e.id_eje = m.id_eje
        LEFT JOIN academico.materias pre ON pre.id_mat = mc.perequisito_id_mat
        WHERE mc.estatus = 'A'
    """
    params = {}
    if id_pro:
        query += " AND mc.id_pro = :id_pro"
        params["id_pro"] = id_pro
    if es_docente_sp(usuario_actual):
        id_doc = docente_del_usuario(usuario_actual, session)
        if id_doc is None:
            return []
        ids = set(materias_del_docente(session, id_doc))
        if not ids:
            return []
        placeholders = ", ".join(f":malla{i}" for i in range(len(ids)))
        query += f" AND mc.id_malla IN ({placeholders})"
        params.update({f"malla{i}": id_malla for i, id_malla in enumerate(ids)})

    query += " ORDER BY mc.id_pro, mc.trayecto, mc.periodo, mc.orden"
    
    resultados = session.exec(text(query).params(**params)).mappings().all()
    
    # Mapeo manual para construir la estructura anidada
    mallas_formateadas = []
    for r in resultados:
        mallas_formateadas.append({
            "id_malla": r["id_malla"],
            "id_pro": r["id_pro"],
            "id_mat": r["id_mat"],
            "trayecto": r["trayecto"],
            "periodo": r["periodo"],
            "orden": r["orden"],
            "perequisito_id_mat": r["perequisito_id_mat"],
            "programa": {
                "id_pro": r["prog_id"],
                "codigo": r["prog_codigo"],
                "nombre": r["prog_nombre"]
            },
            "materia": {
                "id_mat": r["mat_id"],
                "codigo": r["mat_codigo"],
                "nombre": r["mat_nombre"],
                "unidades_creditos": r["mat_uc"],
                "eje_nombre": r["eje_nombre"]
            },
            "prerequisito": {
                "id_mat": r["pre_id"],
                "codigo": r["pre_codigo"],
                "nombre": r["pre_nombre"],
                "unidades_creditos": r["pre_uc"]  # ✅ AQUÍ ESTABA EL CAMPO FALTANTE
            } if r["pre_id"] else None
        })
        
    return mallas_formateadas