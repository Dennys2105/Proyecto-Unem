from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional
from enum import Enum

class MallaCurricularBase(BaseModel):
    id_pro: int
    id_mat: int # [DATO ÚNICO] (Asociación única materia-programa o malla)
    trayecto: int
    periodo: int
    prerequisito_id_mat: Optional[int] = None

class MallaCurricularCreate(MallaCurricularBase):
    pass

class MallaCurricularReplace(MallaCurricularBase):
    pass

class MallaCurricularUpdate(BaseModel):
    id_pro: Optional[int] = None
    id_mat: Optional[int] = None # [DATO ÚNICO]
    trayecto: Optional[int] = None
    periodo: Optional[int] = None
    prerequisito_id_mat: Optional[int] = None

class MallaCurricularResponse(MallaCurricularBase):
    id_malla: int
    programa: Optional[str] = None
    materia: Optional[str] = None
    prerequisito_materia: Optional[str] = None
    creado: datetime
    actualizar: datetime
    class Config:
        from_attributes = True