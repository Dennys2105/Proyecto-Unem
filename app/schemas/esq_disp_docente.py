from pydantic import BaseModel, Field, model_validator
from datetime import datetime, time
from typing import Optional, Dict, Any
from app.models.unem_db_models import Docente

class DisponibilidadDocenteBase(BaseModel):
    id_doc: int
    id_dia: int
    hora_inicio: time
    hora_fin: time
    
    @model_validator(mode="after")
    def verificar_rango_horario(self):
        if self.hora_inicio >= self.hora_fin:
            raise ValueError("La hora de inicio debe ser menor que la hora de fin.")
        return self

class DisponibilidadDocenteCreate(DisponibilidadDocenteBase):
    pass

class DisponibilidadDocenteReplace(DisponibilidadDocenteBase):
    pass

class DisponibilidadDocenteUpdate(BaseModel):
    id_doc: Optional[int] = None
    id_dia: Optional[int] = None
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None

class DisponibilidadDocenteResponse(DisponibilidadDocenteBase):
    id_disp: int
    docente: Optional[Docente] = None
    class Config:
        from_attributes = True