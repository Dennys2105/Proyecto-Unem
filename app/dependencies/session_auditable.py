from typing import Generator

from fastapi import Request, Depends
from sqlmodel import Session, text
from sqlalchemy.exc import SQLAlchemyError

from app.config.db_conection import engine
from app.dependencies.auth_deps import obtener_usuario_actual


def get_session_auditable(
    request: Request,
    usuario_actual: dict = Depends(obtener_usuario_actual),
) -> Generator[Session, None, None]:
    """
    Sesión para operaciones de escritura. Inyecta usuario e IP como
    variables de sesión locales a la transacción (set_config(..., true)),
    de modo que fn_auditoria_general() registre el autor real del cambio.
    """
    with Session(engine) as session:
        try:
            id_usu = usuario_actual.get("id") if usuario_actual else None
            if id_usu is not None:
                session.exec(
                    text("SELECT set_config('app.current_user_id', :u, true)"),
                    params={"u": str(int(id_usu))},
                )

            forwarded = request.headers.get("x-forwarded-for")
            ip = forwarded.split(",")[0].strip() if forwarded else None
            if not ip and request.client is not None:
                ip = request.client.host
            if ip:
                session.exec(
                    text("SELECT set_config('app.client_ip', :ip, true)"),
                    params={"ip": ip[:45]},
                )

            yield session
        except SQLAlchemyError:
            session.rollback()
            raise