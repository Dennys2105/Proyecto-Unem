from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.schemas.esq_programas import ProgramasResposive

class SeccionBase(BaseModel):
    codigo: str = Field(..., max_length=50, description="Código único de la sección")
    id_pro: int = Field(..., description="ID del programa académico")
    trayecto: int = Field(..., gt=0, description="El trayecto debe ser mayor a 0")
    periodo: int = Field(..., gt=0, description="El período debe ser mayor a 0")
    capacidad_maxima: int = Field(..., gt=0, description="La capacidad debe ser mayor a 0")
    estatus: str = Field(default="A", description="Estado del registro (A=Activo, I=Inactivo)")

class SeccionCreate(SeccionBase):
    pass

class SeccionReplace(SeccionBase):
    pass

class SeccionUpdate(BaseModel):
    codigo: Optional[str] = Field(None, max_length=50)
    id_pro: Optional[int] = None
    trayecto: Optional[int] = Field(None, gt=0)
    periodo: Optional[int] = Field(None, gt=0)
    capacidad_maxima: Optional[int] = Field(None, gt=0)
    estatus: Optional[str] = Field(None, description="Estado del registro (A=Activo, I=Inactivo)")

class SeccionResponse(SeccionBase):
    id_sec: int
    programa: Optional[ProgramasResposive] = None
    creado: datetime
    actualizar: datetime
    
    class Config:
        from_attributes = True