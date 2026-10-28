from pydantic import BaseModel, model_validator, Field
from datetime import date, datetime
from enum import Enum
from typing import Optional

class TipoPeriodoEnum(str, Enum):
    TRIMESTRAL = "Trimestre"
    SEMESTRAL = "Semestre"

class BasePeriodos(BaseModel): 
    nombre: str
    anio: int
    numero_periodo: int
    tipo: TipoPeriodoEnum
    fecha_inicio: date
    fecha_fin: date
    activo: bool
    actualizar: datetime

    @model_validator(mode="after")
    def validar_fechas(self):
        if self.fecha_fin <= self.fecha_inicio:
            raise ValueError("La fecha de fin debe ser posterior a la fecha de inicio.")
        return self
    
    @model_validator(mode="after")
    def validar_numero_periodo(self):
        if self.tipo == TipoPeriodoEnum.TRIMESTRAL and self.numero_periodo not in [1,2,3,4,5,6,7,8,9,10,11,12]:
            raise ValueError("Para periodos trimestrales, el número de periodo debe ser del 1 al 12.")
        elif self.tipo == TipoPeriodoEnum.SEMESTRAL and self.numero_periodo not in [1,2,3,4,5,6,7,8]:
            raise ValueError("Para periodos semestrales, el número de periodo debe ser del 1 al 8.")
        return self

class PeriodoAcademicoBase(BaseModel):
    nombre: str = Field(..., max_length=50) # [DATO ÚNICO]
    anio: int
    numero_periodo: int
    tipo: TipoPeriodoEnum
    fecha_inicio: date
    fecha_fin: date
    activo: Optional[bool] = True

class PeriodoAcademicoCreate(PeriodoAcademicoBase):
    pass

class PeriodoAcademicoReplace(PeriodoAcademicoBase):
    pass

class PeriodoAcademicoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50) # [DATO ÚNICO]
    anio: Optional[int] = None
    numero_periodo: Optional[int] = None
    tipo: Optional[TipoPeriodoEnum] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    activo: Optional[bool] = None

class PeriodoAcademicoResponse(PeriodoAcademicoBase):
    id_per: int
    creado: datetime
    actualizar: datetime
    class Config:
        from_attributes = True

