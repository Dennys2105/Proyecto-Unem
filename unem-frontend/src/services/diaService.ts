import api from '../lib/axios';
import type { Dia, DiaCreate, DiaUpdate } from '../types/models';

export const diaService = {
  getAll: async (): Promise<Dia[]> => {
    const response = await api.get('/Dias');
    return response.data;
  },
  
  getById: async (id: number): Promise<Dia> => {
    const response = await api.get(`/Dias/${id}`);
    return response.data;
  },
  
  create: async (data: DiaCreate): Promise<Dia> => {
    const response = await api.post('/Dias', data);
    return response.data;
  },
  
  update: async (id: number, data: DiaUpdate): Promise<Dia> => {
    const response = await api.patch(`/Dias/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/Dias/${id}`);
  }
};