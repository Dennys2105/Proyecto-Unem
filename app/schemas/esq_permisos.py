from pydantic import BaseModel, model_validator
from enum import Enum

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
