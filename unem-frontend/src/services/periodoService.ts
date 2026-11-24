import api from '../lib/axios';
import type { PeriodoCreate, PeriodoUpdate, PeriodoAcademico } from '../types/models';

export const periodoService = {
  // Obtenemos todos los períodos
  getAll: async (): Promise<PeriodoAcademico[]> => {
    const response = await api.get('/periodos/');
    return response.data;
  },
  
  // Creamos un nuevo período
  create: async (data: PeriodoCreate): Promise<PeriodoAcademico> => {
    const response = await api.post('/periodos/', data);
    return response.data;
  },
  
  // Actualizamos parcialmente un período
  update: async (id: number, data: PeriodoUpdate): Promise<PeriodoAcademico> => {
    const response = await api.patch(`/periodos/${id}`, data);
    return response.data;
  },
  
  // Eliminamos lógicamente un período
  delete: async (id: number): Promise<void> => {
    await api.delete(`/periodos/${id}`);
  },
  
  // Activamos como período vigente (desactiva los demás automáticamente)
  activar: async (id: number): Promise<PeriodoAcademico> => {
    const response = await api.post(`/periodos/${id}/activar`);
    return response.data;
  },

  cerrar: async (id: number): Promise<PeriodoAcademico> => {
    const response = await api.post(`/periodos/${id}/cerrar`);
    return response.data;
  },
};