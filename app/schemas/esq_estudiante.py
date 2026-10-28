from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class EstudianteBase(BaseModel):
    cedula: str = Field(..., max_length=20) # [DATO ÚNICO]
    nombre: str = Field(..., max_length=150)
    apellido: str = Field(..., max_length=150)
    id_mun: int
    id_pro: Optional[int] = None
    id_sec: Optional[int] = None
    trayecto: int

class EstudianteCreate(EstudianteBase):
    id_usu: Optional[int] = None # [DATO ÚNICO]

class EstudianteReplace(EstudianteBase):
    id_usu: Optional[int] = None # [DATO ÚNICO]

class EstudianteUpdate(BaseModel):
    cedula: Optional[str] = Field(None, max_length=20) # [DATO ÚNICO]
    nombre: Optional[str] = Field(None, max_length=150)
    apellido: Optional[str] = Field(None, max_length=150)
    id_mun: Optional[int] = None
    id_pro: Optional[int] = None
    id_sec: Optional[int] = None
    trayecto: Optional[int] = None

class EstudianteResponse(EstudianteBase):
    id_est: int
    id_usu: Optional[int] = None # [DATO ÚNICO]
    municipio: Optional[str] = None
    usuario: Optional[str] = None
    creado: datetime
    actualizar: datetime
    class Config:
        from_attributes = True