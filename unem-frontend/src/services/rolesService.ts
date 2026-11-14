import type { Usuario, Modulo, Permiso, PermisoRol, PermisoUsuario, MatrizPermiso } from '../types/models';

// ==========================================
// DATOS MOCK (Fase 1 - sin backend)
// Mañana reemplazaremos esto con llamadas reales
// ==========================================

const MODULOS_MOCK: Modulo[] = [
  { id_mod: 1, codigo: 'roles', nombre: 'Roles', descripcion: 'Gestión de roles del sistema' },
  { id_mod: 2, codigo: 'malla', nombre: 'Malla Curricular', descripcion: 'Gestión de la malla curricular' },
  { id_mod: 3, codigo: 'materias', nombre: 'Materias', descripcion: 'Gestión de unidades curriculares' },
  { id_mod: 4, codigo: 'programas', nombre: 'Programas', descripcion: 'Gestión de programas académicos' },
  { id_mod: 5, codigo: 'secciones', nombre: 'Secciones', descripcion: 'Gestión de secciones' },
  { id_mod: 6, codigo: 'aud_mov', nombre: 'Auditoría', descripcion: 'Consulta de bitácora de auditoría' },
  { id_mod: 7, codigo: 'dias', nombre: 'Días Laborales', descripcion: 'Gestión de días laborales' },
  { id_mod: 8, codigo: 'municipios', nombre: 'Municipios', descripcion: 'Gestión de municipios' },
  { id_mod: 9, codigo: 'usuarios', nombre: 'Usuarios', descripcion: 'Gestión de usuarios del sistema' },
  { id_mod: 10, codigo: 'asig_carga', nombre: 'Asignación de Carga Horaria', descripcion: 'Gestión de asignaciones de horario' },
  { id_mod: 11, codigo: 'espacios', nombre: 'Espacios Físicos', descripcion: 'Gestión de aulas y espacios' },
  { id_mod: 12, codigo: 'disponibilidad', nombre: 'Disponibilidad Docente', descripcion: 'Gestión de disponibilidad de docentes' },
  { id_mod: 13, codigo: 'docentes', nombre: 'Docentes', descripcion: 'Gestión de docentes' },
  { id_mod: 14, codigo: 'estudiantes', nombre: 'Estudiantes', descripcion: 'Gestión de estudiantes' },
  { id_mod: 15, codigo: 'notas', nombre: 'Registro de Notas', descripcion: 'Gestión de calificaciones de estudiantes' },
  { id_mod: 16, codigo: 'periodos', nombre: 'Períodos Académicos', descripcion: 'Gestión de períodos académicos' },
];

const PERMISOS_MOCK: Permiso[] = [
  { id_perm: 1, codigo: 'CRE', nombre: 'Crear', descripcion: 'Permiso para crear nuevos registros' },
  { id_perm: 2, codigo: 'ACT', nombre: 'Actualizar', descripcion: 'Permiso para modificar registros existentes' },
  { id_perm: 3, codigo: 'LEC', nombre: 'Leer', descripcion: 'Permiso para consultar/visualizar registros' },
  { id_perm: 4, codigo: 'BOR', nombre: 'Borrar', descripcion: 'Permiso para eliminar registros (lógico)' },
];

// Permisos base por rol (de la tabla permisos_rol)
const PERMISOS_ROL_MOCK: PermisoRol[] = [
  // ADMIN (rol 1): TODO en todos los módulos
  ...Array.from({ length: 16 }, (_, i) => ({
    id_pr: i * 4 + 1,
    id_rol: 1,
    id_mod: i + 1,
    id_perm: 1,
    alcance: 'TODO' as const,
    estatus: 'A',
  })),
  ...Array.from({ length: 16 }, (_, i) => ({
    id_pr: 65 + i * 4 + 1,
    id_rol: 1,
    id_mod: i + 1,
    id_perm: 2,
    alcance: 'TODO' as const,
    estatus: 'A',
  })),
  ...Array.from({ length: 16 }, (_, i) => ({
    id_pr: 129 + i * 4 + 1,
    id_rol: 1,
    id_mod: i + 1,
    id_perm: 3,
    alcance: 'TODO' as const,
    estatus: 'A',
  })),
  ...Array.from({ length: 16 }, (_, i) => ({
    id_pr: 193 + i * 4 + 1,
    id_rol: 1,
    id_mod: i + 1,
    id_perm: 4,
    alcance: 'TODO' as const,
    estatus: 'A',
  })),
];

