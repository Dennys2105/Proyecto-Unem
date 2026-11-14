from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, Dict, Any
from app.dependencies.pruebas_optimizacion import validar_cedula_venezolana
from app.schemas.esq_municipios import MunicipiosResposive
from app.schemas.esq_auth import UsuarioResposive

class EstudianteBase(BaseModel):
    cedula: str = Field(..., max_length=20) # [DATO ÚNICO]
    nombre: str = Field(..., max_length=150)
    apellido: str = Field(..., max_length=150)
    id_mun: int
    id_pro: Optional[int] = None
    id_sec: Optional[int] = None
    trayecto: int
    
    @field_validator("cedula")
    @classmethod
    def validar_cedula(cls, v: str) -> str:
        validar_cedula_venezolana(v)  
        return v

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
    
    @field_validator("cedula")
    @classmethod
    def validar_cedula(cls, v: str) -> str:
        validar_cedula_venezolana(v)  
        return v
    

class EstudianteResponse(EstudianteBase):
    id_est: int
    id_usu: Optional[int] = None 
    creado: datetime
    actualizar: datetime
    
    municipio: Optional[MunicipiosResposive] = None
    usuario: Optional[UsuarioResposive] = None

    class Config:
        from_attributes = True
