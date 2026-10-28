from pydantic import BaseModel
from sqlmodel import Field

class BaseEjes(BaseModel): 
    codigo: str | None = Field(..., max_length=5, description="El código no puede superar los 5 caracteres")
    nombre: str
    descripcion: str

class EjeCreate(BaseEjes):
    pass

class EjeUpdate(BaseEjes):
    nombre: str | None = None
    descripcion: str | None = None

class EjeResposive(BaseEjes):
    id_eje: int
    estatus: str

class EjeRemplace(BaseEjes):
    pass