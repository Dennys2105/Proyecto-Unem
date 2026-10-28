from pydantic import BaseModel, Field
from datetime import datetime, time
from typing import Optional, Dict, Any

class DisponibilidadDocenteBase(BaseModel):
    id_doc: int
    id_dia: int
    hora_inicio: time
    hora_fin: time

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
    docente: Optional[str] = None
    class Config:
        from_attributes = True