import api from '../lib/axios';

export interface ResumenEstadistico {
  total_docentes_activos: number;
  total_estudiantes_activos: number;
  total_asignaciones_activas: number;
  total_horas_asignadas: number;
  total_horas_disponibles: number;
  total_programas_activos: number;
  aulas_disponibles: number;
}

export interface CargaPorDia {
  id_dia: number;
  dia: string;
  orden: number;
  horas: number;
  asignaciones: number;
}

export interface DocentesPorContrato {
  tipo_contrato: string;
  total_docentes: number;
  total_horas_maximas: number;
  total_horas_asignadas: number;
  total_horas_disponibles: number;
  promedio_horas_asignadas: number;
}

export interface OcupacionEspacio {
  id_esp: number;
  ubicacion: string;
  nombre_centro: string;
  tipo_espacio: string;
  capacidad: number;
  total_asignaciones: number;
  horas_ocupadas: number;
}

export interface EstudiantesPorPrograma {
  id_pro: number;
  codigo: string;
  nombre: string;
  tipo_sistema: string;
  total_estudiantes: number;
}

export interface PeriodoVigente {
  id_per: number;
  nombre: string;
  anio: number;
  numero_periodo: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface CoberturaNotas {
  notas_registradas: number;
  estudiantes_activos: number;
  estudiantes_evaluados: number;
  materias_en_malla: number;
  porcentaje_cobertura: number;
}

export const analyticsService = {
  getResumen: async (): Promise<ResumenEstadistico> => {
    const response = await api.get('/analytics/resumen');
    return response.data;
  },

  getCargaPorDia: async (): Promise<CargaPorDia[]> => {
    const response = await api.get('/analytics/carga-por-dia');
    return response.data;
  },

  getDocentesPorContrato: async (): Promise<DocentesPorContrato[]> => {
    const response = await api.get('/analytics/docentes-por-contrato');
    return response.data;
  },

  getOcupacionEspacios: async (limite = 8): Promise<OcupacionEspacio[]> => {
    const response = await api.get('/analytics/ocupacion-espacios', { params: { limite } });
    return response.data;
  },

  getEstudiantesPorPrograma: async (): Promise<EstudiantesPorPrograma[]> => {
    const response = await api.get('/analytics/estudiantes-por-programa');
    return response.data;
  },

  getPeriodoVigente: async (): Promise<PeriodoVigente | null> => {
    const response = await api.get('/analytics/periodo-vigente');
    return response.data;
  },

  getCoberturaNotas: async (): Promise<CoberturaNotas> => {
    const response = await api.get('/analytics/cobertura-notas');
    return response.data;
  },
};