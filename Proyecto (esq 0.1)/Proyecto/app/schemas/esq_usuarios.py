from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class UsuarioBase(BaseModel):
    username: str = Field(..., max_length=255) # [DATO ÚNICO]
    id_rol: int

class UsuarioCreate(UsuarioBase):
    pass

class UsuarioReplace(UsuarioBase):
    pass

class UsuarioUpdate(BaseModel):
    username: Optional[str] = Field(None, max_length=255) # [DATO ÚNICO]
    id_rol: Optional[int] = None

class UsuarioResponse(UsuarioBase):
    id_usu: int
    rol: Optional[str] = None
    creado: datetime
    actualizar: datetime
    class Config:
        from_attributes = True