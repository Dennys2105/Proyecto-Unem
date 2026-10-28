from pydantic import BaseModel

class BaseMunicipios(BaseModel): 
    nombre: str

class MunicipiosCreate(BaseMunicipios):
    pass

class MunicipiosUpdate(BaseMunicipios):
    nombre: str | None = None

class MunicipiosResposive(BaseMunicipios):
    id_mun: int
    nombre: str
    estatus: str

class MunicipiosRemplace(BaseMunicipios):
    pass