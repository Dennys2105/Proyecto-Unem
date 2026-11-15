from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, text
from typing import Optional, List
from pydantic import BaseModel
from app.dependencies.auth_deps import verificar_permiso
from app.config.db_conection import get_session
from app.models.model_read_only import VwPermisosEfectivosRead

router = APIRouter(prefix="/permisos", tags=["Gestión de Permisos"])


# ==========================================
# ESQUEMAS (Pydantic)
# ==========================================
class UsuarioSimple(BaseModel):
    id_usu: int
    username: str
    id_rol: int
    rol: str
    estatus: str


class ModuloCatalogo(BaseModel):
    id_mod: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None


class PermisoCatalogo(BaseModel):
    id_perm: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None


class CatalogosResponse(BaseModel):
    modulos: List[ModuloCatalogo]
    permisos: List[PermisoCatalogo]


class PermisoOverride(BaseModel):
    """Un permiso personalizado (override) que el admin asigna a un usuario."""
    id_mod: int
    id_perm: int
    alcance: str  # TODO, SP, LIM, NAD


class PermisosUsuarioUpdate(BaseModel):
    """Cuerpo para guardar la matriz completa de permisos personalizados."""
    permisos: List[PermisoOverride]


# ==========================================
# ENDPOINTS
# ==========================================

@router.get("/usuarios", response_model=List[UsuarioSimple])
def listar_usuarios(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("usuarios", "LEC", "LIM"))
):
    """Lista todos los usuarios con su rol asignado."""
    query = text("""
        SELECT u.id_usu, u.username, u.id_rol, r.rol, u.estatus
        FROM general.usuarios u
        JOIN general.roles r ON r.id_rol = u.id_rol
        WHERE u.estatus = 'A'
        ORDER BY u.username
    """)
    resultados = session.exec(query).mappings().all()
    return [UsuarioSimple(**dict(r)) for r in resultados]


@router.get("/catalogos", response_model=CatalogosResponse)
def obtener_catalogos(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("usuarios", "LEC", "LIM"))
):
    """Devuelve los catálogos de módulos y permisos para construir la matriz."""
    modulos_q = text("""
        SELECT id_mod, codigo, nombre, descripcion
        FROM general.modulos
        WHERE estatus = 'A'
        ORDER BY id_mod
    """)
    permisos_q = text("""
        SELECT id_perm, codigo, nombre, descripcion
        FROM general.permisos
        ORDER BY id_perm
    """)
    modulos = [ModuloCatalogo(**dict(m)) for m in session.exec(modulos_q).mappings().all()]
    permisos = [PermisoCatalogo(**dict(p)) for p in session.exec(permisos_q).mappings().all()]
    return CatalogosResponse(modulos=modulos, permisos=permisos)


@router.get("/usuario/{id_usu}", response_model=List[VwPermisosEfectivosRead])
def permisos_efectivos_usuario(
    id_usu: int,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("usuarios", "LEC", "LIM"))
):
    """
    Devuelve la matriz completa de permisos efectivos del usuario.
    Combina: permisos heredados del rol + overrides personalizados.
    Ya existe la vista vw_permisos_efectivos_usuario que hace esto.
    """
    # Verificar que el usuario existe
    existe = session.exec(
        text("SELECT 1 FROM general.usuarios WHERE id_usu = :id AND estatus = 'A'")
        .params(id=id_usu)
    ).first()
    if not existe:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    query = text("""
        SELECT *
        FROM general.vw_permisos_efectivos_usuario
        WHERE id_usu = :usuario_id
    """).params(usuario_id=id_usu)
    resultados = session.exec(query).mappings().all()
    return [VwPermisosEfectivosRead(**dict(r)) for r in resultados]


