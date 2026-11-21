import api from '../lib/axios';
import type { Usuario, MatrizPermiso } from '../types/models';

interface BackendPermisoEfectivo {
  id_usu: number;
  username: string;
  rol: string;
  modulo: string;
  modulo_nombre: string;
  permiso: string;
  permiso_nombre: string;
  alcance_efectivo: string;
  origen: string;
}

export interface UsuarioCreatePayload {
  username: string;
  email: string;
  password: string;
  id_rol: number;
  id_doc?: number;
}

export interface DocenteSinVinculo {
  id_doc: number;
  cedula: string;
  nombre: string;
  cedula_nombre: string;
}

export interface UsuarioPatchPayload {
  id_rol?: number;
  estatus?: string;
}

const PERMISO_CODE_TO_ID: Record<string, number> = {
  'CRE': 1,
  'ACT': 2,
  'LEC': 3,
  'BOR': 4
};

const celdaVacia = () => ({ activo: false, alcance: 'NAD' as const, esPersonalizado: false });

export const rolesService = {
  // 1. Usuarios (activos por defecto; opcionalmente incluye inactivos)
  getAllUsuarios: async (incluirInactivos = false): Promise<Usuario[]> => {
    const response = await api.get('/permisos/usuarios', { params: { incluir_inactivos: incluirInactivos } });
    return response.data.map((u: any) => ({
      id_usu: u.id_usu,
      username: u.username,
      id_rol: u.id_rol,
      estatus: u.estatus,
      creado: '',
      actualizar: ''
    }));
  },

  // 1b. Crear usuario (usuario + credencial con hash)
  crearUsuario: async (payload: UsuarioCreatePayload): Promise<void> => {
    await api.post('/permisos/usuarios', payload);
  },
  // Docentes sin usuario vinculado (para el selector)
  getDocentesSinVinculo: async (): Promise<DocenteSinVinculo[]> => {
    const res = await api.get('/permisos/docentes-sin-vinculo');
    return res.data;
  },
  // Vincular / desvincular docente a un usuario existente
  vincularDocente: async (idUsu: number, idDoc: number | null): Promise<void> => {
    await api.patch(`/permisos/usuarios/${idUsu}/vincular-docente`, null, {
      params: idDoc !== null ? { id_doc: idDoc } : {},
    });
  },

  // 1c. Cambiar rol y/o activar/desactivar
  editarUsuario: async (idUsu: number, payload: UsuarioPatchPayload): Promise<void> => {
    await api.patch(`/permisos/usuarios/${idUsu}`, payload);
  },

  // 1d. Resetear contraseña (y desbloquear la cuenta)
  resetPassword: async (idUsu: number, password: string): Promise<void> => {
    await api.post(`/permisos/usuarios/${idUsu}/password`, { password });
  },

  // 2. Permisos efectivos de un usuario (rol + overrides)
  getPermisosUsuario: async (usuarioId: number): Promise<MatrizPermiso[]> => {
    const response = await api.get<BackendPermisoEfectivo[]>(`/permisos/usuario/${usuarioId}`);
    const datos = response.data;

    const catalogosRes = await api.get('/permisos/catalogos');
    const modulosReales = catalogosRes.data.modulos;

    const modulosMap = new Map<string, any>();

    datos.forEach(d => {
      if (!modulosMap.has(d.modulo)) {
        modulosMap.set(d.modulo, {
          permisos: { CRE: celdaVacia(), ACT: celdaVacia(), LEC: celdaVacia(), BOR: celdaVacia() }
        });
      }
      const moduloData = modulosMap.get(d.modulo);
      const codigoPermiso = d.permiso as 'CRE' | 'ACT' | 'LEC' | 'BOR';
      const alc = (d.alcance_efectivo ?? 'NAD') as 'TODO' | 'SP' | 'LIM' | 'NAD';
      moduloData.permisos[codigoPermiso] = {
        activo: alc !== 'NAD',
        alcance: alc,
        esPersonalizado: d.origen === 'Personalizado'
      };
    });

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
          CRE: celdaVacia(), ACT: celdaVacia(), LEC: celdaVacia(), BOR: celdaVacia()
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

  // 4. Restaurar permisos a los valores del rol
  resetearPermisos: async (usuarioId: number): Promise<void> => {
    await api.delete(`/permisos/usuario/${usuarioId}/reset`);
  }
};