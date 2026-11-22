from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date
from typing import Optional
from enum import Enum
from app.schemas.esq_eje_formativo import EjeResposive

class MateriaBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=20, pattern=r"^[A-Z0-9._-]+$")
    nombre: str = Field(..., min_length=1, max_length=250)
    id_eje: int = Field(..., gt=0, le=32767)
    unidades_creditos: int = Field(..., ge=1, le=32767)
    descripcion: Optional[str] = None

    @field_validator("codigo", mode="before")
    @classmethod
    def normalizar_codigo(cls, value):
        return value.strip().upper() if isinstance(value, str) else value

    @field_validator("nombre", mode="before")
    @classmethod
    def normalizar_nombre(cls, value):
        return value.strip() if isinstance(value, str) else value

class MateriaCreate(MateriaBase):
    pass

class MateriaReplace(MateriaBase):
    pass

class MateriaUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=1, max_length=20, pattern=r"^[A-Z0-9._-]+$")
    nombre: Optional[str] = Field(None, min_length=1, max_length=250)
    id_eje: Optional[int] = Field(None, gt=0, le=32767)
    unidades_creditos: Optional[int] = Field(None, ge=1, le=32767)
    descripcion: Optional[str] = None

    @field_validator("codigo", mode="before")
    @classmethod
    def normalizar_codigo(cls, value):
        return value.strip().upper() if isinstance(value, str) else value

    @field_validator("nombre", mode="before")
    @classmethod
    def normalizar_nombre(cls, value):
        return value.strip() if isinstance(value, str) else value

class MateriaResponse(MateriaBase):
    id_mat: int
    eje_formativo: Optional[EjeResposive] = None
    creado: datetime
    actualizar: datetime
    class Config:
        from_attributes = True