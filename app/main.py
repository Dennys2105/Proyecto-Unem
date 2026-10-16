from fastapi import FastAPI

from app.config.db_conection import engine, get_session
from app.router.roles_route import router as roles_router
from app.router.programas_router import router as programas_router
from app.router.municipios_router import router as municipios_router
from app.router.dias_router import router as dias_router
from app.router.ejes_formativos_router import router as ejes_router
from app.router.period_aca_router import router as period_aca_router

app = FastAPI(
    title= "App Unem",
    description="Sistema para administrar y generar nuevos horarios con fastAPI",
    version="1.3.0"
)

app.include_router(roles_router)
app.include_router(programas_router)
app.include_router(municipios_router)
app.include_router(dias_router)
app.include_router(ejes_router)
app.include_router(period_aca_router)