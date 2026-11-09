from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, text
from app.config.db_conection import get_session 
from app.models.model_read_only import VwResumenEstadisticoRead,VwPermisosEfectivosRead

router = APIRouter(prefix="/api/v1/analytics", tags=["Analítica y Reportes"])

@router.get("/resumen", response_model=VwResumenEstadisticoRead)
def obtener_resumen_dashboard(session: Session = Depends(get_session)):
    # 1. Consulta SQL directa a la vista de la base de datos
    statement = text("SELECT * FROM general.vw_resumen_estadistico")
    
    # 2. Obtenemos la primera fila como un diccionario clave-valor
    resultado = session.exec(statement).mappings().first()
    
    if not resultado:
        return {}  # O maneja una excepción 404 si el dashboard no arroja datos
        
    # 3. Deserializamos el diccionario directamente en tu modelo Pydantic/SQLModel
    return VwResumenEstadisticoRead(**resultado)

@router.get("/permisos", response_model=list[VwPermisosEfectivosRead])
def obtener_permiso_usuarios(usuario_id: int, session: Session = Depends(get_session)):
    # 1. Consulta SQL segura utilizando bind parameters (:usuario_id) y operador `=`
    statement = text("""
        SELECT *
        FROM general.vw_permisos_efectivos_usuario 
        WHERE id_usu = :usuario_id
    """).params(usuario_id=usuario_id)
    
    # 2. Obtenemos TODAS las filas como un arreglo de diccionarios
    resultados = session.exec(statement).mappings().all()
    
    if not resultados:
        raise HTTPException(status_code=404, detail="No se encontraron permisos para este usuario.")
        
    # 3. Deserializamos cada fila en el modelo y devolvemos la lista
    return [VwPermisosEfectivosRead(**row) for row in resultados]