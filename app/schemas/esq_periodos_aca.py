from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional
from enum import Enum

class TipoPeriodo(str, Enum):
    TRIMESTRE = "Trimestre"
    SEMESTRE = "Semestre"

class PeriodoBase(BaseModel):
    nombre: str = Field(..., max_length=50)
    anio: int = Field(..., ge=2000, le=2100)
    numero_periodo: int = Field(..., gt=0, le=12)
    tipo: TipoPeriodo
    fecha_inicio: date
    fecha_fin: date

class PeriodoCreate(PeriodoBase):
    activo: bool = False  # Por defecto NO es vigente, se activa explícitamente

class PeriodoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)
    anio: Optional[int] = Field(None, ge=2000, le=2100)
    numero_periodo: Optional[int] = Field(None, gt=0, le=12)
    tipo: Optional[TipoPeriodo] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    activo: Optional[bool] = None
    estatus: Optional[str] = None  # Para el toggle Retirar/Reincorporar

class PeriodoResponse(PeriodoBase):
    id_per: int
    activo: bool
    estatus: str = "A"
    creado: datetime
    actualizar: datetime

    class Config:
        from_attributes = True