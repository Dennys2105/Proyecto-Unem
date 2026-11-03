import api from '../lib/axios';
import type { EjeFormativo, EjeCreate, EjeUpdate } from '../types/models';

export const ejeService = {
  getAll: async (): Promise<EjeFormativo[]> => {
    const response = await api.get('/EjesFormativos');
    return response.data;
  },
  create: async (data: EjeCreate): Promise<EjeFormativo> => {
    const response = await api.post('/EjesFormativos', data);
    return response.data;
  },
  update: async (id: number, data: EjeUpdate): Promise<EjeFormativo> => {
    const response = await api.patch(`/EjesFormativos/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/EjesFormativos/${id}`);
  }
};