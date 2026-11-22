import api from '../lib/axios';
import type { Materia, MateriaCreate, MateriaUpdate } from '../types/models';

export const materiaService = {
  getAll: async (): Promise<Materia[]> => {
    const response = await api.get('/materias/');
    return response.data;
  },
  create: async (data: MateriaCreate): Promise<void> => {
    await api.post('/materias/', data);
  },
  update: async (id: number, data: MateriaUpdate): Promise<void> => {
    await api.patch(`/materias/${id}`, data);
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/materias/${id}`);
  }
};