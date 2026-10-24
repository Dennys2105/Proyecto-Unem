from typing import Optional, Any, Dict
from datetime import datetime, date, time
from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy.dialects.postgresql import JSONB

# ==========================================
# ESQUEMA: general
# ==========================================

class Municipio(SQLModel, table=True):
    __tablename__ = "municipios"
    __table_args__ = {"schema": "general"}
    
    id_mun: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=255)
    estatus: str = Field(default="A", max_length=1)
    
    #relaciones
    docentes: list["Docente"] = Relationship(back_populates="municipio")
    estudiantes: list["Estudiante"] = Relationship(back_populates="municipio")
    espacios_fisicos: list["EspacioFisico"] = Relationship(back_populates="municipio")

class Rol(SQLModel, table=True):
    __tablename__ = "roles"
    __table_args__ = {"schema": "general"}
    
    id_rol: Optional[int] = Field(default=None, primary_key=True)
    rol: str = Field(max_length=255)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    estatus: str = Field(default="A", max_length=1)
    
    #relaciones
    usuarios: list["Usuario"] = Relationship(back_populates="rol")

class DiaLaboral(SQLModel, table=True):
    __tablename__ = "dias_laborales"
    __table_args__ = {"schema": "general"}
    
    id_dia: Optional[int] = Field(default=None, primary_key=True)
    dia: str = Field(max_length=50)
    orden: int
    estatus: str = Field(default="A", max_length=1)
    
    #relaciones
    disponibilidad: list["DisponibilidadDocente"] = Relationship(back_populates="dia")
    asig_carga_horaria: list["AsigCargaHoraria"] = Relationship(back_populates="dia_laboral")
    
    
class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "general"}
    
    id_usu: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(max_length=255, unique=True)
    id_rol: int = Field(foreign_key="general.roles.id_rol")
    estatus: str = Field(default="A", max_length=1)
    creado: datetime = Field(default_factory=datetime.utcnow)
    actualizar: datetime = Field(default_factory=datetime.utcnow)

    #relaciones
    estudiante: Optional["Estudiante"] = Relationship(back_populates="usuario")
    docente: Optional["Docente"] = Relationship(back_populates="usuario")
    credencial: Optional["Credencial"] = Relationship(back_populates="usuario")
    auditoria_movimientos: list["AuditoriaMovimiento"] = Relationship(back_populates="usuario")

    rol: Optional[Rol] = Relationship(back_populates="usuarios")

class Credencial(SQLModel, table=True):
    __tablename__ = "credenciales"
    __table_args__ = {"schema": "general"}
    
    id_cre: Optional[int] = Field(default=None, primary_key=True)
    id_usu: int = Field(foreign_key="general.usuarios.id_usu")
    password_hash: str = Field(max_length=255)
    ultimo_acceso: Optional[datetime] = Field(default=None)
    intentos_fallidos: int = Field(default=0)
    bloqueado_hasta: Optional[datetime] = Field(default=None)
    
    #relaciones
    usuario: Optional["Usuario"] = Relationship(back_populates="credencial")

class AuditoriaMovimiento(SQLModel, table=True):
    __tablename__ = "aud_mov"
    __table_args__ = {"schema": "general"}
    
    id_aud: Optional[int] = Field(default=None, primary_key=True)
    id_usu: Optional[int] = Field(default=None, foreign_key="general.usuarios.id_usu")
    tabla_mod: str = Field(max_length=50)
    tipo_accion: str = Field(max_length=10)
    val_antes: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    val_despues: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    fecha_hora: datetime = Field(default_factory=datetime.utcnow)
    dir_ip: Optional[str] = Field(default=None, max_length=45)
    estatus: str = Field(default="A", max_length=1)
    
    #relaciones
    usuario: Optional[Usuario] = Relationship(back_populates="auditoria_movimientos")
    
# ==========================================
# ESQUEMA: personas
# ==========================================

class Docente(SQLModel, table=True):
    __tablename__ = "docentes"
    __table_args__ = {"schema": "personas"}
    
    id_doc: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(max_length=20, unique=True)
    nombre: str = Field(max_length=150)
    apellido: str = Field(max_length=150)
    id_usu: int = Field(foreign_key="general.usuarios.id_usu")
    id_mun: int = Field(foreign_key="general.municipios.id_mun")
    especialidad: str = Field(max_length=150)
    tipo_contrato: str = Field(max_length=20)
    horas_max_sem: int
    horas_asignadas: int = Field(default=0)
    horas_disponibles: int
    telefono: str | None = Field(default=None, max_length=20)
    estatus: str = Field(default="A", max_length=1)
    creado: datetime = Field(default_factory=datetime.utcnow)
    actualizar: datetime = Field(default_factory=datetime.utcnow)

    #relaciones
    disponibilidad: list["DisponibilidadDocente"] = Relationship(back_populates="docente")
    asig_carga_horaria: list["AsigCargaHoraria"] = Relationship(back_populates="docente")
    
    usuario: Usuario = Relationship(back_populates="docente")
    municipio: Municipio = Relationship(back_populates="docentes")


