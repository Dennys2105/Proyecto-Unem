from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum
from app.schemas.esq_municipios import MunicipiosResposive

class TipoEspacio(str,Enum):
    AULA = "Aula"

# --- ESPACIO FISICO ---
class EspacioFisicoBase(BaseModel):
    id_mun: int
    nombre_centro: str = Field(..., max_length=200) # [DATO ÚNICO]
    ubicacion: str = Field(..., max_length=100)
    tipo_espacio: TipoEspacio = Field(..., max_length=100)
    capacidad: int
    equipamiento: Optional[str] = None
    disponibilidad: Optional[bool] = True

class EspacioFisicoCreate(EspacioFisicoBase):
    pass

class EspacioFisicoReplace(EspacioFisicoBase):
    pass

class EspacioFisicoUpdate(BaseModel):
    id_mun: Optional[int] = None
    nombre_centro: Optional[str] = Field(None, max_length=200) # [DATO ÚNICO]
    ubicacion: Optional[str] = Field(None, max_length=100)
    tipo_espacio: Optional[TipoEspacio] = Field(None, max_length=100)
    capacidad: Optional[int] = None
    equipamiento: Optional[str] = None
    disponibilidad: Optional[bool] = None

class EspacioFisicoResponse(EspacioFisicoBase):
    id_esp: int
    municipio: Optional[MunicipiosResposive] = None
    creado: datetime
    actualizar: datetime
    class Config:
        from_attributes = True