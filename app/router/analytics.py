from fastapi import APIRouter, Depends
from sqlmodel import Session, text
from app.config.db_conection import get_session  # Ajusta según tu importación de sesión
from app.models.model_read_only import VwResumenEstadisticoRead

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

