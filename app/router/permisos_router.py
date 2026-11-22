from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, text
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.dependencies.auth_deps import verificar_permiso, obtener_usuario_actual
from app.dependencies.session_auditable import get_session_auditable as get_session

from app.models.model_read_only import VwPermisosEfectivosRead
from app.service.auth_service import get_password_hash

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
    id_doc: Optional[int] = None
    docente_vinculado: Optional[str] = None


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
    incluir_inactivos: bool = Query(False, description="Incluir usuarios desactivados"),
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("usuarios", "LEC", "LIM"))
):
    """Lista los usuarios con su rol asignado (activos por defecto)."""
    sql = """
        SELECT u.id_usu, u.username, u.id_rol, r.rol, u.estatus,
               d.id_doc,
               CASE WHEN d.id_doc IS NOT NULL
                    THEN d.cedula || ' · ' || d.nombre || ' ' || d.apellido
               END AS docente_vinculado
        FROM general.usuarios u
        JOIN general.roles r ON r.id_rol = u.id_rol
        LEFT JOIN personas.docentes d ON d.id_usu = u.id_usu
    """
    if not incluir_inactivos:
        sql += " WHERE u.estatus = 'A'"
    sql += " ORDER BY u.estatus, u.username"
    resultados = session.exec(text(sql)).mappings().all()
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


@router.put("/usuarios/{id_usu}/permisos", summary="Actualizar permisos personalizados de un usuario",
            response_model=List[VwPermisosEfectivosRead])
