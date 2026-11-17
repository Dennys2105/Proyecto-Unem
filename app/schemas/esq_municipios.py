from pydantic import BaseModel, Field
from typing import Optional

class BaseMunicipios(BaseModel): 
    nombre: str = Field(..., min_length=3, max_length=100, description="Nombre del municipio")

class MunicipiosCreate(BaseMunicipios):
    pass

class MunicipiosUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=3, max_length=100)
    estatus: Optional[str] = None  

class MunicipiosResposive(BaseMunicipios):
    id_mun: int
    estatus: str = "A"  

    class Config:
        from_attributes = True

class MunicipiosRemplace(BaseMunicipios):
    pass