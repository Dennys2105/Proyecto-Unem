import api from '../lib/axios';
import type { Usuario, MatrizPermiso } from '../types/models';

// Interfaces para mapear las respuestas del backend
interface BackendPermisoEfectivo {
  id_usu: number;
  username: string;
  rol: string;
  modulo: string;       // Código del módulo (ej: 'docentes')
  modulo_nombre: string;
  permiso: string;      // Código del permiso (CRE, ACT, LEC, BOR)
  permiso_nombre: string;
  alcance_efectivo: string;
  origen: string;       // 'Heredado del rol' o 'Personalizado'
}

// Mapeo de códigos de permiso a sus IDs en la BD (según tus datos semilla)
const PERMISO_CODE_TO_ID: Record<string, number> = {
  'CRE': 1,
  'ACT': 2,
  'LEC': 3,
  'BOR': 4
};

export const rolesService = {
  // 1. Obtener todos los usuarios activos
  getAllUsuarios: async (): Promise<Usuario[]> => {
    const response = await api.get('/permisos/usuarios');
    return response.data.map((u: any) => ({
      id_usu: u.id_usu,
      username: u.username,
      id_rol: u.id_rol,
      estatus: u.estatus,
      creado: '',
      actualizar: ''
    }));
  },

  // 2. Obtener permisos efectivos de un usuario (rol + overrides)
  getPermisosUsuario: async (usuarioId: number): Promise<MatrizPermiso[]> => {
    // Obtener los permisos actuales del usuario
    const response = await api.get<BackendPermisoEfectivo[]>(`/permisos/usuario/${usuarioId}`);
    const datos = response.data;

    // Obtener el catálogo completo de módulos para asegurar que todos aparezcan en la UI
    const catalogosRes = await api.get('/permisos/catalogos');
    const modulosReales = catalogosRes.data.modulos;

    const modulosMap = new Map<string, any>();

    // Llenar el mapa con los permisos que el usuario ya tiene
    datos.forEach(d => {
      if (!modulosMap.has(d.modulo)) {
        modulosMap.set(d.modulo, {
          permisos: {
            CRE: { activo: false, alcance: 'NAD' as const, esPersonalizado: false },
            ACT: { activo: false, alcance: 'NAD' as const, esPersonalizado: false },
            LEC: { activo: false, alcance: 'NAD' as const, esPersonalizado: false },
            BOR: { activo: false, alcance: 'NAD' as const, esPersonalizado: false },
          }
        });
      }

      const moduloData = modulosMap.get(d.modulo);
      const codigoPermiso = d.permiso as 'CRE' | 'ACT' | 'LEC' | 'BOR';
      
      moduloData.permisos[codigoPermiso] = {
        activo: d.alcance_efectivo !== 'NAD',
        alcance: d.alcance_efectivo as 'TODO' | 'SP' | 'LIM' | 'NAD',
        esPersonalizado: d.origen === 'Personalizado'
      };
    });

    // Construir la matriz final asegurando que TODOS los módulos del sistema aparezcan
    const matrizFinal: MatrizPermiso[] = modulosReales.map((modReal: any) => {
      const datosModulo = modulosMap.get(modReal.codigo);
      return {
        modulo: {
          id_mod: modReal.id_mod,
          codigo: modReal.codigo,
          nombre: modReal.nombre,
          descripcion: modReal.descripcion || ''
        },
        permisos: datosModulo ? datosModulo.permisos : {
          CRE: { activo: false, alcance: 'NAD' as const, esPersonalizado: false },
          ACT: { activo: false, alcance: 'NAD' as const, esPersonalizado: false },
          LEC: { activo: false, alcance: 'NAD' as const, esPersonalizado: false },
          BOR: { activo: false, alcance: 'NAD' as const, esPersonalizado: false },
        }
      };
    });

    return matrizFinal;
  },

  // 3. Guardar permisos personalizados (overrides)
  savePermisosUsuario: async (usuarioId: number, matriz: MatrizPermiso[]): Promise<void> => {
    const permisosAplanados = [];
    
    for (const item of matriz) {
      for (const [codigo, datos] of Object.entries(item.permisos)) {
        // Solo enviamos al backend los permisos que el administrador marcó como "Personalizado"
        if (datos.esPersonalizado) {
          permisosAplanados.push({
            id_mod: item.modulo.id_mod,
            id_perm: PERMISO_CODE_TO_ID[codigo],
            alcance: datos.alcance
          });
        }
      }
    }

    await api.put(`/permisos/usuario/${usuarioId}`, { permisos: permisosAplanados });
  },
  
  // 4. (Opcional) Restaurar permisos a los valores por defecto del rol
  resetearPermisos: async (usuarioId: number): Promise<void> => {
    await api.delete(`/permisos/usuario/${usuarioId}/reset`);
  }
};