import api from '../lib/axios';
import type { Seccion } from '../types/models';

export const seccionService = {
  getAll: async (): Promise<Seccion[]> => {
    const response = await api.get('/seccion');
    return response.data;
  },

  // Catálogo mínimo de secciones para que el Vicerrector asigne horarios;
  // no habilita la página de Secciones ni su API de CRUD.
  getParaAsignacion: async (): Promise<Seccion[]> => {
    const response = await api.get('/asig_carga_hor/opciones/secciones');
    return response.data;
  },
  
  create: async (data: any): Promise<Seccion> => {
    const response = await api.post('/seccion', data);
    return response.data;
  },
  
  update: async (id: number, data: any): Promise<Seccion> => {
    const response = await api.patch(`/seccion/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/seccion/${id}`);
  }
};