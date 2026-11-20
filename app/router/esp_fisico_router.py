from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import Session, text
from typing import Optional, List
from pydantic import BaseModel, Field
from app.dependencies.auth_deps import verificar_permiso, requerir_rol
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
    estatus: Optional[str] = Query('A', description="A=activos, I=retirados, vacío=todos"),
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
        WHERE 1=1
    """
    params = {}
    if estatus:
        query += " AND e.estatus = :estatus"
        params["estatus"] = estatus
    
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


# ============================================================
# CREAR / EDITAR ESPACIOS (Lote 5)
# ============================================================
from typing import Literal

TIPOS_ESPACIO = Literal['Aula', 'Laboratorio', 'Auditorio', 'Cancha']

class EspacioFisicoCreate(BaseModel):
    nombre_centro: str
    ubicacion: str
    tipo_espacio: TIPOS_ESPACIO
    capacidad: int = Field(..., ge=10, le=30)
    equipamiento: Optional[str] = None
    id_mun: int
    disponibilidad: bool = True

class EspacioFisicoUpdate(BaseModel):
    nombre_centro: Optional[str] = None
    ubicacion: Optional[str] = None
    tipo_espacio: Optional[TIPOS_ESPACIO] = None
    capacidad: Optional[int] = Field(None, ge=10, le=30)
    equipamiento: Optional[str] = None
    id_mun: Optional[int] = None
    disponibilidad: Optional[bool] = None
    estatus: Optional[str] = None


@router.post("/", status_code=status.HTTP_201_CREATED)
def crear_espacio(
    datos: EspacioFisicoCreate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("espacios", "CRE", "TODO")),
):
    centro = datos.nombre_centro.strip()
    ubi = datos.ubicacion.strip()
    dup = session.exec(text("""
        SELECT id_esp FROM infraestructura.espacios_fis
        WHERE lower(nombre_centro) = lower(:centro)
          AND lower(ubicacion) = lower(:ubi) AND estatus = 'A'
    """).params(centro=centro, ubi=ubi)).first()
    if dup:
        raise HTTPException(status_code=400, detail="Ya existe un espacio con esa ubicación en ese centro.")

    row = session.exec(text("""
        INSERT INTO infraestructura.espacios_fis
            (nombre_centro, ubicacion, tipo_espacio, capacidad, equipamiento, id_mun, disponibilidad, estatus)
        VALUES (:centro, :ubi, :tipo, :cap, :eq, :mun, :disp, 'A')
        RETURNING id_esp
    """).params(
        centro=centro, ubi=ubi, tipo=datos.tipo_espacio, cap=datos.capacidad,
        eq=datos.equipamiento, mun=datos.id_mun, disp=datos.disponibilidad,
    )).first()
    session.commit()
    return {"id_esp": row[0], "mensaje": f"Espacio '{ubi}' creado correctamente."}


@router.patch("/{id_esp}")
def actualizar_espacio(
    id_esp: int,
    datos: EspacioFisicoUpdate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("espacios", "ACT", "TODO")),
):
    existe = session.exec(text(
        "SELECT id_esp FROM infraestructura.espacios_fis WHERE id_esp = :i"
    ).params(i=id_esp)).first()
    if not existe:
        raise HTTPException(status_code=404, detail="Espacio no encontrado.")

    campos = datos.model_dump(exclude_unset=True)
    permitidos = {"nombre_centro", "ubicacion", "tipo_espacio", "capacidad",
                  "equipamiento", "id_mun", "disponibilidad"}
    sets, params = [], {"i": id_esp}
    for k, v in campos.items():
        if k not in permitidos:
            continue
        sets.append(f"{k} = :{k}")
        params[k] = v.strip() if isinstance(v, str) and k in {"nombre_centro", "ubicacion"} else v
    if not sets:
        raise HTTPException(status_code=400, detail="No se envió ningún campo válido para actualizar.")

    session.exec(text(
        f"UPDATE infraestructura.espacios_fis SET {', '.join(sets)} WHERE id_esp = :i"
    ).params(**params))
    session.commit()
    return {"mensaje": "Espacio actualizado correctamente."}


# ============================================================
# RETIRAR ESPACIO (borrado lógico) — solo ADMIN(1) y VICERRECTOR(2)
# ============================================================
@router.delete("/{id_esp}")
def retirar_espacio(
    id_esp: int,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(requerir_rol([1, 2])),
):
    row = session.exec(text(
        "SELECT ubicacion FROM infraestructura.espacios_fis WHERE id_esp = :i"
    ).params(i=id_esp)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Espacio no encontrado.")

    activas = session.exec(text("""
        SELECT COUNT(*) FROM horarios.asig_carga_horarias
        WHERE id_esp = :i AND estatus = 'A'
    """).params(i=id_esp)).first()
    if activas and int(activas[0]) > 0:
        raise HTTPException(
            status_code=400,
            detail=f"'{row[0]}' tiene {int(activas[0])} asignación(es) activa(s). "
                   "Reasígnalas o anúlalas antes de retirarlo.",
        )

    session.exec(text(
        "UPDATE infraestructura.espacios_fis SET estatus = 'I' WHERE id_esp = :i"
    ).params(i=id_esp))
    session.commit()
    return {"mensaje": f"Espacio '{row[0]}' retirado correctamente."}


# ============================================================
# RESTAURAR ESPACIO — solo ADMIN(1) y VICERRECTOR(2)
# ============================================================
@router.patch("/{id_esp}/restaurar")
def restaurar_espacio(
    id_esp: int,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(requerir_rol([1, 2])),
):
    row = session.exec(text(
        "SELECT nombre_centro, ubicacion, estatus FROM infraestructura.espacios_fis WHERE id_esp = :i"
    ).params(i=id_esp)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Espacio no encontrado.")
    if row[2] == 'A':
        raise HTTPException(status_code=400, detail="El espacio ya está activo.")

    dup = session.exec(text("""
        SELECT id_esp FROM infraestructura.espacios_fis
        WHERE lower(nombre_centro) = lower(:centro)
          AND lower(ubicacion) = lower(:ubi) AND estatus = 'A' AND id_esp <> :i
    """).params(centro=row[0], ubi=row[1], i=id_esp)).first()
    if dup:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un espacio activo con la ubicación '{row[1]}' en ese centro. "
                   "Renómbralo antes de restaurar este.",
        )

    session.exec(text(
        "UPDATE infraestructura.espacios_fis SET estatus = 'A' WHERE id_esp = :i"
    ).params(i=id_esp))
    session.commit()
    return {"mensaje": f"Espacio '{row[1]}' restaurado correctamente."}