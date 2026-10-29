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
  nombre: string;
  estatus: string;
}

export interface DiaCreate {
  nombre: string;
}

export interface DiaUpdate {
  nombre?: string;
}

// Roles
export interface Rol {
  id_rol: number;
  nombre: string;
  estatus: string;
}

export interface RolCreate {
  nombre: string;
}

export interface RolUpdate {
  nombre?: string;
}