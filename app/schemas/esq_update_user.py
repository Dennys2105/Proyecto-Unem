from pydantic import BaseModel
from app.schemas.esq_auth import UsuarioUpdate, UsuarioResposive
from app.schemas.esq_docente import DocenteResponse, DocenteUpdate
from app.schemas.esq_estudiante import EstudianteResponse, EstudianteUpdate

#Actualizar Toda la Informacion de los usuarios
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
    estudiante: EstudianteResponse