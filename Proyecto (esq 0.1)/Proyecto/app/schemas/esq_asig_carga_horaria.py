from pydantic import BaseModel, Field, valo
from datetime import datetime, time
from typing import Optional
from enum import Enum

class AsigCargaHorariaBase(BaseModel):
    id_doc: Optional[int] = None
    id_esp: Optional[int] = None
    id_malla: Optional[int] = None
    id_per: Optional[int] = None
    id_dia: int
    id_bloq: Optional[int] = None
    hora_inicio: time
    hora_fin: time
    tipo_actividad: Optional[str] = str.CARGA_ACADEMICA
    observaciones: Optional[str] = None

class AsigCargaHorariaCreate(AsigCargaHorariaBase):
    pass

class AsigCargaHorariaReplace(AsigCargaHorariaBase):
    pass

class AsigCargaHorariaUpdate(BaseModel):
    id_doc: Optional[int] = None
    id_esp: Optional[int] = None
    id_malla: Optional[int] = None
    id_per: Optional[int] = None
    id_dia: Optional[int] = None
    id_bloq: Optional[int] = None
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    tipo_actividad: Optional[str] = None
    observaciones: Optional[str] = None

class AsigCargaHorariaResponse(AsigCargaHorariaBase):
    id_asig: int
    creado: datetime
    actualizar: datetime
    class Config:
        from_attributes = True