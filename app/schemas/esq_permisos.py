from pydantic import BaseModel, model_validator
from enum import Enum
from typing import Optional, List

class Alcance(str,Enum):
    NAD = 'NAD'
    TODO = 'TODO'
    SP = 'SP'
    LIM = 'LIM'

class PermisoUsuCreate(BaseModel):
    id_usu: int #unique
    id_mod: int #unique
    id_perm: int #unique
    alcance: Alcance

class PermisoUsuUpdate(BaseModel):
    alcance: Alcance | None

# ==========================================
# ESQUEMAS (Pydantic)
# ==========================================
class UsuarioSimple(BaseModel):
    id_usu: int
    username: str
    id_rol: int
    rol: str
    estatus: str


class ModuloCatalogo(BaseModel):
    id_mod: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None


class PermisoCatalogo(BaseModel):
    id_perm: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None


class CatalogosResponse(BaseModel):
    modulos: List[ModuloCatalogo]
    permisos: List[PermisoCatalogo]


class PermisoOverride(BaseModel):
    """Un permiso personalizado (override) que el admin asigna a un usuario."""
    id_mod: int
    id_perm: int
    alcance: Alcance  # TODO, SP, LIM, NAD


class PermisosUsuarioUpdate(BaseModel):
    """Cuerpo para guardar la matriz completa de permisos personalizados."""
    permisos: List[PermisoOverride]