@router.put("/usuario/{id_usu}", response_model=List[VwPermisosEfectivosRead], include_in_schema=False)
def actualizar_permisos_usuario(
    id_usu: int,
    payload: PermisosUsuarioUpdate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    """
    Guarda la matriz de permisos personalizados (overrides) de un usuario.
    - SOLO el Administrador (rol 1) puede modificar permisos personalizados.
    - El Administrador PUEDE otorgar por encima del rol base (queda 'Personalizado').
    - No se permiten overrides sobre otro Administrador (acceso total por diseño).
    - Idempotente: upsert sobre la UNIQUE (id_usu, id_mod, id_perm).
    """
    # 0. Solo ADMIN puede editar permisos personalizados
    if usuario_actual.get("rol") != 1:
        raise HTTPException(
            status_code=403,
            detail="Acción exclusiva del Administrador: solo el administrador puede modificar la matriz de permisos de un usuario."
        )

    # 1. Verificar usuario destino
    usuario = session.exec(
        text("SELECT id_rol FROM general.usuarios WHERE id_usu = :id AND estatus = 'A'")
        .params(id=id_usu)
    ).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 2. Proteger al Administrador: nunca se personaliza ni se restringe
    if usuario[0] == 1:
        raise HTTPException(
            status_code=400,
            detail="El Administrador tiene acceso total por diseño: no admite permisos personalizados."
        )

    # 3. Validar alcances y catálogo (ya NO se limita contra el rol base)
    ALCANCES_VALIDOS = {'NAD', 'SP', 'LIM', 'TODO'}
    for p in payload.permisos:
        if p.alcance not in ALCANCES_VALIDOS:
            raise HTTPException(
                status_code=400,
                detail=f"Alcance inválido: '{p.alcance}'. Use TODO, SP, LIM o NAD."
            )
        valido = session.exec(
            text("""
                SELECT 1 FROM general.modulos m, general.permisos pe
                WHERE m.id_mod = :m AND pe.id_perm = :p AND m.estatus = 'A'
            """).params(m=p.id_mod, p=p.id_perm)
        ).first()
        if not valido:
            raise HTTPException(
                status_code=400,
                detail=f"Módulo {p.id_mod} o permiso {p.id_perm} inexistente o inactivo."
            )

    # 4. Desactivar los overrides actuales (histórico)
    session.exec(
        text("""
        UPDATE general.permisos_usuario
        SET estatus = 'I'
        WHERE id_usu = :id_usu AND estatus = 'A'
        """).params(id_usu=id_usu)
    )

    # 5. Upsert idempotente de los nuevos overrides
    for p in payload.permisos:
        session.exec(
            text("""
            INSERT INTO general.permisos_usuario (id_usu, id_mod, id_perm, alcance, estatus)
            VALUES (:id_usu, :id_mod, :id_perm, :alcance, 'A')
            ON CONFLICT (id_usu, id_mod, id_perm)
            DO UPDATE SET alcance = EXCLUDED.alcance, estatus = 'A'
            """).params(id_usu=id_usu, id_mod=p.id_mod, id_perm=p.id_perm, alcance=p.alcance)
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
    """Elimina TODOS los overrides del usuario (vuelve a heredar 100% del rol). Solo ADMIN."""
    actor = session.exec(
        text("SELECT id_rol FROM general.usuarios WHERE id_usu = :i")
        .params(i=usuario_actual.get("id_usu"))
    ).first()
    if not actor or actor[0] != 1:
        raise HTTPException(status_code=403, detail="Solo el Administrador puede restaurar permisos.")

    destino = session.exec(
        text("SELECT id_rol FROM general.usuarios WHERE id_usu = :id").params(id=id_usu)
    ).first()
    if not destino:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if destino[0] == 1:
        raise HTTPException(
            status_code=400,
            detail="El Administrador no tiene permisos personalizados que restaurar."
        )

    session.exec(
        text("""
        UPDATE general.permisos_usuario
        SET estatus = 'I'
        WHERE id_usu = :id_usu AND estatus = 'A'
        """).params(id_usu=id_usu)
    )

    session.commit()

    return {"message": "Permisos personalizados eliminados. Usuario hereda 100% del rol."}

# ============================================================
# GESTIÓN DE USUARIOS (crear / editar / contraseña) — Lote 5b
# ============================================================
class UsuarioCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    id_rol: int
    id_doc: Optional[int] = None  # Solo obligatorio cuando id_rol = 4 (DOCENTE)

class UsuarioPatch(BaseModel):
    id_rol: Optional[int] = None
    estatus: Optional[str] = None

class PasswordReset(BaseModel):
    password: str = Field(..., min_length=8, max_length=128)


@router.post("/usuarios", response_model=UsuarioSimple, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    datos: UsuarioCreate,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("usuarios", "CRE", "TODO")),
):
    username = datos.username.strip()
    if " " in username:
        raise HTTPException(status_code=400, detail="El username no puede contener espacios.")
    if session.exec(text("SELECT 1 FROM general.usuarios WHERE lower(username) = lower(:u)").params(u=username)).first():
        raise HTTPException(status_code=400, detail="Ese username ya existe.")
    if session.exec(text("SELECT 1 FROM general.usuarios WHERE lower(email) = lower(:e)").params(e=datos.email)).first():
        raise HTTPException(status_code=400, detail="Ese email ya está registrado.")
    rol = session.exec(text("SELECT rol FROM general.roles WHERE id_rol = :r AND estatus = 'A'").params(r=datos.id_rol)).first()
    if not rol:
        raise HTTPException(status_code=400, detail="El rol seleccionado no existe o está inactivo.")
    if datos.id_rol == 5:
        raise HTTPException(status_code=400, detail="El rol Estudiante está reservado: los estudiantes no acceden al sistema.")

    if datos.id_rol == 4:
        if datos.id_doc is None:
            raise HTTPException(status_code=400, detail="Para un usuario con rol Docente debes seleccionar una ficha de docente.")
        doc = session.exec(text("""
            SELECT id_doc, cedula, nombre, apellido, id_usu
            FROM personas.docentes WHERE id_doc = :d AND estatus = 'A'
        """).params(d=datos.id_doc)).first()
        if not doc:
            raise HTTPException(status_code=400, detail="El docente seleccionado no existe o está retirado.")
        if doc[4] is not None:
            raise HTTPException(
                status_code=400,
                detail=f"El docente {doc[2]} {doc[3]} ({doc[1]}) ya está vinculado a otro usuario. "
                       "Desvincúlalo primero o elige otro."
            )

    nuevo = session.exec(text("""
        INSERT INTO general.usuarios (username, email, id_rol, estatus)
        VALUES (:u, :e, :r, 'A')
        RETURNING id_usu
    """).params(u=username, e=datos.email, r=datos.id_rol)).first()
    id_usu = nuevo[0]
    session.exec(text("""
        INSERT INTO general.credenciales (id_usu, password_hash, intentos_fallidos)
        VALUES (:i, :h, 0)
    """).params(i=id_usu, h=get_password_hash(datos.password)))

    if datos.id_rol == 4 and datos.id_doc is not None:
        session.exec(text("""
            UPDATE personas.docentes SET id_usu = :u WHERE id_doc = :d
        """).params(u=id_usu, d=datos.id_doc))

    session.commit()
    return UsuarioSimple(id_usu=id_usu, username=username, id_rol=datos.id_rol, rol=rol[0], estatus='A')


@router.patch("/usuarios/{id_usu}", response_model=UsuarioSimple)
def editar_usuario(
    id_usu: int,
    datos: UsuarioPatch,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("usuarios", "ACT", "TODO")),
):
    actual = session.exec(text(
        "SELECT id_usu, username, id_rol, estatus FROM general.usuarios WHERE id_usu = :i"
    ).params(i=id_usu)).first()
    if not actual:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    yo = usuario_actual.get("id_usu") or usuario_actual.get("id")
    if yo == id_usu and (datos.estatus == 'I' or (datos.id_rol is not None and datos.id_rol != actual[2])):
        raise HTTPException(status_code=400, detail="No puedes desactivarte ni cambiar tu propio rol.")

    nuevo_rol = datos.id_rol if datos.id_rol is not None else actual[2]
    nuevo_estatus = datos.estatus if datos.estatus is not None else actual[3]

    if nuevo_rol != actual[2]:
        if not session.exec(text("SELECT 1 FROM general.roles WHERE id_rol = :r AND estatus = 'A'").params(r=nuevo_rol)).first():
            raise HTTPException(status_code=400, detail="El rol seleccionado no existe o está inactivo.")
        if nuevo_rol == 5:
            raise HTTPException(status_code=400, detail="El rol Estudiante está reservado.")

    if actual[2] == 1 and actual[3] == 'A' and (nuevo_rol != 1 or nuevo_estatus != 'A'):
        admins = session.exec(text("SELECT COUNT(*) FROM general.usuarios WHERE id_rol = 1 AND estatus = 'A'")).first()
        if admins and int(admins[0]) <= 1:
            raise HTTPException(status_code=400, detail="Debe quedar al menos un administrador activo.")

    session.exec(text("UPDATE general.usuarios SET id_rol = :r, estatus = :e WHERE id_usu = :i").params(r=nuevo_rol, e=nuevo_estatus, i=id_usu))
    session.commit()
    fila = session.exec(text("""
        SELECT u.id_usu, u.username, u.id_rol, r.rol, u.estatus
        FROM general.usuarios u JOIN general.roles r ON r.id_rol = u.id_rol
        WHERE u.id_usu = :i
    """).params(i=id_usu)).mappings().first()
    return UsuarioSimple(**dict(fila))


