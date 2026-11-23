import api from '../lib/axios';

export interface MiAsignacion {
  id_asig: number;
  id_sec: number | null;
  seccion: string | null;
  id_malla: number | null;
  materia: string | null;
  cod_materia: string | null;
  id_per: number | null;
  periodo_academico: string | null;
  programa: string | null;
  tipo_actividad: string | null;
  dia: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  nombre_centro: string | null;
  aula: string | null;
}
export interface MiAlumno {
  id_est: number; cedula: string; nombre: string; apellido: string;
  trayecto: number; id_sec: number; seccion: string;
}
export interface MiFilaNota {
  id_est: number; cedula: string; nombre: string; apellido: string;
  id_nota: number | null; nota: number | null;
  observaciones: string | null; estado_nota: string;
  estado_revision: 'P' | 'A' | 'R'; motivo_rechazo: string | null;
}
export interface MiResumen {
  docente: string; clases: number; secciones: number; bloques: number;
  estudiantes: number; notas_pendientes: number; notas_aprobadas: number;
  notas_rechazadas: number;
}
export interface ClaseClave { id_sec: number; id_malla: number; id_per: number }

export const miDocenciaService = {
  async asignaciones(): Promise<MiAsignacion[]> {
    return (await api.get('/mi-docencia/asignaciones')).data;
  },
  async resumen(): Promise<MiResumen> {
    return (await api.get('/mi-docencia/resumen')).data;
  },
  async alumnos(id_sec?: number): Promise<MiAlumno[]> {
    return (await api.get('/mi-docencia/estudiantes', { params: id_sec ? { id_sec } : {} })).data;
  },
  async acta(clase: ClaseClave, tipo: string): Promise<MiFilaNota[]> {
    return (await api.get('/mi-docencia/acta', {
      params: { ...clase, tipo_evaluacion: tipo },
    })).data;
  },
  async guardarActa(clase: ClaseClave, tipo: string, filas: {
    id_est: number; nota: number; observaciones?: string | null;
  }[]): Promise<{ mensaje: string }> {
    return (await api.post('/mi-docencia/acta', {
      ...clase, tipo_evaluacion: tipo, filas,
    })).data;
  },
  async descargar(url: string, nombre: string): Promise<void> {
    const response = await api.get(url, { responseType: 'blob' });
    const tipo = response.headers['content-type'];
    const archivo = new Blob([response.data], { type: typeof tipo === 'string' ? tipo : 'application/octet-stream' });
    const ruta = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = ruta;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(ruta);
  },
};
