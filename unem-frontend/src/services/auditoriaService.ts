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
};