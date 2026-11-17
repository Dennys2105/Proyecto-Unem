from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class TipoSistemaEnum(str, Enum):
    TRIMESTRAL = "Trimestral"
    SEMESTRAL = "Semestral"

class BaseProgramas(BaseModel): 
    codigo: str = Field(..., max_length=10, description="El código no puede superar los 10 caracteres")
    nombre: str
    tipo_sistema: TipoSistemaEnum
    total_trayectos: int | None = None
    total_uc: int | None = None

class ProgramasCreate(BaseProgramas):
    pass

class ProgramasRemplace(BaseProgramas):
    pass

class ProgramasUpdate(BaseModel):
    codigo: str | None = Field(None, max_length=10, description="El código no puede superar los 10 caracteres")
    nombre: str | None = None
    tipo_sistema: TipoSistemaEnum | None = None
    total_trayectos: int | None = None
    total_uc: int | None = None
    estatus: str | None = None  

class ProgramasResposive(BaseProgramas):
    id_pro: int
    creado: datetime
    estatus: str

    class Config:
        from_attributes = True