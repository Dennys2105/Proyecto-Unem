import api from '../lib/axios';
import type { Materia, MateriaCreate, MateriaUpdate } from '../types/models';

export const materiaService = {
  getAll: async (): Promise<Materia[]> => {
    const response = await api.get('/Materia'); // ← AQUÍ (Mayúscula)
    return response.data;
  },
  create: async (data: MateriaCreate): Promise<Materia> => {
    const response = await api.post('/Materia', data); // ← AQUÍ
    return response.data;
  },
  update: async (id: number, data: MateriaUpdate): Promise<Materia> => {
    const response = await api.patch(`/Materia/${id}`, data); // ← AQUÍ
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/Materia/${id}`); // ← AQUÍ
  }
};