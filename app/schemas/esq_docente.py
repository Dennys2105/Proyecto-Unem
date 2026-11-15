from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
from enum import Enum
from app.schemas.esq_municipios import MunicipiosResposive
from app.schemas.esq_auth import UsuarioResposive
from app.dependencies.pruebas_optimizacion import validar_cedula_venezolana, validar_telefono_venezolano

class TipoContrato(str, Enum):
    ESTIPENDIO = "Estipendio"
    CONTRATADO = "Contratado"

class DocenteBase(BaseModel):
    id_usu: Optional[int] = None
    cedula: str = Field(..., max_length=20)
    nombre: str = Field(..., max_length=150)
    apellido: str = Field(..., max_length=150)
    id_mun: int
    especialidad: str = Field(..., max_length=150)   # ✅ TEXTO obligatorio (como en la BD)
    tipo_contrato: TipoContrato
    horas_max_sem: int = Field(..., gt=0, le=40)
    telefono: Optional[str] = Field(None, max_length=20)
    observaciones: Optional[str] = None

    @field_validator("cedula")
    @classmethod
    def validar_cedula(cls, v: str) -> str:
        validar_cedula_venezolana(v)
        return v

    @field_validator("telefono")
    @classmethod
    def validar_telefono(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return validar_telefono_venezolano(v)
        return v

class DocenteCreate(DocenteBase):
    pass  # ✅ No incluye horas_asignadas ni horas_disponibles (los pone el trigger)

class DocenteReplace(DocenteBase):
    pass

class DocenteUpdate(BaseModel):
    cedula: Optional[str] = Field(None, max_length=20)
    nombre: Optional[str] = Field(None, max_length=150)
    apellido: Optional[str] = Field(None, max_length=150)
    id_mun: Optional[int] = None
    especialidad: Optional[str] = Field(None, max_length=150)
    tipo_contrato: Optional[TipoContrato] = None
    horas_max_sem: Optional[int] = None
    horas_asignadas: Optional[int] = None
    horas_disponibles: Optional[int] = None
    telefono: Optional[str] = Field(None, max_length=20)
    estatus: Optional[str] = None  # ✅ DEBE ESTAR AQUÍ

    @field_validator("cedula")
    @classmethod
    def validar_cedula(cls, v: Optional[str]) -> Optional[str]:
        if v:
            validar_cedula_venezolana(v)
        return v

    @field_validator("telefono")
    @classmethod
    def validar_telefono(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return validar_telefono_venezolano(v)
        return v

class DocenteResponse(BaseModel):
    id_doc: int
    id_usu: Optional[int] = None
    cedula: str
    nombre: str
    apellido: str
    id_mun: int
    especialidad: str
    tipo_contrato: str
    horas_max_sem: int
    horas_asignadas: Optional[int] = 0
    horas_disponibles: Optional[int] = 0
    telefono: Optional[str] = None
    observaciones: Optional[str] = None
    estatus: str = "A"
    creado: datetime
    actualizar: datetime
    municipio: Optional[MunicipiosResposive] = None
    usuario: Optional[UsuarioResposive] = None

    class Config:
        from_attributes = True