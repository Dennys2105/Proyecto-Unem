from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.db_conection import engine, get_session
from app.router.roles_route import router as roles_router
from app.router.programas_router import router as programas_router
from app.router.municipios_router import router as municipios_router
from app.router.dias_router import router as dias_router
from app.router.ejes_formativos_router import router as ejes_router
from app.router.period_aca_router import router as period_aca_router
from app.router.auth_router import router as auth_router
from app.router.docente_router import router as docente_router
from app.router.disp_docente_rauter import router as disp_doc_router
from app.router.esp_fisico_router import router as esp_fisico_router
from app.router.materia_router import router as materia_router
from app.router.seccion_router import router as seccion_router
from app.router.estudiante_router import router as estudiante_router
from app.router.malla_curic_router import router as malla_router
from app.router.asig_carga_horaria_router import router as asig_router
from app.router.analytics import router as analytics_router
from app.router.notas_router import router as notas_router
from app.router.permisos_router import router as permisos_router

app = FastAPI(
    title="App Unem",
    description="Sistema para administrar y generar nuevos horarios con fastAPI",
    version="1.4.0"
)

#Dennys que coño hace esto vvvv

# ==========================================
# CONFIGURACIÓN DE CORS (CRÍTICO PARA EL FRONTEND)
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # Puerto por defecto de Vite (Frontend)
        "http://127.0.0.1:5173",
        "http://localhost:5174",      # Por si Vite cambia de puerto automáticamente
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,            # Permite el envío de cookies y headers de autenticación
    allow_methods=["*"],               # Permite todos los métodos HTTP (GET, POST, PUT, DELETE, OPTIONS, PATCH)
    allow_headers=["*"],               # Permite todos los headers (incluido 'Authorization' para el JWT)
)
# ==========================================

app.include_router(auth_router)
app.include_router(roles_router)
app.include_router(programas_router)
app.include_router(municipios_router)
app.include_router(dias_router)
app.include_router(ejes_router)
app.include_router(period_aca_router)
app.include_router(docente_router)
app.include_router(disp_doc_router)
app.include_router(esp_fisico_router)
app.include_router(materia_router)
app.include_router(seccion_router)
app.include_router(estudiante_router)
app.include_router(malla_router)
app.include_router(asig_router)
app.include_router(analytics_router)
app.include_router(notas_router)
app.include_router(permisos_router)