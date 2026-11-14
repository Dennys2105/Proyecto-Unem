import api from '../lib/axios';

export interface MovimientoAuditoria {
  id_aud: number;
  fecha: string;
  usuario: string;
  tabla_afectada: string;
  accion: string;
  registro_identificador: string;
  resumen_cambios: string;
  ip_origen: string | null;
}

export const auditoriaService = {
  getAll: async (): Promise<MovimientoAuditoria[]> => {
    const response = await api.get('/analytics/auditoria/movimientos');
    return response.data;
  },
  getWithFilters: async (filters: {
    tabla?: string;
    usuario?: string;
    fecha_inicio?: string;
  }): Promise<MovimientoAuditoria[]> => {
    const params: Record<string, string> = {};
    if (filters.tabla) params.tabla = filters.tabla;
    if (filters.usuario) params.usuario = filters.usuario;
    if (filters.fecha_inicio) params.fecha_inicio = filters.fecha_inicio;
    const response = await api.get('/analytics/auditoria/movimientos', { params });
    return response.data;
  },
};