@router.put("/usuario/{id_usu}", response_model=List[VwPermisosEfectivosRead])
def actualizar_permisos_usuario(
    id_usu: int,
    payload: PermisosUsuarioUpdate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("usuarios", "ACT", "TODO"))
):
    """
    Guarda la matriz de permisos personalizados de un usuario.
    - Borra todos los overrides actuales (estatus='I' para mantener histórico).
    - Inserta los nuevos overrides.
    - Valida que no se otorgue un permiso superior al del rol (seguridad).
    """
    # 1. Verificar usuario existe
    usuario = session.exec(
        text("SELECT id_rol FROM general.usuarios WHERE id_usu = :id AND estatus = 'A'")
        .params(id=id_usu)
    ).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    id_rol = usuario[0]

    # 2. Obtener el alcance máximo permitido por rol para cada (modulo, permiso)
    rol_permisos_q = text("""
        SELECT id_mod, id_perm, alcance
        FROM general.permisos_rol
        WHERE id_rol = :id_rol AND estatus = 'A'
    """).params(id_rol=id_rol)
    rol_permisos = {
        (row[0], row[1]): row[2]
        for row in session.exec(rol_permisos_q).all()
    }

    # 3. Validar que ningún override exceda el permiso del rol
    ORDEN_ALCANCE = {'NAD': 0, 'SP': 1, 'LIM': 2, 'TODO': 3}
    for p in payload.permisos:
        alcance_rol = rol_permisos.get((p.id_mod, p.id_perm), 'NAD')
        if ORDEN_ALCANCE.get(p.alcance, 0) > ORDEN_ALCANCE.get(alcance_rol, 0):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"No se puede otorgar alcance '{p.alcance}' al módulo {p.id_mod}, "
                    f"permiso {p.id_perm}: el rol del usuario solo permite '{alcance_rol}'. "
                    "Un administrador no puede escalar privilegios por encima del rol base."
                )
            )

    # 4. Desactivar (borrado lógico) los overrides actuales
    session.exec(
        text("""
            UPDATE general.permisos_usuario
            SET estatus = 'I'
            WHERE id_usu = :id_usu AND estatus = 'A'
        """).params(id_usu=id_usu)
    )

    # 5. Insertar los nuevos overrides
    for p in payload.permisos:
        # Verificar si ya existe un registro inactivo para reactivarlo (mantiene histórico)
        existente = session.exec(
            text("""
                SELECT id_pu FROM general.permisos_usuario
                WHERE id_usu = :id_usu AND id_mod = :id_mod AND id_perm = :id_perm
            """).params(id_usu=id_usu, id_mod=p.id_mod, id_perm=p.id_perm)
        ).first()

        if existente:
            session.exec(
                text("""
                    UPDATE general.permisos_usuario
                    SET alcance = :alcance, estatus = 'A'
                    WHERE id_pu = :id_pu
                """).params(alcance=p.alcance, id_pu=existente[0])
            )
        else:
            session.exec(
                text("""
                    INSERT INTO general.permisos_usuario (id_usu, id_mod, id_perm, alcance, estatus)
                    VALUES (:id_usu, :id_mod, :id_perm, :alcance, 'A')
                """).params(
                    id_usu=id_usu,
                    id_mod=p.id_mod,
                    id_perm=p.id_perm,
                    alcance=p.alcance
                )
            )

    session.commit()

    # 6. Retornar los permisos efectivos actualizados
    query = text("""
        SELECT * FROM general.vw_permisos_efectivos_usuario
        WHERE id_usu = :usuario_id
    """).params(usuario_id=id_usu)
    resultados = session.exec(query).mappings().all()
    return [VwPermisosEfectivosRead(**dict(r)) for r in resultados]


@router.delete("/usuario/{id_usu}/reset")
def resetear_permisos_usuario(
    id_usu: int,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("usuarios", "ACT", "TODO"))
):
    """
    Elimina TODOS los overrides del usuario (vuelve a heredar 100% del rol).
    """
    session.exec(
        text("""
            UPDATE general.permisos_usuario
            SET estatus = 'I'
            WHERE id_usu = :id_usu AND estatus = 'A'
        """).params(id_usu=id_usu)
    )
    session.commit()
    return {"message": "Permisos personalizados eliminados. Usuario hereda 100% del rol."}