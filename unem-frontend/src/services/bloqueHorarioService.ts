import api from '../lib/axios';
import type { BloqueHorario, BloqueHorarioCreate, BloqueHorarioUpdate } from '../types/models';

export const bloqueHorarioService = {
  getAll: async (): Promise<BloqueHorario[]> => {
    const response = await api.get('/bloq_hor');
    return response.data;
  },
  
  create: async (data: BloqueHorarioCreate): Promise<BloqueHorario> => {
    const response = await api.post('/bloq_hor', data);
    return response.data;
  },
  
  update: async (id: number, data: BloqueHorarioUpdate): Promise<BloqueHorario> => {
    const response = await api.patch(`/bloq_hor/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/bloq_hor/${id}`);
  }
};