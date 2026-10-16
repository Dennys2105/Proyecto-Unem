from pydantic import BaseModel

class BaseRoles(BaseModel): 
    rol: str
    descripcion: str | None

class RolesCreate(BaseRoles):
    pass

class RolesUpdate(BaseRoles):
    rol: str | None = None

class RolesResposive(BaseModel):
    id_rol: int
    rol: str
    descripcion: str
    estatus: str

class RolesRemplace(BaseRoles):
    pass

