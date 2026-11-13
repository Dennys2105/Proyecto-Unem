from sqlmodel import SQLModel
from decimal import Decimal
from datetime import datetime, date, time
from typing import Optional

class VwResumenEstadisticoRead(SQLModel, table=False):
    total_docentes_activos: int
    total_estudiantes_activos: int
    total_asignaciones_activas: int
    total_horas_asignadas: int
    total_horas_disponibles: int
    total_programas_activos: int
    aulas_disponibles: int

class VwMovimientosRead(SQLModel, table=False):
    id_aud: int
    fecha: datetime
    usuario: str
    tabla_afectada: str
    accion: str
    registro_identificador: Optional[str] = None
    resumen_cambios: Optional[str] = None
    ip_origen: Optional[str] = None

class VwDocentesPorContratoRead(SQLModel, table=False):
    tipo_contrato: str
    total_docentes: int
    total_horas_maximas: int
    total_horas_asignadas: int
    total_horas_disponibles: int
    promedio_horas_asignadas: Decimal

class VwPermisosEfectivosRead(SQLModel, table=False):
    id_usu: int 
    username: str
    rol: str
    modulo: str
    modulo_nombre: str
    permiso: str
    permiso_nombre: str
    alcance_efectivo: str | None
    origen: str

class VwDocentesPorProgramaMunicipioRead(SQLModel, table=False):
    municipio: str
    cod_programa: str
    programa: str
    total_docentes: int
    total_horas_asignadas: int
    total_horas_disponibles: int

class VwHorarioCompletoDocenteRead(SQLModel, table=False):
    cedula: str | None = None
    nombre_completo_docente: str | None = None
    tipo_contrato: str | None = None
    cod_programa: str | None = None
    programa: str | None = None
    cod_materia:str | None = None
    materia: str | None = None
    uc: int | None = None 
    cod_eje:str | None = None
    eje_formativo: str | None = None
    periodo_academico: str | None = None
    dia: str | None = None
    hora_inicio: time | None = None
    hora_fin: time | None = None
    espacio_fisico: str | None = None
    nombre_centro: str | None = None
    tipo_actividad: str | None = None