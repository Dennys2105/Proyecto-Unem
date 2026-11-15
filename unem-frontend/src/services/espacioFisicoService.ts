import api from '../lib/axios';
import type { EspacioFisico, EspacioFisicoCreate, EspacioFisicoUpdate } from '../types/models';

export const espacioFisicoService = {
  getAll: async (): Promise<EspacioFisico[]> => {
  
    const response = await api.get('/espacios_fisicos/');
    return response.data;
  },
  
  create: async (data: EspacioFisicoCreate): Promise<EspacioFisico> => {
    const response = await api.post('/espacios_fisicos/', data);
    return response.data;
  },
  
  update: async (id: number, data: EspacioFisicoUpdate): Promise<EspacioFisico> => {

    const response = await api.patch(`/espacios_fisicos/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {

    await api.delete(`/espacios_fisicos/${id}`);
  }
};