from pydantic import BaseModel, Field
from datetime import datetime, time
from typing import Optional
from enum import Enum

class BloqueHorarioBase(BaseModel):
    nombre: str = Field(..., max_length=50)
    hora_inicio: time
    hora_fin: time
    tipo: str

class BloqueHorarioCreate(BloqueHorarioBase):
    pass

class BloqueHorarioReplace(BloqueHorarioBase):
    pass

class BloqueHorarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50) # [DATO ÚNICO]
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    tipo: Optional[str] = None

class BloqueHorarioResponse(BloqueHorarioBase):
    id_bloq: int
    class Config:
        from_attributes = True