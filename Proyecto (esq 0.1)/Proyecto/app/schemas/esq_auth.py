from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class AuditoriaMovimientoResponse(BaseModel):
    id_aud: int
    id_usu: Optional[int] = None
    usuario: Optional[str] = None
    tabla_mod: str
    tipo_accion: str
    val_antes: Optional[Dict[str, Any]] = None
    val_despues: Optional[Dict[str, Any]] = None
    fecha_hora: datetime
    dir_ip: Optional[str] = None
    class Config:
        from_attributes = True