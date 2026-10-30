import api from '../lib/axios';
import type { Dia, DiaCreate, DiaUpdate } from '../types/models';

export const diaService = {
  getAll: async (): Promise<Dia[]> => {
    const response = await api.get('/DiasLaborales');
    return response.data;
  },
  
  getById: async (id: number): Promise<Dia> => {
    const response = await api.get(`/DiasLaborales/${id}`);
    return response.data;
  },
  
  create: async (data: DiaCreate): Promise<Dia> => {
    const response = await api.post('/DiasLaborales', data);
    return response.data;
  },
  
  update: async (id: number, data: DiaUpdate): Promise<Dia> => {
    const response = await api.patch(`/DiasLaborales/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/DiasLaborales/${id}`);
  }
};