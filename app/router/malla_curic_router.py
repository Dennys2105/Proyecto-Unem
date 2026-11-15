from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import Session, text
from typing import Optional, List
from pydantic import BaseModel
from app.dependencies.auth_deps import verificar_permiso
from app.config.db_conection import get_session
import app.service.malla_curicular_service as service
from app.schemas.esq_malla_curricular import MateriaInfo,ProgramaInfo,MallaRead, MallaCurricularResponse, MallaCurricularUpdate, MallaCurricularCreate
from app.queries.malla_queries import LEER_MALLAS

router = APIRouter(prefix="/mallas", tags=["Malla Curricular"])

@router.get("/", response_model=List[MallaRead])
def listar_mallas(
    id_pro: Optional[int] = Query(None, description="Filtrar por programa"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("malla", "LEC", "TODO"))
):
    query = LEER_MALLAS
    params = {}
    if id_pro:
        query += " AND mc.id_pro = :id_pro"
        params["id_pro"] = id_pro

    query += " ORDER BY mc.id_pro, mc.trayecto, mc.periodo, mc.orden"
    
    resultados = session.exec(text(query).params(**params)).mappings().all()
    
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
                "unidades_creditos": r["pre_uc"]
            } if r["pre_id"] else None
        })
        
    return mallas_formateadas

# --- CREATE ---
@router.post("/", response_model=MallaCurricularResponse, status_code=status.HTTP_201_CREATED)
def crear_mallal(dia_in: MallaCurricularCreate, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('malla','CRE', 'LIM'))):
    id_pro = service.existe_llave_foranea_pro(session,dia_in.id_pro)
    id_mat = service.existe_llave_foranea_mat(session,dia_in.id_mat)
    id_pre_mat = service.existe_llave_foranea_mat(session,dia_in.perequisito_id_mat)
    if not id_pro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no existe")
    elif not id_mat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La Materia no existe")
    
    elif not id_pre_mat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La Materia de prerequisito no existe")
    
    return service.crear(session, dia_in)

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{malla_id}", response_model=MallaCurricularResponse)
def actualizar_parcial_malla(malla_id: int, dato_in: MallaCurricularUpdate, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('malla','ACT','LIM'))):
    db_dato = service.obtener_dato_por_id(malla_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Malla no encontrado")
    
    id_pro = service.existe_llave_foranea_pro(session,dato_in.id_pro)
    id_mat = service.existe_llave_foranea_mat(session,dato_in.id_mat)
    id_pre_mat = service.existe_llave_foranea_mat(session,dato_in.perequisito_id_mat)
    if not id_pro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no existe")
    elif not id_mat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La Materia no existe")
    elif not id_pre_mat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La Materia de prerequisito no existe")
    
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{malla_id}", status_code=status.HTTP_200_OK)
def eliminar_malla(malla_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('malla','BOR','TODO'))):
    db_dato = service.obtener_dato_por_id(malla_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Malla no encontrada")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Malla eliminada exitosamente"}