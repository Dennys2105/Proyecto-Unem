import api from '../lib/axios';
import type { Nota, NotaCreate, NotaUpdate } from '../types/models';

export const notaService = {
  getAll: async (): Promise<Nota[]> => {
    const response = await api.get('/api/notas');
    return response.data;
  },
  create: async (data: NotaCreate): Promise<Nota> => {
    const response = await api.post('/api/notas', data);
    return response.data;
  },
  update: async (id: number, data: NotaUpdate): Promise<Nota> => {
    const response = await api.patch(`/api/notas/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/notas/${id}`);
  }
};