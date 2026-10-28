from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from sqlmodel import Field

class TipoSistemaEnum(str, Enum):
    TRIMESTRAL = "Trimestral"
    SEMESTRAL = "Semestral"

class BaseProgramas(BaseModel): 
    codigo: str = Field(..., max_length=10, description="El código no puede superar los 10 caracteres")
    nombre: str
    tipo_sistema: TipoSistemaEnum
    total_trayectos: int | None = None
    total_uc: int | None = None
    actualizar: datetime | None = None

class ProgramasCreate(BaseProgramas):
    pass

class ProgramasUpdate(BaseProgramas):
    codigo: str | None = Field(..., max_length=10, description="El código no puede superar los 10 caracteres")
    nombre: str | None = None
    tipo_sistema: TipoSistemaEnum | None = None

class ProgramasResposive(BaseProgramas):
    id_pro: int
    creado: datetime
    estatus: str

class ProgramasRemplace(BaseProgramas):
    pass