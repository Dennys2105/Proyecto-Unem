import os
from typing import Generator

from sqlmodel import create_engine, Session
from dotenv import load_dotenv
from sqlalchemy.exc import SQLAlchemyError

load_dotenv()

POSTGRES_SERVER = os.getenv("POSTGRES_SERVER")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")

url = (
    f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

engine = create_engine(url, echo=True)


def get_session() -> Generator[Session, None, None]:
    """Sesión neutra para rutas públicas (login, reportes, analytics)."""
    with Session(engine) as session:
        try:
            yield session
        except SQLAlchemyError:
            session.rollback()
            raise