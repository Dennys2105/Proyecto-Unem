from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class RolAsignados(int,Enum):
    Docente = 2
    Estudiante = 3


#Credenciales

class BaseCredenciales(BaseModel):
    id_usu: int
    password_hash: str
    ultimo_acceso: datetime
    intentos_fallidos: int
    bloqueado_hasta: datetime

class CredencialesCreate(BaseCredenciales):
    pass 

class CrendecialesUpdate(BaseModel):
    id_usu: int | None = None
    password_hash: str | None = None
    ultimo_acceso: datetime | None = None
    intentos_fallidos: int | None = None
    bloqueado_hasta: datetime | None = None

class CredencialesRemplace(BaseCredenciales):
    pass

class CredencialesResponcibe(BaseCredenciales):
    id_cre: int

#Usuarios

class BaseUsuario(BaseModel): 
    username: str
    id_rol: int

class UsuarioCreate(BaseUsuario):
    pass

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

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    password: str
    id_rol: RolAsignados
