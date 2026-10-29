import api from '../lib/axios';
import type { Programa, ProgramaCreate, ProgramaUpdate } from '../types/models';

export const programaService = {
  getAll: async (): Promise<Programa[]> => {
    const response = await api.get('/Programa');
    return response.data;
  },
  
  getById: async (id: number): Promise<Programa> => {
    const response = await api.get(`/Programa/${id}`);
    return response.data;
  },
  
  create: async (data: ProgramaCreate): Promise<Programa> => {
    const response = await api.post('/Programa', data);
    return response.data;
  },
  
  update: async (id: number, data: ProgramaUpdate): Promise<Programa> => {
    const response = await api.patch(`/Programa/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/Programa/${id}`);
  }
};