from pydantic import BaseModel, Field
from datetime import datetime, time
from typing import Optional

class DocenteBase(BaseModel):
    cedula: str = Field(..., max_length=20) # [DATO ÚNICO]
    nombre: str = Field(..., max_length=150)
    apellido: str = Field(..., max_length=150)
    id_mun: int
    especialidad: str = Field(..., max_length=150)
    tipo_contrato: str = Field(..., max_length=20)
    horas_max_sem: int
    horas_asignadas: Optional[int] = 0
    horas_disponibles: int
    telefono: Optional[str] = Field(None, max_length=20)

class DocenteCreate(DocenteBase):
    id_usu: Optional[int] = None # [DATO ÚNICO]

class DocenteReplace(DocenteBase):
    id_usu: Optional[int] = None # [DATO ÚNICO]

class DocenteUpdate(BaseModel):
    cedula: Optional[str] = Field(None, max_length=20) # [DATO ÚNICO]
    nombre: Optional[str] = Field(None, max_length=150)
    apellido: Optional[str] = Field(None, max_length=150)
    id_mun: Optional[int] = None
    especialidad: Optional[str] = Field(None, max_length=150)
    tipo_contrato: Optional[str] = Field(None, max_length=20)
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
    class Config:
        from_attributes = True