// Primero importa o define Usuario
export interface Usuario {
  id_usu: number;
  username: string;
  id_rol: number;
  estatus: string;
  creado: string;
  actualizar: string;
}

// Municipios
export interface Municipio {
  id_mun: number;
  nombre: string;
  estatus: string;
}

export interface MunicipioCreate {
  nombre: string;
}

export interface MunicipioUpdate {
  nombre?: string;
}

// Programas
export interface Programa {
  id_pro: number;
  codigo: string;
  nombre: string;
  tipo_sistema: 'Trimestral' | 'Semestral';
  total_trayectos: number | null;
  total_uc: number | null;
  creado: string;
  actualizar: string;
  estatus: string;
}

export interface ProgramaCreate {
  codigo: string;
  nombre: string;
  tipo_sistema: 'Trimestral' | 'Semestral';
  total_trayectos?: number;
  total_uc?: number;
  actualizar?: string;
}

export interface ProgramaUpdate {
  codigo?: string;
  nombre?: string;
  tipo_sistema?: 'Trimestral' | 'Semestral';
}

// Docentes
export interface Docente {
  id_doc: number;
  id_usu: number | null;
  cedula: string;
  nombre: string;
  apellido: string;
  id_mun: number;
  especialidad: string;
  tipo_contrato: 'Estipendio' | 'Contratado';
  horas_max_sem: number;
  horas_asignadas: number;
  horas_disponibles: number;
  telefono: string | null;
  municipio: Municipio | null;
  usuario: Usuario | null;
  creado: string;
  actualizar: string;
}

export interface DocenteCreate {
  id_usu?: number;
  cedula: string;
  nombre: string;
  apellido: string;
  id_mun: number;
  especialidad: string;
  tipo_contrato: 'Estipendio' | 'Contratado';
  horas_max_sem: number;
  horas_asignadas?: number;
  horas_disponibles: number;
  telefono?: string;
}

export interface DocenteUpdate {
  cedula?: string;
  nombre?: string;
  apellido?: string;
  id_mun?: number;
  especialidad?: string;
  tipo_contrato?: 'Estipendio' | 'Contratado';
  horas_max_sem?: number;
  horas_asignadas?: number;
  horas_disponibles?: number;
  telefono?: string;
}

// Estudiantes
export interface Estudiante {
  id_est: number;
  id_usu: number | null;
  cedula: string;
  nombre: string;
  apellido: string;
  id_mun: number;
  id_pro: number | null;
  id_sec: number | null;
  trayecto: number;
  municipio: string | null;
  usuario: string | null;
  creado: string;
  actualizar: string;
}

export interface EstudianteCreate {
  cedula: string;
  nombre: string;
  apellido: string;
  id_mun: number;
  id_pro?: number;
  id_sec?: number;
  trayecto: number;
  id_usu?: number;
}

export interface EstudianteUpdate {
  cedula?: string;
  nombre?: string;
  apellido?: string;
  id_mun?: number;
  id_pro?: number;
  id_sec?: number;
  trayecto?: number;
}

// Días Laborales
export interface Dia {
  id_dia: number;
  dia: string; // Cambiado de 'nombre' a 'dia'
  orden: number;
  estatus: string;
}

export interface DiaCreate {
  dia: string;
  orden: number;
}

export interface DiaUpdate {
  dia?: string;
  orden?: number;
}

// Roles
export interface Rol {
  id_rol: number;
  rol: string; // Cambiado de 'nombre' a 'rol'
  descripcion?: string;
  estatus: string;
}

export interface RolCreate {
  rol: string;
  descripcion?: string;
}

export interface RolUpdate {
  rol?: string;
  descripcion?: string;
}

// Secciones
export interface Seccion {
  id_sec: number;
  codigo: string;
  id_pro: number;
  trayecto: number;
  periodo: number;
  capacidad_maxima: number;
  programa: any | null;
  creado: string;
  actualizar: string;
}

