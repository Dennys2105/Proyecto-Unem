import api from '../lib/axios';
import type { AsignacionCarga, AsignacionCreate, AsignacionUpdate } from '../types/models';

export const asignacionService = {
  getAll: async (): Promise<AsignacionCarga[]> => {
    const response = await api.get('/asig_carga_hor');
    return response.data;
  },
  create: async (data: AsignacionCreate): Promise<AsignacionCarga> => {
    const response = await api.post('/asig_carga_hor', data);
    return response.data;
  },
  update: async (id: number, data: AsignacionUpdate): Promise<AsignacionCarga> => {
    const response = await api.patch(`/asig_carga_hor/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/asig_carga_hor/${id}`);
  }
};