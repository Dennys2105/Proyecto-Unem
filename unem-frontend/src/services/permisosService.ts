import api from '../lib/axios';

export interface PermisoEfectivo {
  id_usu: number;
  username: string;
  rol: string;
  modulo: string;
  modulo_nombre: string;
  permiso: string;
  permiso_nombre: string;
  alcance_efectivo: 'TODO' | 'SP' | 'LIM' | 'NAD';
  origen: string;
}

export const permisosService = {
  getByUsuario: async (usuarioId: number): Promise<PermisoEfectivo[]> => {
    const response = await api.get('/analytics/permisos', { 
      params: { usuario_id: usuarioId } 
    });
    return response.data;
  },
};