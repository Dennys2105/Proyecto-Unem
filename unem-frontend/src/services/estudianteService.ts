import api from '../lib/axios';
import type { Estudiante, EstudianteCreate, EstudianteUpdate } from '../types/models';

export const estudianteService = {
  getAll: async (): Promise<Estudiante[]> => {
    const response = await api.get('/estudiantes');
    return response.data;
  },
  
  create: async (data: EstudianteCreate): Promise<Estudiante> => {
    const response = await api.post('/estudiantes', data);
    return response.data;
  },
  
  update: async (id: number, data: EstudianteUpdate): Promise<Estudiante> => {
    const response = await api.patch(`/estudiantes/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/estudiantes/${id}`);
  }
};