from sqlmodel import SQLModel
from decimal import Decimal
from datetime import datetime, date, time

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
    registro_identificador: str
    resumen_cambios: str
    ip_origen: str

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
    accion: str
    alcance_efectivo: str
    origen: str

class VwDocentesPorProgramaMunicipioRead(SQLModel, table=False):
    municipio: str
    cod_programa: str
    programa: str
    total_docentes: int
    total_horas_asignadas: int
    total_horas_disponibles: int

class VwHorarioCompletoDocenteRead(SQLModel, table=False):
    cedula: str
    nombre_completo_docente: str
    tipo_contrato: str
    cod_programa: str
    programa: str
    cod_materia:str
    materia: str
    uc: int
    cod_eje:str
    eje_formatvo: str
    periodo_academico: str
    dia: str
    hora_inicio: time
    hora_fin: time
    espacio_fisico: str
    nombre_centro: str
    tipo_actividad: str