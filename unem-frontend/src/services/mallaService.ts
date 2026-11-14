import api from '../lib/axios';
import type { MallaCurricular, MallaCreate, MallaUpdate } from '../types/models';

export const mallaService = {
  getAll: async (): Promise<MallaCurricular[]> => {
    const response = await api.get('/malla_curicular/');
    return response.data;
  },
  create: async (data: MallaCreate): Promise<MallaCurricular> => {
    const response = await api.post('/malla_curicular/', data);
    return response.data;
  },
  update: async (id: number, data: MallaUpdate): Promise<MallaCurricular> => {
    const response = await api.patch(`/malla_curicular/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/malla_curicular/${id}`);
  }
};