// Usuarios mock (basado en la BD real)
const USUARIOS_MOCK: Usuario[] = [
  { id_usu: 1, username: 'admin', id_rol: 1, estatus: 'A', creado: '2026-10-29', actualizar: '2026-10-29' },
  // Agrega más usuarios aquí cuando los tengas
];

// Permisos personalizados por usuario (vacío inicialmente)
let PERMISOS_USUARIO_MOCK: PermisoUsuario[] = [];

// ==========================================
// SERVICIO (Fase 1 - mock, Fase 2 - real)
// ==========================================

export const rolesService = {
  // Obtener todos los usuarios
  getAllUsuarios: async (): Promise<Usuario[]> => {
    // FASE 2: return api.get('/usuarios').then(r => r.data);
    return USUARIOS_MOCK;
  },

  // Obtener módulos y permisos (catálogos)
  getCatalogos: async (): Promise<{ modulos: Modulo[]; permisos: Permiso[] }> => {
    // FASE 2: return api.get('/general/catalogos-permisos').then(r => r.data);
    return { modulos: MODULOS_MOCK, permisos: PERMISOS_MOCK };
  },

  // Obtener permisos efectivos de un usuario (rol + personalizados)
  getPermisosUsuario: async (usuarioId: number): Promise<MatrizPermiso[]> => {
    // FASE 2: return api.get(`/analytics/permisos?usuario_id=${usuarioId}`).then(r => r.data);
    
    const usuario = USUARIOS_MOCK.find(u => u.id_usu === usuarioId);
    if (!usuario) return [];

    // Construir matriz combinando permisos_rol + permisos_usuario
    const matriz: MatrizPermiso[] = MODULOS_MOCK.map(modulo => {
      const permisosModulo: MatrizPermiso['permisos'] = {
        CRE: { activo: false, alcance: 'NAD', esPersonalizado: false },
        ACT: { activo: false, alcance: 'NAD', esPersonalizado: false },
        LEC: { activo: false, alcance: 'NAD', esPersonalizado: false },
        BOR: { activo: false, alcance: 'NAD', esPersonalizado: false },
      };

      // Buscar permisos del rol
      PERMISOS_ROL_MOCK
        .filter(pr => pr.id_rol === usuario.id_rol && pr.id_mod === modulo.id_mod)
        .forEach(pr => {
          const codigo = PERMISOS_MOCK.find(p => p.id_perm === pr.id_perm)?.codigo as 'CRE' | 'ACT' | 'LEC' | 'BOR';
          if (codigo) {
            permisosModulo[codigo] = {
              activo: true,
              alcance: pr.alcance,
              esPersonalizado: false,
            };
          }
        });

      // Buscar overrides personalizados
      PERMISOS_USUARIO_MOCK
        .filter(pu => pu.id_usu === usuarioId && pu.id_mod === modulo.id_mod)
        .forEach(pu => {
          const codigo = PERMISOS_MOCK.find(p => p.id_perm === pu.id_perm)?.codigo as 'CRE' | 'ACT' | 'LEC' | 'BOR';
          if (codigo) {
            permisosModulo[codigo] = {
              activo: true,
              alcance: pu.alcance || 'NAD',
              esPersonalizado: true,
            };
          }
        });

      return { modulo, permisos: permisosModulo };
    });

    return matriz;
  },

  // Guardar permisos personalizados de un usuario
  savePermisosUsuario: async (usuarioId: number, matriz: MatrizPermiso[]): Promise<void> => {
    // FASE 2: return api.post(`/usuarios/${usuarioId}/permisos`, matriz).then(r => r.data);
    
    // Eliminar permisos personalizados anteriores
    PERMISOS_USUARIO_MOCK = PERMISOS_USUARIO_MOCK.filter(pu => pu.id_usu !== usuarioId);

    // Insertar nuevos permisos personalizados
    matriz.forEach(({ modulo, permisos }) => {
      (Object.keys(permisos) as Array<'CRE' | 'ACT' | 'LEC' | 'BOR'>).forEach(codigo => {
        const permiso = permisos[codigo];
        const permisoDef = PERMISOS_MOCK.find(p => p.codigo === codigo);
        
        if (permisoDef && permiso.esPersonalizado) {
          PERMISOS_USUARIO_MOCK.push({
            id_pu: PERMISOS_USUARIO_MOCK.length + 1,
            id_usu: usuarioId,
            id_mod: modulo.id_mod,
            id_perm: permisoDef.id_perm,
            alcance: permiso.alcance,
            estatus: 'A',
          });
        }
      });
    });

    console.log('Permisos guardados (mock):', PERMISOS_USUARIO_MOCK);
  },
};