class Estudiante(SQLModel, table=True):
    __tablename__ = "estudiantes"
    __table_args__ = {"schema": "personas"}
    
    id_est: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(max_length=20, unique=True)
    nombre: str = Field(max_length=150)
    apellido: str = Field(max_length=150)
    id_usu: int = Field(foreign_key="general.usuarios.id_usu")
    id_mun: int = Field(foreign_key="general.municipios.id_mun")
    id_pro: int = Field(foreign_key="academico.programas.id_pro")
    trayecto: int
    estatus: str = Field(default="A", max_length=1)
    creado: datetime = Field(default_factory=datetime.utcnow)
    actualizar: datetime = Field(default_factory=datetime.utcnow)

    #relaciones
    usuario: Usuario = Relationship(back_populates="estudiante")
    municipio: Municipio = Relationship(back_populates="estudiantes")
    programa: Programa = Relationship(back_populates="estudiantes")

class DisponibilidadDocente(SQLModel, table=True):
    __tablename__ = "disponibilidad_docente"
    __table_args__ = {"schema": "personas"}
    
    id_disp: Optional[int] = Field(default=None, primary_key=True)
    id_doc: int = Field(foreign_key="personas.docentes.id_doc")
    id_dia: int = Field(foreign_key="general.dias_laborales.id_dia")
    hora_inicio: time
    hora_fin: time
    estatus: str = Field(default="A", max_length=1)

    #relaciones
    docente: Optional[Docente] = Relationship(back_populates="disponibilidad")
    dia: Optional[DiaLaboral] = Relationship(back_populates="disponibilidad")

# ==========================================
# ESQUEMA: academico
# ==========================================

class Programa(SQLModel, table=True):
    __tablename__ = "programas"
    __table_args__ = {"schema": "academico"}
    
    id_pro: Optional[int] = Field(default=None, primary_key=True)
    codigo: str = Field(max_length=10, unique=True)
    nombre: str = Field(max_length=255)
    tipo_sistema: str = Field(max_length=50) # trimestral, semestral
    total_trayectos: int
    total_uc: int
    estatus: str = Field(default="A", max_length=1)
    creado: datetime = Field(default_factory=datetime.utcnow)
    actualizar: datetime = Field(default_factory=datetime.utcnow)
    
    #relaciones
    estudiantes: list["Estudiante"] = Relationship(back_populates="programa")
    malla_curricular: list["MallaCurricular"] = Relationship(back_populates="programa")
    secciones: list["Seccion"] = Relationship(back_populates="programa")

class EjeFormativo(SQLModel, table=True):
    __tablename__ = "ejes_formativos"
    __table_args__ = {"schema": "academico"}
    
    id_eje: Optional[int] = Field(default=None, primary_key=True)
    codigo: str = Field(max_length=10, unique=True)
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    estatus: str = Field(default="A", max_length=1)

    #relaciones
    materias: list[Materia] = Relationship(back_populates="eje_formativo")

class Materia(SQLModel, table=True):
    __tablename__ = "materias"
    __table_args__ = {"schema": "academico"}
    
    id_mat: Optional[int] = Field(default=None, primary_key=True)
    codigo: str = Field(max_length=20, unique=True)
    nombre: str = Field(max_length=250)
    id_eje: int = Field(foreign_key="academico.ejes_formativos.id_eje")
    unidades_creditos: int
    descripcion: Optional[str] = Field(default=None)
    estatus: str = Field(default="A", max_length=1)
    creado: datetime = Field(default_factory=datetime.utcnow)
    actualizar: datetime = Field(default_factory=datetime.utcnow)

    #relaciones
    eje_formativo: EjeFormativo = Relationship(back_populates="materias")

class MallaCurricular(SQLModel, table=True):
    __tablename__ = "malla_curricular"
    __table_args__ = {"schema": "academico"}
    
    id_malla: Optional[int] = Field(default=None, primary_key=True)
    id_pro: int = Field(foreign_key="academico.programas.id_pro")
    id_mat: int = Field(foreign_key="academico.materias.id_mat")
    trayecto: int
    periodo: int
    prerequisito_id_mat: Optional[int] = Field(default=None, foreign_key="academico.materias.id_mat")
    estatus: str = Field(default="A", max_length=1)
    creado: datetime = Field(default_factory=datetime.utcnow)
    actualizar: datetime = Field(default_factory=datetime.utcnow)

    #ojo, aqui hay dos relaciones con la misma tabla Materia, una es la materia y otra es el prerequisito, y no logre hacer que se relacionara normalmente
    #relaciones
    asig_carga_horaria: list["AsigCargaHoraria"] = Relationship(back_populates="malla_curricular")
    
    programa: Programa = Relationship(back_populates="malla_curricular")

