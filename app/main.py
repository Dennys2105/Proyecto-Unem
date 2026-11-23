from pathlib import Path

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

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
from app.router.exels_pdfs_router import router as exportar
from app.router.reportes_seguridad_router import router as reportes_seguridad_router
from app.router.analitica_router import router as analitica_router
from app.router.mi_docencia_router import router as mi_docencia_router
from app.dependencies.auth_deps import bloquear_rol

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

# Portal docente: exclusivo rol 4. Rutas administrativas: niegan rol 4.
app.include_router(auth_router)
app.include_router(mi_docencia_router)
no_docente = [Depends(bloquear_rol(4))]
app.include_router(roles_router, dependencies=no_docente)
app.include_router(programas_router, dependencies=no_docente)
app.include_router(municipios_router, dependencies=no_docente)
app.include_router(dias_router, dependencies=no_docente)
app.include_router(ejes_router, dependencies=no_docente)
app.include_router(period_aca_router, dependencies=no_docente)
app.include_router(docente_router, dependencies=no_docente)
app.include_router(disp_doc_router, dependencies=no_docente)
app.include_router(esp_fisico_router, dependencies=no_docente)
app.include_router(materia_router, dependencies=no_docente)
app.include_router(seccion_router, dependencies=no_docente)
app.include_router(estudiante_router, dependencies=no_docente)
app.include_router(malla_router, dependencies=no_docente)
app.include_router(asig_router, dependencies=no_docente)
app.include_router(analytics_router, dependencies=no_docente)
app.include_router(notas_router, dependencies=no_docente)
app.include_router(permisos_router, dependencies=no_docente)
app.include_router(exportar, dependencies=no_docente)
app.include_router(reportes_seguridad_router, dependencies=no_docente)
app.include_router(analitica_router, dependencies=no_docente)

# ============================================================
# SERVICIO DEL FRONTEND ESTÁTICO (para Opción A: .bat)
# ============================================================
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "unem-frontend" / "dist"
if FRONTEND_DIST.is_dir():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Derive API roots from the included routers so new endpoints are protected automatically.
    API_ROOTS = {
        r.path.split("/")[1]
        for r in app.routes
        if getattr(r, "path", "").startswith("/")
        and len(r.path.split("/")) > 1
        and r.path.split("/")[1]
    }

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str, request: Request):
        primera = full_path.split("/", 1)[0]

        if primera in API_ROOTS or full_path.startswith(("api", "docs", "redoc", "openapi.json")):
            if not full_path.endswith("/"):
                qs = request.url.query
                destino = f"/{full_path}/" + (f"?{qs}" if qs else "")
                return RedirectResponse(url=destino, status_code=307)
            return JSONResponse(status_code=404, content={"detail": "Not found"})

        frontend_root = FRONTEND_DIST.resolve()
        file_path = (frontend_root / full_path).resolve()
        if frontend_root in file_path.parents and file_path.is_file():
            return FileResponse(str(file_path))

        return FileResponse(str(frontend_root / "index.html"))
