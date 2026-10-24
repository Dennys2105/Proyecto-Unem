from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional
from enum import Enum

class SeccionBase(BaseModel):
    codigo: str = Field(..., max_length=20) # [DATO ÚNICO]
    id_pro: int
    trayecto: int
    periodo: int
    capacidad_maxima: int

class SeccionCreate(SeccionBase):
    pass

class SeccionReplace(SeccionBase):
    pass

class SeccionUpdate(BaseModel):
    codigo: Optional[str] = Field(None, max_length=20) # [DATO ÚNICO]
    id_pro: Optional[int] = None
    trayecto: Optional[int] = None
    periodo: Optional[int] = None
    capacidad_maxima: Optional[int] = None

class SeccionResponse(SeccionBase):
    id_sec: int
    programa: Optional[str] = None
    creado: datetime
    actualizar: datetime
    class Config:
        from_attributes = True