class PeriodoAcademico(SQLModel, table=True):
    __tablename__ = "periodos_academicos"
    __table_args__ = {"schema": "academico"}
    
    id_per: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=50)
    anio: int = Field()
    numero_periodo: int
    tipo: str = Field(max_length=20)
    fecha_inicio: date
    fecha_fin: date
    activo: bool = Field(default=True)
    estatus: str = Field(default="A", max_length=1)
    creado: datetime = Field(default_factory=datetime.utcnow)
    actualizar: datetime = Field(default_factory=datetime.utcnow)
    
    #relaciones
    asig_carga_horaria: list["AsigCargaHoraria"] = Relationship(back_populates="periodo_academico")

class Seccion(SQLModel, table=True):
    __tablename__ = "secciones"
    __table_args__ = {"schema": "academico"}
    
    id_sec: Optional[int] = Field(default=None, primary_key=True)
    codigo: str = Field(max_length=20)
    id_pro: int = Field(foreign_key="academico.programas.id_pro")
    trayecto: int
    periodo: int
    capacidad_maxima: int
    estatus: str = Field(default="A", max_length=1)
    creado: datetime = Field(default_factory=datetime.utcnow)
    actualizar: datetime = Field(default_factory=datetime.utcnow)

    #relaciones
    programa: Optional[Programa] = Relationship(back_populates="secciones") 


# ==========================================
# ESQUEMA: infraestructura
# ==========================================

class EspacioFisico(SQLModel, table=True):
    __tablename__ = "espacios_fis"
    __table_args__ = {"schema": "infraestructura"}
    
    id_esp: Optional[int] = Field(default=None, primary_key=True)
    id_mun: int = Field(foreign_key="general.municipios.id_mun")
    nombre_centro: str = Field(max_length=200)
    ubicacion: str = Field(max_length=100)
    tipo_espacio: str = Field(max_length=100)
    capacidad: int
    equipamiento: Optional[str] = Field(default=None)
    disponibilidad: bool = Field(default=True)
    estatus: str = Field(default="A", max_length=1)
    creado: datetime = Field(default_factory=datetime.utcnow)
    actualizar: datetime = Field(default_factory=datetime.utcnow)

    #relaciones
    asig_carga_horaria: list["AsigCargaHoraria"] = Relationship(back_populates="espacio_fisico")
    municipio: Municipio = Relationship(back_populates="espacios_fisicos")

# ==========================================
# ESQUEMA: horarios
# ==========================================

class BloqueHorario(SQLModel, table=True):
    __tablename__ = "bloques_horarios"
    __table_args__ = {"schema": "horarios"}
    
    id_bloq: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=50)
    hora_inicio: time
    hora_fin: time
    tipo: str = Field(max_length=20)
    estatus: str = Field(default="A", max_length=1)
    
    #relaciones
    asig_carga_horaria: list["AsigCargaHoraria"] = Relationship(back_populates="bloque_horario")

class AsigCargaHoraria(SQLModel, table=True):
    __tablename__ = "asig_carga_horarias"
    __table_args__ = {"schema": "horarios"}
    
    id_asig: Optional[int] = Field(default=None, primary_key=True)
    id_doc: int = Field(foreign_key="personas.docentes.id_doc")
    id_esp: int = Field(foreign_key="infraestructura.espacios_fis.id_esp")
    id_malla: int = Field(foreign_key="academico.malla_curricular.id_malla")
    id_per: int = Field(foreign_key="academico.periodos_academicos.id_per")
    id_dia: int = Field(foreign_key="general.dias_laborales.id_dia")
    id_bloq: int = Field(foreign_key="horarios.bloques_horarios.id_bloq")
    tipo_actividad: str = Field(max_length=20)
    observaciones: Optional[str] = Field(default=None)
    estatus: str = Field(default="A", max_length=1)
    creado: datetime = Field(default_factory=datetime.utcnow)
    actualizar: datetime = Field(default_factory=datetime.utcnow)

    #relaciones
    docente: Docente = Relationship(back_populates="asig_carga_horaria")
    espacio_fisico: EspacioFisico = Relationship(back_populates="asig_carga_horaria")
    malla_curricular: MallaCurricular = Relationship(back_populates="asig_carga_horaria")
    periodo_academico: PeriodoAcademico = Relationship(back_populates="asig_carga_horaria")
    dia_laboral: DiaLaboral = Relationship(back_populates="asig_carga_horaria")
    bloque_horario: BloqueHorario = Relationship(back_populates="asig_carga_horaria")