from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session, text
from app.config.db_conection import get_session
from app.dependencies.auth_deps import requerir_rol, recurso_propietario, obtener_usuario_actual,verificar_permiso, docente_del_usuario, es_docente_sp
from app.models.unem_db_models import Docente
from app.schemas.esq_docente import DocenteCreate,DocenteReplace,DocenteResponse,DocenteUpdate
import app.service.docentes_service as service
from app.dependencies.pruebas_optimizacion import validar_unicidad

router= APIRouter(
    prefix="/docentes",
    tags=["Docentes"]
)

# --- CREATE ---
@router.post("/", response_model=DocenteResponse, status_code=status.HTTP_201_CREATED)
def crear_docente(docente_in: DocenteCreate, session: Session = Depends(get_session), usuario_actual: dict = Depends(verificar_permiso('docentes','CRE','TODO'))):
    usu_id = service.existe_llave_foranea_usu(session,docente_in.id_usu)
    mun_id = service.existe_llave_foranea_mun(session,docente_in.id_mun)
    if not usu_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no existe")
    elif not mun_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Municipio no existe")
    
    validar_unicidad(Docente,["id_usu","cedula"])(docente_in,session)
    return service.crear(session, docente_in)

# --- READ ALL ---
@router.get("/", response_model=List[DocenteResponse])
def leer_docentes(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('docentes', 'LEC', 'SP'))
):
    # DOCENTE con SP: solo su propia ficha
    if es_docente_sp(usuario_actual):
        id_doc = docente_del_usuario(usuario_actual, session)
        if id_doc is None:
            return []
        dato = service.obtener_dato_por_id(id_doc, session)
        if not dato:
            return []
        tiene_asig = session.execute(
            text(
                "SELECT COUNT(*) FROM horarios.asig_carga_horarias "
                "WHERE id_doc = :d AND estatus = 'A'"
            ),
            {"d": id_doc}
        ).scalar() > 0
        dato_dict = dato.model_dump() if hasattr(dato, 'model_dump') else dict(dato.__dict__)
        dato_dict['tiene_asignaciones'] = tiene_asig
        return [dato_dict]

    docentes = service.leer_todos(session)
    resultado = []
    for d in docentes:
        d_dict = d.model_dump() if hasattr(d, 'model_dump') else dict(d.__dict__)
        tiene_asig = session.execute(
            text(
                "SELECT COUNT(*) FROM horarios.asig_carga_horarias "
                "WHERE id_doc = :d AND estatus = 'A'"
            ),
            {"d": d_dict.get('id_doc')}
        ).scalar() > 0
        d_dict['tiene_asignaciones'] = tiene_asig
        resultado.append(d_dict)
    return resultado

# --- READ ONE ---
@router.get("/{docente_id}", response_model=DocenteResponse)
def leer_docente_id(docente_id: int, session: Session = Depends(get_session), usuario_actual: dict = Depends(verificar_permiso('docentes','LEC','SP'))):
    recurso_propietario(usuario_actual,docente_id,roles_restringidos=2)
    dato = service.obtener_dato_por_id(docente_id, session)
    if not dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
    return dato

# --- UPDATE (PARCIAL - PATCH) ---
@router.patch("/{docente_id}", response_model=DocenteResponse)
def actualizar_parcial_docente(
    docente_id: int, 
    dato_in: DocenteUpdate, 
    session: Session = Depends(get_session), 
    usuario_actual: dict = Depends(verificar_permiso('docentes', 'ACT', 'LIM'))
):
    # Aquí se pasa 'docente_id', no 'id'
    db_dato = service.obtener_dato_por_id(docente_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)


# --- DELETE LOGICO ---
@router.delete("/{docente_id}", status_code=status.HTTP_200_OK)
def eliminar_docente(docente_id: int, session: Session = Depends(get_session),usuario_actual: dict = Depends(verificar_permiso('docentes','BOR','TODO'))):
    db_dato = service.obtener_dato_por_id(docente_id, session)
    if not db_dato:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
    service.eliminar(session=session, db_dato=db_dato)
    return {"message": "Docente eliminado exitosamente"}