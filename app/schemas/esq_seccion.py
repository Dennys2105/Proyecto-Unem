from pydantic import BaseModel, Field, model_validator
from datetime import datetime, date
from typing import Optional
from enum import Enum
from app.schemas.esq_programas import ProgramasResposive

class SeccionBase(BaseModel):
    codigo: str = Field(..., max_length=20) # [DATO ÚNICO]
    id_pro: int
    trayecto: int = Field(..., gt=0, description="El trayecto debe ser mayor a 0")
    periodo: int = Field(..., gt=0, description="El período debe ser mayor a 0")
    capacidad_maxima: int = Field(40, gt=0, description="La capacidad debe ser mayor a 0")

class SeccionCreate(SeccionBase):
    pass

class SeccionReplace(SeccionBase):
    pass

class SeccionUpdate(BaseModel):
    codigo: Optional[str] = Field(None, max_length=20) # [DATO ÚNICO]
    trayecto: int = Field(..., gt=0, description="El trayecto debe ser mayor a 0")
    periodo: int = Field(..., gt=0, description="El período debe ser mayor a 0")
    capacidad_maxima: int = Field(40, gt=0, description="La capacidad debe ser mayor a 0")
    capacidad_maxima: Optional[int] = Field(40, gt=0, description="La capacidad debe ser mayor a 0")

class SeccionResponse(SeccionBase):
    id_sec: int
    programa: Optional[ProgramasResposive] = None
    creado: datetime
    actualizar: datetime
    class Config:
        from_attributes = True
