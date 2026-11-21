import api from '../lib/axios';
import type { Estudiante, EstudianteCreate, EstudianteUpdate } from '../types/models';

export const estudianteService = {
  getAll: async (): Promise<Estudiante[]> => {
    const response = await api.get('/estudiantes/');
    return response.data;
  },

  getEstudiantesFiltrados: async (idSec?: number, busqueda?: string): Promise<Estudiante[]> => {
    const params: Record<string, number | string> = {};
    if (idSec) params.id_sec = idSec;
    if (busqueda) params.busqueda = busqueda;

    const response = await api.get('/estudiantes/', { params });
    return response.data;
  },

  descargarListaAsistencia: async (idSec: number): Promise<void> => {
    const response = await api.get('/exportar/estudiantes/seccion/excel', {
      params: { id_sec: idSec },
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `asistencia_seccion_${idSec}_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  
  create: async (data: EstudianteCreate): Promise<Estudiante> => {
    const response = await api.post('/estudiantes/', data);
    return response.data;
  },
  
  update: async (id: number, data: EstudianteUpdate): Promise<Estudiante> => {
    const response = await api.patch(`/estudiantes/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/estudiantes/${id}`);
  }
};