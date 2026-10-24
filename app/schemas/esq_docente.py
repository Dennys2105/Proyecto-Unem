from pydantic import BaseModel, Field
from datetime import datetime, time
from typing import Optional
from enum import Enum
from app.schemas.esq_municipios import MunicipiosResposive
from app.schemas.esq_auth import UsuarioResposive

class TipoContrato(str, Enum):
    ESTIPENDIO = "Estipendio"
    CONTRATADO = "Contratado"

class DocenteBase(BaseModel):
    id_usu: Optional[int] = None # [DATO ÚNICO]
    cedula: str = Field(..., max_length=20) # [DATO ÚNICO]
    nombre: str = Field(..., max_length=150)
    apellido: str = Field(..., max_length=150)
    id_mun: int
    especialidad: str = Field(..., max_length=150)
    tipo_contrato: TipoContrato
    horas_max_sem: int
    horas_asignadas: Optional[int] = 0
    horas_disponibles: int
    telefono: Optional[str] = Field(None, max_length=20)

class DocenteCreate(DocenteBase):
    pass

class DocenteReplace(DocenteBase):
    pass

class DocenteUpdate(BaseModel):
    #acordar si un docente puede actualizar su id_usuario
    cedula: Optional[str] = Field(None, max_length=20) # [DATO ÚNICO]
    nombre: Optional[str] = Field(None, max_length=150)
    apellido: Optional[str] = Field(None, max_length=150)
    id_mun: Optional[int] = None
    especialidad: Optional[str] = Field(None, max_length=150)
    tipo_contrato: Optional[TipoContrato] = Field(None, max_length=20)
    horas_max_sem: Optional[int] = None
    horas_asignadas: Optional[int] = None
    horas_disponibles: Optional[int] = None
    telefono: Optional[str] = Field(None, max_length=20)

class DocenteResponse(DocenteBase):
    id_doc: int
    id_usu: Optional[int] = None # [DATO ÚNICO]
    municipio: Optional[str] = None
    usuario: Optional[str] = None
    creado: datetime
    actualizar: datetime

    municipio: Optional[MunicipiosResposive] = None
    usuario: Optional[UsuarioResposive] = None

    class Config:
        from_attributes = True