@router.post("/usuarios/{id_usu}/password")
def resetear_password(
    id_usu: int,
    datos: PasswordReset,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("usuarios", "ACT", "TODO")),
):
    cred = session.exec(text("SELECT id_cre FROM general.credenciales WHERE id_usu = :i").params(i=id_usu)).first()
    if not cred:
        raise HTTPException(status_code=404, detail="El usuario no tiene credenciales.")
    session.exec(text("""
        UPDATE general.credenciales
        SET password_hash = :h, intentos_fallidos = 0, bloqueado_hasta = NULL
        WHERE id_usu = :i
    """).params(h=get_password_hash(datos.password), i=id_usu))
    session.commit()
    return {"message": "Contraseña actualizada y cuenta desbloqueada."}


# ============================================================
# CATÁLOGO DE DOCENTES SIN VINCULAR (para el selector de creación)
# ============================================================
@router.get("/docentes-sin-vinculo")
def docentes_sin_vinculo(
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("usuarios", "LEC", "TODO")),
):
    """Docentes activos que NO tienen un usuario vinculado (id_usu IS NULL)."""
    rows = session.exec(text("""
        SELECT id_doc, cedula, nombre, apellido
        FROM personas.docentes
        WHERE estatus = 'A' AND id_usu IS NULL
        ORDER BY apellido, nombre
    """)).all()
    return [
        {"id_doc": r[0], "cedula": r[1], "nombre": f"{r[2]} {r[3]}", "cedula_nombre": f"{r[1]} · {r[2]} {r[3]}"}
        for r in rows
    ]


# ============================================================
# VINCULAR / DESVINCULAR DOCENTE a un usuario YA EXISTENTE
# ============================================================
@router.patch("/usuarios/{id_usu}/vincular-docente")
def vincular_docente(
    id_usu: int,
    id_doc: Optional[int] = None,
    session: Session = Depends(get_session),
    usuario_actual: dict = Depends(verificar_permiso("usuarios", "ACT", "TODO")),
):
    """Vincula un usuario existente a una ficha de docente (o lo desvincula si id_doc es None)."""
    usu = session.exec(text(
        "SELECT id_usu, id_rol, username FROM general.usuarios WHERE id_usu = :i"
    ).params(i=id_usu)).first()
    if not usu:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    if usu[1] != 4:
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden vincular docentes a usuarios con rol DOCENTE."
        )

    if id_doc is None:
        session.exec(text("""
            UPDATE personas.docentes SET id_usu = NULL WHERE id_usu = :u
        """).params(u=id_usu))
        session.commit()
        return {"message": f"Usuario {usu[2]} desvinculado de cualquier ficha de docente."}

    doc = session.exec(text("""
        SELECT id_doc, cedula, nombre, apellido, id_usu
        FROM personas.docentes WHERE id_doc = :d AND estatus = 'A'
    """).params(d=id_doc)).first()
    if not doc:
        raise HTTPException(status_code=400, detail="El docente seleccionado no existe o está retirado.")
    if doc[4] is not None and doc[4] != id_usu:
        raise HTTPException(
            status_code=400,
            detail=f"El docente {doc[2]} {doc[3]} ya está vinculado a otro usuario."
        )

    session.exec(text("UPDATE personas.docentes SET id_usu = NULL WHERE id_usu = :u").params(u=id_usu))
    session.exec(text("UPDATE personas.docentes SET id_usu = :u WHERE id_doc = :d").params(u=id_usu, d=id_doc))
    session.commit()
    return {"message": f"Usuario {usu[2]} vinculado al docente {doc[2]} {doc[3]} ({doc[1]})."}