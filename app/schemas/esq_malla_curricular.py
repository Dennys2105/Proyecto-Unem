from pydantic import BaseModel, Field,field_validator
from datetime import datetime, date
from typing import Optional
from enum import Enum
from app.schemas.esq_programas import ProgramasResposive
from app.schemas.esq_materias import MateriaResponse

class MallaCurricularBase(BaseModel):
    id_pro: int
    id_mat: int # [DATO ÚNICO] (Asociación única materia-programa o malla)
    trayecto: int = Field(..., gt=0, description="El Trayecto debe ser mayor a 0")
    periodo: int = Field(..., gt=0, description="El período debe ser mayor a 0")
    perequisito_id_mat: Optional[int] = None

class MallaCurricularCreate(MallaCurricularBase):
    pass

class MallaCurricularReplace(MallaCurricularBase):
    pass

class MallaCurricularUpdate(BaseModel):
    id_pro: Optional[int] = None
    id_mat: Optional[int] = None # [DATO ÚNICO]
    trayecto: Optional[int] = Field(default=None, gt=0, description="El Trayecto debe ser mayor a 0")
    periodo: Optional[int] = Field(default=None, gt=0, description="El período debe ser mayor a 0")
    perequisito_id_mat: Optional[int] = None

class MallaCurricularResponse(MallaCurricularBase):
    id_malla: int
    programa: Optional[ProgramasResposive] = None
    materia: Optional[str] = None
    prerequisito_materia: Optional[str] = None
    creado: datetime
    actualizar: datetime

    @field_validator('materia', mode='before')
    @classmethod
    def extraer_nombre_materia(cls, v):
        # Si SQLAlchemy pasa el objeto Materia completo, extraemos su nombre
        if hasattr(v, 'nombre'):
            return v.nombre
        return v

    @field_validator('prerequisito_materia', mode='before')
    @classmethod
    def extraer_nombre_prerequisito(cls, v):
        # Si SQLAlchemy pasa el objeto Materia del prerrequisito completo, extraemos su nombre
        if hasattr(v, 'nombre'):
            return v.nombre
        return v

    class Config:
        from_attributes = True