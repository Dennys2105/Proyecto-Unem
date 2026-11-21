from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlmodel import Session, select, update
from app.models.unem_db_models import PeriodoAcademico
from app.dependencies.session_auditable import get_session_auditable as get_session
from app.schemas.esq_periodos_aca import PeriodoCreate, PeriodoUpdate, PeriodoResponse
import app.service.period_aca_service as service
from app.dependencies.auth_deps import verificar_permiso

router = APIRouter(prefix="/periodos", tags=["Periodos Académicos"])

@router.get("/", response_model=List[PeriodoResponse])
def leer_periodos(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('periodos', 'LEC', 'SP'))
):
    return service.obtener_todos(session)

@router.post("/", response_model=PeriodoResponse, status_code=status.HTTP_201_CREATED)
def crear_periodo(
    periodo_in: PeriodoCreate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('periodos', 'CRE', 'LIM'))
):
    return service.crear(session, periodo_in)

@router.patch("/{periodo_id}", response_model=PeriodoResponse)
def actualizar_parcial_periodo(
    periodo_id: int,
    dato_in: PeriodoUpdate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('periodos', 'ACT', 'LIM'))
):
    db_dato = service.obtener_dato_por_id(periodo_id, session)
    if not db_dato:
        raise HTTPException(status_code=404, detail="Período no encontrado")
    return service.actualizar(session=session, db_dato=db_dato, dato_in=dato_in, parcial=True)

@router.delete("/{periodo_id}", status_code=status.HTTP_200_OK)
def eliminar_periodo(
    periodo_id: int,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('periodos', 'BOR', 'TODO'))
):
    db_dato = service.obtener_dato_por_id(periodo_id, session)
    if not db_dato:
        raise HTTPException(status_code=404, detail="Período no encontrado")
    return service.eliminar(session=session, db_dato=db_dato)

@router.post("/{periodo_id}/activar", response_model=PeriodoResponse)
def activar_periodo_vigente(
    periodo_id: int,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso('periodos', 'ACT', 'LIM'))
):
    """Pone este período como el ÚNICO vigente (desactiva los demás)."""
    db_dato = service.obtener_dato_por_id(periodo_id, session)
    if not db_dato:
        raise HTTPException(status_code=404, detail="Período no encontrado")

    # 1. Desactivar TODOS los demás
    session.exec(
        update(PeriodoAcademico)
        .where(PeriodoAcademico.id_per != periodo_id)
        .where(PeriodoAcademico.tipo == db_dato.tipo)   # ✅ AGREGAR esta línea
        .where(PeriodoAcademico.activo == True)
        .values(activo=False)
    )
    
    # 2. Activar el seleccionado
    db_dato.activo = True
    session.add(db_dato)
    session.commit()
    session.refresh(db_dato)
    return db_dato