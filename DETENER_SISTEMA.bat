@echo off
chcp 65001 >nul
title UNEM Tachira - Detener sistema
color 0C

echo Deteniendo el backend...
taskkill /FI "WINDOWTITLE eq UNEM Backend" /IM cmd.exe /T /F >nul 2>&1
if errorlevel 1 (
    echo   No se encontro el proceso del backend (ya estaba detenido).
) else (
    echo   Backend detenido correctamente.
)

echo.
echo Sistema detenido. Puedes cerrar esta ventana.
pause