// Espacios Físicos
export interface EspacioFisico {
  id_esp: number;
  id_mun: number;
  nombre_centro: string;
  ubicacion: string;
  tipo_espacio: string;
  capacidad: number;
  equipamiento: string | null;
  disponibilidad: boolean | null;
  municipio: any | null;
  creado: string;
  actualizar: string;
}

export interface EspacioFisicoCreate {
  id_mun: number;
  nombre_centro: string;
  ubicacion: string;
  tipo_espacio: string;
  capacidad: number;
  equipamiento?: string;
  disponibilidad?: boolean;
}

export interface EspacioFisicoUpdate {
  id_mun?: number;
  nombre_centro?: string;
  ubicacion?: string;
  tipo_espacio?: string;
  capacidad?: number;
  equipamiento?: string;
  disponibilidad?: boolean;
}

// Materias
export interface Materia {
  id_mat: number;
  codigo: string;
  nombre: string;
  uc: number;
  horas_teoricas: number;
  horas_practicas: number;
  id_eje?: number;
  estatus: string;
  creado: string;
  actualizar: string;
}

export interface MateriaCreate {
  codigo: string;
  nombre: string;
  uc: number;
  horas_teoricas: number;
  horas_practicas: number;
  id_eje?: number;
}

export interface MateriaUpdate {
  codigo?: string;
  nombre?: string;
  uc?: number;
  horas_teoricas?: number;
  horas_practicas?: number;
  id_eje?: number;
}

// Ejes Formativos
export interface EjeFormativo {
  id_eje: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  estatus: string;
}

export interface EjeCreate {
  codigo: string;
  nombre: string;
  descripcion: string;
}

export interface EjeUpdate {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
}

// Periodo Académico
export interface PeriodoAcademico {
  id_per: number;
  nombre: string;
  anio: number;
  numero_periodo: number;
  tipo: 'Trimestre' | 'Semestre';
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  creado: string;
  estatus: string;
}

export interface PeriodoCreate {
  nombre: string;
  anio: number;
  numero_periodo: number;
  tipo: 'Trimestre' | 'Semestre';
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  actualizar: string;
}

export interface PeriodoUpdate {
  nombre?: string;
  anio?: number;
  numero_periodo?: number;
  tipo?: 'Trimestre' | 'Semestre';
  fecha_inicio?: string;
  fecha_fin?: string;
  activo?: boolean;
  actualizar?: string;
}

// Malla Curricular
export interface MallaCurricular {
  id_malla: number;
  id_pro: number;
  id_mat: number;
  perequisito_id_mat?: number;
  programa?: Programa;
  materia?: Materia;
  prerequisito?: Materia;
}

export interface MallaCreate {
  id_pro: number;
  id_mat: number;
  perequisito_id_mat?: number;
}

export interface MallaUpdate {
  id_pro?: number;
  id_mat?: number;
  perequisito_id_mat?: number;
}

// Asignación de Carga Horaria
export interface AsignacionCarga {
  id_asig: number;
  id_doc?: number;
  id_malla?: number;
  id_esp?: number;
  id_bloq?: number;
  id_dia: number;
  id_per?: number;
  hora_inicio: string;
  hora_fin: string;
  tipo_actividad?: string;
  observaciones?: string;
  // Relaciones para mostrar en tabla (el backend puede no enviarlas, las buscamos por ID)
  docente?: any;
  malla?: any;
  espacio?: any;
  bloque?: any;
  dia?: any;
  periodo?: any;
}

export interface AsignacionCreate {
  id_doc?: number;
  id_malla?: number;
  id_esp?: number;
  id_bloq?: number;
  id_dia: number;
  id_per?: number;
  hora_inicio: string;
  hora_fin: string;
  tipo_actividad?: string;
  observaciones?: string;
}

export interface AsignacionUpdate {
  id_doc?: number;
  id_malla?: number;
  id_esp?: number;
  id_bloq?: number;
  id_dia?: number;
  id_per?: number;
  hora_inicio?: string;
  hora_fin?: string;
  tipo_actividad?: string;
  observaciones?: string;
}