from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List
from enum import Enum


class TiposEvaluacion(str, Enum):
    Parcial_1 = "Parcial 1"
    Parcial_2 = "Parcial 2"
    Parcial_3 = "Parcial 3"
    Final = "Final"
    Recuperacion = "Recuperación"
    Trabajos = "Trabajo"


class BaseNotas(BaseModel):
    id_est: int
    id_malla: int
    id_per: int
    # ✅ Field con límites reales (CHECK de la BD: 0 <= nota <= 20)
    nota: float = Field(..., ge=0, le=20, description="Calificación en escala 0-20")
    tipo_evaluacion: TiposEvaluacion = TiposEvaluacion.Final
    observaciones: Optional[str] = None

    @field_validator("nota")
    @classmethod
    def redondear_nota(cls, v: float) -> float:
        # La columna es numeric(4,2): máximo 2 decimales
        return round(v, 2)


class NotasCreate(BaseNotas):
    pass


class NotasUpdate(BaseModel):
    # ✅ TODOS con default None → ahora sí es un PATCH parcial real
    id_est: Optional[int] = None
    id_malla: Optional[int] = None
    id_per: Optional[int] = None
    nota: Optional[float] = Field(None, ge=0, le=20)
    tipo_evaluacion: Optional[TiposEvaluacion] = None
    observaciones: Optional[str] = None
    estatus: Optional[str] = None  # ✅ Para anular / restaurar

    @field_validator("nota")
    @classmethod
    def redondear_nota(cls, v: Optional[float]) -> Optional[float]:
        # ✅ Maneja None sin explotar
        return round(v, 2) if v is not None else None


class NotasResponcive(BaseModel):
    """Respuesta enriquecida: incluye IDs, nombres y estatus."""
    id_nota: int
    id_est: int
    id_malla: int
    id_per: int
    nota: float
    tipo_evaluacion: str
    observaciones: Optional[str] = None
    fecha_registro: Optional[datetime] = None
    estatus: str = "A"
    creado: Optional[datetime] = None
    actualizar: Optional[datetime] = None
    # Campos enriquecidos por JOIN
    cedula: Optional[str] = None
    estudiante: Optional[str] = None
    cod_materia: Optional[str] = None
    materia: Optional[str] = None
    eje_formativo: Optional[str] = None
    cod_programa: Optional[str] = None
    programa: Optional[str] = None
    trayecto: Optional[int] = None
    periodo: Optional[int] = None
    periodo_academico: Optional[str] = None
    cod_seccion: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================
# CARGA MASIVA (ACTA)
# ============================================================
class FilaActa(BaseModel):
    id_est: int
    # None o "" = el docente dejó la casilla vacía → se omite, no se borra
    nota: Optional[float] = Field(None, ge=0, le=20)
    observaciones: Optional[str] = None


class ActaCreate(BaseModel):
    id_malla: int
    id_per: int
    tipo_evaluacion: TiposEvaluacion = TiposEvaluacion.Final
    filas: List[FilaActa]


class ResumenActa(BaseModel):
    creadas: int = 0
    actualizadas: int = 0
    omitidas: int = 0
    total_procesadas: int = 0
    mensaje: str = ""