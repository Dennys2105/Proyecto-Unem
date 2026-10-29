import api from '../lib/axios';
import type { Docente, DocenteCreate, DocenteUpdate } from '../types/models';

export const docenteService = {
  getAll: async (): Promise<Docente[]> => {
    const response = await api.get('/docentes');
    return response.data;
  },
  
  getById: async (id: number): Promise<Docente> => {
    const response = await api.get(`/docentes/${id}`);
    return response.data;
  },
  
  create: async (data: DocenteCreate): Promise<Docente> => {
    const response = await api.post('/docentes', data);
    return response.data;
  },
  
  update: async (id: number, data: DocenteUpdate): Promise<Docente> => {
    const response = await api.patch(`/docentes/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/docentes/${id}`);
  }
};