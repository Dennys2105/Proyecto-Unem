from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class RolAsignados(int,Enum):
    Docente = 2
    Estudiante = 3


#Credenciales

class BaseCredenciales(BaseModel):
    id_usu: int
    ultimo_acceso: datetime | None = None
    intentos_fallidos: int | None = None
    bloqueado_hasta: datetime | None = None

class CredencialesResponcibe(BaseCredenciales):
    id_cre: int

#Usuarios

class BaseUsuario(BaseModel): 
    username: str
    id_rol: int

class UsuarioUpdate(BaseUsuario):
    username: str | None = None
    id_rol: int | None = None

class UsuarioResposive(BaseModel):
    id_usu: int
    username: str
    id_rol: int
    estatus: str
    creado: datetime
    actualizar: datetime

class UsuarioRemplace(BaseUsuario):
    pass

#Usuarios + Credenciales

class UsuarioWithCredencialesResposive(BaseModel):
    usuario: UsuarioResposive
    credenciales: CredencialesResponcibe
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str
    
    

class UserRegister(BaseModel):
    username: str
    password: str
    id_rol: RolAsignados
