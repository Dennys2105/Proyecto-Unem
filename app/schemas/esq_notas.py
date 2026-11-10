from pydantic import BaseModel,model_validator
from datetime import datetime
from enum import Enum

class TiposEvaluacion(str,Enum):
    Parcial_1 = "Parcial 1"
    Parcial_2 = "Parcial 2"
    Parcial_3 = "Parcial 3"
    Final = "Final"
    Recuperacion = "Recuperación"
    Trabajos = "Trabajo"

class BaseNotas(BaseModel):
    id_est:int #UNIQUE
    id_malla: int #UNIQUE
    id_per: int #UNIQUE
    nota: float
    tipo_evaluacion: TiposEvaluacion
    observaciones: str
    fecha_registro: datetime
    
    @model_validator(mode="after")
    def validar_fechas(self):
        if self.nota < 0 and self.nota > 20:
            raise ValueError("La nota debe tener un rango entre 0 y 20")
        return self

class NotasCreate(BaseNotas):
    pass

class NotasUpdate(BaseModel):
    id_est:int | None
    id_malla: int | None
    id_per: int | None
    nota: float | None
    tipo_evaluacion: TiposEvaluacion | None
    observaciones: str | None
    fecha_registro: datetime | None
    
    @model_validator(mode="after")
    def validar_fechas(self):
        if self.nota < 0 and self.nota > 20:
            raise ValueError("La nota debe tener un rango entre 0 y 20")
        return self

class NotasResponcive(BaseModel):
    nota: float
    tipo_evaluacion: TiposEvaluacion
    observaciones: str
    fecha_registro: datetime