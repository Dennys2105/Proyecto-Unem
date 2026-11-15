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

export const analyticsService = {
  getResumen: async (): Promise<ResumenEstadistico> => {
    const response = await api.get('/analytics/resumen');
    return response.data;
  },
};