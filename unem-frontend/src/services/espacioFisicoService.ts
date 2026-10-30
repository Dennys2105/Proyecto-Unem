import api from '../lib/axios';
import type { EspacioFisico, EspacioFisicoCreate, EspacioFisicoUpdate } from '../types/models';

export const espacioFisicoService = {
  getAll: async (): Promise<EspacioFisico[]> => {
    const response = await api.get('/esp_fisico');
    return response.data;
  },
  
  create: async (data: EspacioFisicoCreate): Promise<EspacioFisico> => {
    const response = await api.post('/esp_fisico', data);
    return response.data;
  },
  
  update: async (id: number, data: EspacioFisicoUpdate): Promise<EspacioFisico> => {
    const response = await api.patch(`/esp_fisico/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/esp_fisico/${id}`);
  }
};