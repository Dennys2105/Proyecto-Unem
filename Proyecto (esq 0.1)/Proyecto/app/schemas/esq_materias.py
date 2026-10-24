from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional
from enum import Enum

class MateriaBase(BaseModel):
    codigo: str = Field(..., max_length=20) # [DATO ÚNICO]
    nombre: str = Field(..., max_length=250) # [DATO ÚNICO]
    id_eje: int
    unidades_creditos: int
    descripcion: Optional[str] = None

class MateriaCreate(MateriaBase):
    pass

class MateriaReplace(MateriaBase):
    pass

class MateriaUpdate(BaseModel):
    codigo: Optional[str] = Field(None, max_length=20) # [DATO ÚNICO]
    nombre: Optional[str] = Field(None, max_length=250) # [DATO ÚNICO]
    id_eje: Optional[int] = None
    unidades_creditos: Optional[int] = None
    descripcion: Optional[str] = None

class MateriaResponse(MateriaBase):
    id_mat: int
    eje_formativo: Optional[str] = None
    creado: datetime
    actualizar: datetime
    class Config:
        from_attributes = True