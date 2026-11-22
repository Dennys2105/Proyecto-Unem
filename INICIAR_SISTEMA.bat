@echo off
chcp 65001 >nul
title UNEM Tachira - Sistema de Gestion Academica
color 0A
setlocal

set "ROOT=%~dp0"
set "VENV_ACTIVATE=%ROOT%.venv\Scripts\activate.bat"

echo ============================================================
echo   UNEM TACHIRA - Sistema de Gestion Academica
echo   Iniciando servicios...
echo ============================================================
echo.

if not exist "%ROOT%app\main.py" (
    echo   [ERROR] No se encontro app\main.py en la raiz del proyecto.
    pause
    exit /b 1
)

if not exist "%VENV_ACTIVATE%" (
    echo   [ERROR] No se encontro el entorno virtual .venv.
    echo   Crea el entorno e instala las dependencias de requirements.txt.
    pause
    exit /b 1
)

if not exist "%ROOT%unem-frontend\dist\index.html" (
    echo   [ERROR] No se encontro el frontend compilado.
    echo   Ejecuta "npm run build" dentro de unem-frontend y vuelve a iniciar.
    pause
    exit /b 1
)

echo [1/3] Verificando PostgreSQL...
call :check_postgres
if errorlevel 1 (
    echo   PostgreSQL no esta disponible. Intentando iniciar el servicio...
    net start postgresql-x64-16 >nul 2>&1
    if errorlevel 1 goto postgres_start_failed
    timeout /t 3 /nobreak >nul
    call :check_postgres
    if errorlevel 1 goto postgres_not_ready
    echo   PostgreSQL iniciado correctamente.
) else (
    echo   PostgreSQL ya esta corriendo. OK
)
echo.

echo [2/3] Iniciando backend (FastAPI + frontend estatico)...
start "UNEM Backend" cmd /k "cd /d ""%ROOT%"" && call ""%VENV_ACTIVATE%"" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 4 /nobreak >nul
echo.

echo [3/3] Abriendo el navegador...
start "" "http://localhost:8000"

echo.
echo ============================================================
echo   Sistema iniciado.
echo   URL: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo   Para detenerlo, cierra la ventana "UNEM Backend".
echo ============================================================
echo.
pause
exit /b 0

:postgres_start_failed
echo   [ERROR] No se pudo iniciar PostgreSQL.
echo   Asegurate de tener PostgreSQL 16 instalado y ejecuta este archivo como administrador.
pause
exit /b 1

:postgres_not_ready
echo   [ERROR] El servicio inicio, pero PostgreSQL no respondio en localhost:5432.
pause
exit /b 1

:check_postgres
where pg_isready >nul 2>&1
if not errorlevel 1 goto check_postgres_with_client
powershell -NoProfile -Command "$client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('localhost', 5432); exit 0 } catch { exit 1 } finally { $client.Dispose() }" >nul 2>&1
exit /b %errorlevel%

:check_postgres_with_client
pg_isready -h localhost -p 5432 >nul 2>&1
exit /b %errorlevel%
