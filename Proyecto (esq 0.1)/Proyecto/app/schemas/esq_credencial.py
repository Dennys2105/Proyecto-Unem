from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class CredencialBase(BaseModel):
    password_hash: str = Field(..., max_length=255)
    intentos_fallidos: Optional[int] = 0

class CredencialCreate(CredencialBase):
    id_usu: int # [DATO ÚNICO]

class CredencialResponse(CredencialBase):
    id_cre: int
    id_usu: int # [DATO ÚNICO]
    usuario: Optional[str] = None
    ultimo_acceso: Optional[datetime] = None
    bloqueado_hasta: Optional[datetime] = None
    class Config:
        from_attributes = True