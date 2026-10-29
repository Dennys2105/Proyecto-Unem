import api from '../lib/axios';
import type { Rol, RolCreate, RolUpdate } from '../types/models';

export const rolService = {
  getAll: async (): Promise<Rol[]> => {
    const response = await api.get('/roles');
    return response.data;
  },
  
  getById: async (id: number): Promise<Rol> => {
    const response = await api.get(`/roles/${id}`);
    return response.data;
  },
  
  create: async (data: RolCreate): Promise<Rol> => {
    const response = await api.post('/roles', data);
    return response.data;
  },
  
  update: async (id: number, data: RolUpdate): Promise<Rol> => {
    const response = await api.patch(`/roles/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/roles/${id}`);
  }
};