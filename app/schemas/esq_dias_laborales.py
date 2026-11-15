from typing import Optional

from pydantic import BaseModel

class BaseDias(BaseModel): 
    dia: str
    orden: int

class DiasCreate(BaseDias):
    pass

class DiasUpdate(BaseModel):
    dia: Optional[str] = None
    orden: Optional[int] = None
    estatus: Optional[str] = None

class DiasResposive(BaseModel):
    id_dia: int
    dia: str
    orden: int
    estatus: str

class DiasRemplace(BaseDias):
    pass

