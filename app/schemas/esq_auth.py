from pydantic import BaseModel, EmailStr
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
    email: EmailStr

class UsuarioUpdate(BaseUsuario):
    username: str | None = None
    id_rol: int | None = None
    email: EmailStr | None = None

class UsuarioResposive(BaseModel):
    id_usu: int
    username: str
    id_rol: int
    email: EmailStr
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

class UserLogin(BaseModel):#No usado y remplazado por OAuth2PasswordRequestForm
    username: str
    password: str
    email: EmailStr

class UserRegister(BaseModel):
    username: str
    password: str
    email: EmailStr
    id_rol: RolAsignados

"""#Actualizar Toda la Informacion de los usuarios
class UpdateUserDocente(BaseModel):
    usuario: UsuarioUpdate
    docente: DocenteUpdate

class UpdateUserEstudiante(BaseModel):
    usuario: UsuarioUpdate
    estudiante: EstudianteUpdate

class UpdateUserDocenteResponse(BaseModel):
    usuario: UsuarioResposive
    docente: DocenteResponse

class UpdateUserEstudianteResponse(BaseModel):
    usuario: UsuarioResposive
    estudiante: EstudianteResponse"""