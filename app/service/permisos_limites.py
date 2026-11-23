"""Permisos efectivos: ningún override puede superar al rol base.

La BD 4.3 almacena los máximos en general.permisos_rol. El frontend es
informativo; las comprobaciones de seguridad se efectúan en el servidor.
"""
from sqlmodel import Session, text

JERARQUIA = {"NAD": 0, "SP": 1, "LIM": 2, "TODO": 3}


def alcance_limitado(otorgado: str | None, maximo: str | None) -> str:
    """El menor privilegio (desconocidos = NAD)."""
    a = otorgado if otorgado in JERARQUIA else "NAD"
    b = maximo if maximo in JERARQUIA else "NAD"
    return a if JERARQUIA[a] <= JERARQUIA[b] else b


def maximo_politica_rol(rol: int, modulo: str, maximo: str | None) -> str:
    """Restricciones institucionales independientes de permisos personalizados."""
    if rol != 1 and modulo == "usuarios":
        return "NAD"
    if rol == 2 and modulo in {"notas", "secciones"}:
        return "NAD"
    if rol == 3 and modulo in {"asig_carga", "dias"}:
        return "NAD"
    # Los docentes trabajan exclusivamente desde /mi-docencia.
    if rol == 4:
        return "NAD"
    return maximo if maximo in JERARQUIA else "NAD"


def consultar_matriz(session: Session, usuario_id: int) -> list[dict]:
    """Matriz viva: herencia + override, limitada al rol. Una fila por módulo/acción."""
    rows = session.exec(text("""
        SELECT u.id_usu, u.username, u.id_rol, r.rol,
               m.codigo AS modulo, m.nombre AS modulo_nombre,
               p.codigo AS permiso, p.nombre AS permiso_nombre,
               COALESCE(pr.alcance, 'NAD') AS alcance_maximo,
               COALESCE(pu.alcance, pr.alcance, 'NAD') AS alcance_solicitado,
               CASE WHEN pu.alcance IS NOT NULL THEN 'Personalizado'
                    ELSE 'Heredado del rol' END AS origen
        FROM general.usuarios u
        JOIN general.roles r ON r.id_rol = u.id_rol AND r.estatus = 'A'
        CROSS JOIN general.modulos m
        CROSS JOIN general.permisos p
        LEFT JOIN general.permisos_rol pr
          ON pr.id_rol = u.id_rol AND pr.id_mod = m.id_mod
         AND pr.id_perm = p.id_perm AND pr.estatus = 'A'
        LEFT JOIN general.permisos_usuario pu
          ON pu.id_usu = u.id_usu AND pu.id_mod = m.id_mod
         AND pu.id_perm = p.id_perm AND pu.estatus = 'A'
        WHERE u.id_usu = :usuario_id AND u.estatus = 'A' AND m.estatus = 'A'
    """).params(usuario_id=usuario_id)).mappings().all()
    respuesta = []
    for raw in rows:
        fila = dict(raw)
        limite = maximo_politica_rol(fila['id_rol'], fila['modulo'], fila['alcance_maximo'])
        fila['alcance_maximo'] = limite
        fila['alcance_efectivo'] = alcance_limitado(fila.pop('alcance_solicitado'), limite)
        respuesta.append(fila)
    return respuesta


def scopes_del_usuario(session: Session, usuario_id: int) -> dict[str, str]:
    return {f"{r['modulo']}:{r['permiso']}": r['alcance_efectivo']
            for r in consultar_matriz(session, usuario_id)}
