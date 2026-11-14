import api from '../lib/axios';
import type { PeriodoAcademico, PeriodoCreate, PeriodoUpdate } from '../types/models';

export const periodoService = {
  getAll: async (): Promise<PeriodoAcademico[]> => {
    const response = await api.get('/PeriodoAcademico/');
    return response.data;
  },
  create: async (data: PeriodoCreate): Promise<PeriodoAcademico> => {
    const response = await api.post('/PeriodoAcademico/', data);
    return response.data;
  },
  update: async (id: number, data: PeriodoUpdate): Promise<PeriodoAcademico> => {
    const response = await api.patch(`/PeriodoAcademico/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/PeriodoAcademico/${id}`);
  }
};