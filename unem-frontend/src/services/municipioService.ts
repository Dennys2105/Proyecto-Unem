import api from '../lib/axios';
import type { Municipio, MunicipioCreate, MunicipioUpdate } from '../types/models';

export const municipioService = {
  getAll: async (): Promise<Municipio[]> => {
    const response = await api.get('/Municipio');
    return response.data;
  },
  
  getById: async (id: number): Promise<Municipio> => {
    const response = await api.get(`/Municipio/${id}`);
    return response.data;
  },
  
  create: async (data: MunicipioCreate): Promise<Municipio> => {
    const response = await api.post('/Municipio', data);
    return response.data;
  },
  
  update: async (id: number, data: MunicipioUpdate): Promise<Municipio> => {
    const response = await api.patch(`/Municipio/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/Municipio/${id}`);
  }
};