from pydantic import BaseModel, model_validator
from datetime import date, datetime
from enum import Enum

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

class PeriodoCreate(BasePeriodos):
    pass

class PeriodoUpdate(BasePeriodos):
    nombre: str | None= None
    anio: int | None = None
    numero_periodo: int | None = None
    tipo: TipoPeriodoEnum | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    activo: bool | None = None
    actualizar: date | None = None

class PeriodoResposive(BasePeriodos):
    id_per: int
    fecha_inicio: date
    creado: datetime
    estatus: str

class PeriodoRemplace(BasePeriodos):
    pass

