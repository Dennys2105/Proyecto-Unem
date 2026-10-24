from pydantic import BaseModel

class BaseDias(BaseModel): 
    dia: str
    orden: int

class DiasCreate(BaseDias):
    pass

class DiasUpdate(BaseDias):
    dia: str | None = None

class DiasResposive(BaseModel):
    id_dia: int
    dia: str
    orden: int
    estatus: str

class DiasRemplace(BaseDias):
    pass