import { useState, useEffect } from 'react';
import { rolesService } from '../services/rolesService';
import type { Usuario, MatrizPermiso } from '../types/models';
import { Shield, User, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ALCANCE_CONFIG = {
  TODO: { color: 'bg-green-100 text-green-700 border-green-300', label: 'Total' },
  SP: { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Propio' },
  LIM: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Limitado' },
  NAD: { color: 'bg-red-100 text-red-700 border-red-300', label: 'Sin acceso' },
};

const ROLES_NOMBRES: Record<number, string> = {
  1: 'Administrador',
  2: 'Vicerrector',
  3: 'Coordinador',
  4: 'Docente',
  5: 'Estudiante',
};

export const Roles = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
  const [matriz, setMatriz] = useState<MatrizPermiso[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const data = await rolesService.getAllUsuarios();
      setUsuarios(data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    }
  };

  const abrirGestorPermisos = async (usuario: Usuario) => {
    setUsuarioSeleccionado(usuario);
    setIsLoading(true);
    setIsModalOpen(true);

    try {
      const data = await rolesService.getPermisosUsuario(usuario.id_usu);
      setMatriz(data);
    } catch (error) {
      toast.error('Error al cargar permisos');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermiso = (moduloId: number, permisoCodigo: 'CRE' | 'ACT' | 'LEC' | 'BOR') => {
    setMatriz(prev => prev.map(m => {
      if (m.modulo.id_mod !== moduloId) return m;
      return {
        ...m,
        permisos: {
          ...m.permisos,
          [permisoCodigo]: {
            ...m.permisos[permisoCodigo],
            activo: !m.permisos[permisoCodigo].activo,
            esPersonalizado: true,
          },
        },
      };
    }));
  };

  const cambiarAlcance = (moduloId: number, permisoCodigo: 'CRE' | 'ACT' | 'LEC' | 'BOR', alcance: 'TODO' | 'SP' | 'LIM' | 'NAD') => {
    setMatriz(prev => prev.map(m => {
      if (m.modulo.id_mod !== moduloId) return m;
      return {
        ...m,
        permisos: {
          ...m.permisos,
          [permisoCodigo]: {
            ...m.permisos[permisoCodigo],
            alcance,
            esPersonalizado: true,
          },
        },
      };
    }));
  };

  const guardarPermisos = async () => {
    if (!usuarioSeleccionado) return;

    try {
      await rolesService.savePermisosUsuario(usuarioSeleccionado.id_usu, matriz);
      toast.success(`Permisos actualizados para ${usuarioSeleccionado.username}`);
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Error al guardar permisos');
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start gap-4">
        <div className="bg-indigo-100 p-3 rounded-xl">
          <Shield className="text-indigo-600" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios y Permisos</h1>
          <p className="text-gray-600 mt-1">
            Administra los usuarios del sistema y sus permisos personalizados
          </p>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Usuarios del Sistema</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((u) => (
                <tr key={u.id_usu} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-600">#{u.id_usu}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      {u.username}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-300">
                      {ROLES_NOMBRES[u.id_rol] || `Rol ${u.id_rol}`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                      u.estatus === 'A' 
                        ? 'bg-green-100 text-green-700 border border-green-300' 
                        : 'bg-red-100 text-red-700 border border-red-300'
                    }`}>
                      {u.estatus === 'A' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => abrirGestorPermisos(u)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs font-medium"
                    >
                      <Shield size={14} />
                      Gestionar Permisos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Gestión de Permisos */}
      {isModalOpen && usuarioSeleccionado && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Permisos de {usuarioSeleccionado.username}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Rol base: {ROLES_NOMBRES[usuarioSeleccionado.id_rol]} | 
                  Los permisos en gris son heredados del rol
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Cargando permisos...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matriz.map(({ modulo, permisos }) => (
                    <div key={modulo.id_mod} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <h3 className="text-sm font-bold text-gray-900">{modulo.nombre}</h3>
                        <p className="text-xs text-gray-500">{modulo.descripcion}</p>
                      </div>
                      <div className="grid grid-cols-4 gap-2 p-4">
                        {(['CRE', 'ACT', 'LEC', 'BOR'] as const).map(codigo => {
                          const p = permisos[codigo];
                          const config = ALCANCE_CONFIG[p.alcance];
                          return (
                            <div key={codigo} className={`p-3 rounded-lg border ${
                              p.esPersonalizado ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={p.activo}
                                    onChange={() => togglePermiso(modulo.id_mod, codigo)}
                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                  />
                                  <span className="text-xs font-bold text-gray-700">{codigo}</span>
                                </label>
                                {p.esPersonalizado && (
                                  <span className="text-xs text-indigo-600 font-medium">Personalizado</span>
                                )}
                              </div>
                              {p.activo && (
                                <select
                                  value={p.alcance}
                                  onChange={(e) => cambiarAlcance(modulo.id_mod, codigo, e.target.value as any)}
                                  className={`w-full text-xs px-2 py-1 rounded border ${config.color}`}
                                >
                                  <option value="TODO">Total</option>
                                  <option value="SP">Solo Propio</option>
                                  <option value="LIM">Limitado</option>
                                  <option value="NAD">Sin acceso</option>
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPermisos}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                Guardar Permisos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};