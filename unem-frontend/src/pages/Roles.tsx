import { useState, useEffect, useRef } from 'react';
import { rolesService } from '../services/rolesService';
import type { Usuario, MatrizPermiso } from '../types/models';
import { useAuth } from '../hooks/useAuth';
import { Shield, User, Save, X, Plus, KeyRound, UserX, UserCheck, Eye, EyeOff, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHero } from '../components/PageHero';
import { createPortal } from 'react-dom';

const ALCANCE_CONFIG = {
  TODO: { color: 'bg-green-100 text-green-700 border-green-300', label: 'Total' },
  SP: { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Propio' },
  LIM: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Limitado' },
  NAD: { color: 'bg-red-100 text-red-700 border-red-300', label: 'Sin acceso' },
};

const JERARQUIA: Record<string, number> = { NAD: 0, SP: 1, LIM: 2, TODO: 3 };
const ALCANCES = ['NAD', 'SP', 'LIM', 'TODO'] as const;

const ROLES_NOMBRES: Record<number, string> = {
  1: 'Administrador',
  2: 'Vicerrector',
  3: 'Coordinador',
  4: 'Docente',
  5: 'Estudiante',
};

const ROLES_ASIGNABLES: number[] = [1, 2, 3, 4]; // 5 = reservado, sin acceso
const FORM_INICIAL = { username: '', email: '', password: '', id_rol: 3, id_doc: '' as number | '' };

export const Roles = () => {
  const { puede, idUsuario } = useAuth();
  const puedeCrear = puede('usuarios', 'CRE', 'TODO');
  const puedeEditar = puede('usuarios', 'ACT', 'TODO');

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [mostrarInactivos, setMostrarInactivos] = useState<boolean>(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
  const [matriz, setMatriz] = useState<MatrizPermiso[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Crear usuario
  const [modalCrear, setModalCrear] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [verPass, setVerPass] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Catálogo de docentes sin vínculo (para el selector cuando rol = 4)
  const [docentesLibres, setDocentesLibres] = useState<any[]>([]);
  // Modal de vincular docente a usuario existente
  const [usuarioVincular, setUsuarioVincular] = useState<Usuario | null>(null);
  const [idDocVincular, setIdDocVincular] = useState<number | ''>('');
  const [vinculando, setVinculando] = useState(false);
  const vinculoEnviado = useRef(false);

  // Reset de contraseña
  const [usuarioReset, setUsuarioReset] = useState<Usuario | null>(null);
  const [nuevaPass, setNuevaPass] = useState('');
  const [reseteando, setReseteando] = useState(false);

  // Fila en proceso
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  useEffect(() => {
    cargarUsuarios();
  }, [mostrarInactivos]);

  // Cargar docentes libres cuando se abre el modal de crear o el de vincular
  useEffect(() => {
    if (modalCrear || usuarioVincular) {
      rolesService.getDocentesSinVinculo()
        .then(setDocentesLibres)
        .catch(() => setDocentesLibres([]));
    }
  }, [modalCrear, usuarioVincular]);

  const cargarUsuarios = async () => {
    try {
      const data = await rolesService.getAllUsuarios(mostrarInactivos);
      setUsuarios(data);
    } catch {
      toast.error('Error al cargar usuarios');
    }
  };

  // ---------- Crear ----------
  const crearUsuario = async () => {
    const username = form.username.trim();
    const email = form.email.trim();
    if (username.length < 3 || /\s/.test(username)) {
      toast.error('Username: mínimo 3 caracteres y sin espacios'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast.error('Email inválido'); return;
    }
    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres'); return;
    }
    const esDocente = form.id_rol === 4;
    if (esDocente && !form.id_doc) {
      toast.error('Debes seleccionar una ficha de docente para vincular a este usuario'); return;
    }
    setGuardando(true);
    try {
      await rolesService.crearUsuario({
        username, email, password: form.password, id_rol: form.id_rol,
        ...(esDocente ? { id_doc: Number(form.id_doc) } : {}),
      });
      toast.success(
        esDocente
          ? `Usuario "${username}" creado y vinculado al docente ✅`
          : `Usuario "${username}" creado correctamente`,
        { icon: '✅', duration: 4000 }
      );
      setModalCrear(false);
      setForm(FORM_INICIAL);
      setVerPass(false);
      await cargarUsuarios();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo crear el usuario', { duration: 6000 });
    } finally {
      setGuardando(false);
    }
  };

  // ---------- Cambiar rol ----------
  const cambiarRol = async (u: Usuario, nuevoRol: number) => {
    if (nuevoRol === u.id_rol) return;
    setProcesandoId(u.id_usu);
    try {
      await rolesService.editarUsuario(u.id_usu, { id_rol: nuevoRol });
      toast.success(`Rol de ${u.username} actualizado. Debe volver a iniciar sesión.`, { duration: 5000 });
      await cargarUsuarios();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo cambiar el rol', { duration: 6000 });
      await cargarUsuarios();
    } finally {
      setProcesandoId(null);
    }
  };

  // ---------- Activar / Desactivar ----------
  const toggleEstatus = async (u: Usuario) => {
    const nuevo = u.estatus === 'A' ? 'I' : 'A';
    if (nuevo === 'I' && !window.confirm(`¿Desactivar a "${u.username}"? No podrá iniciar sesión.`)) return;
    setProcesandoId(u.id_usu);
    try {
      await rolesService.editarUsuario(u.id_usu, { estatus: nuevo });
      toast.success(`Usuario ${nuevo === 'A' ? 'activado' : 'desactivado'} correctamente`);
      await cargarUsuarios();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo actualizar el usuario', { duration: 6000 });
    } finally {
      setProcesandoId(null);
    }
  };

  // ---------- Vincular / desvincular docente ----------
  const confirmarVinculo = async () => {
    if (!usuarioVincular || vinculoEnviado.current) return;
    vinculoEnviado.current = true;
    setVinculando(true);
    try {
      await rolesService.vincularDocente(
        usuarioVincular.id_usu,
        idDocVincular === '' ? null : Number(idDocVincular)
      );
      toast.success(
        idDocVincular === ''
          ? `Usuario ${usuarioVincular.username} desvinculado`
          : `Usuario ${usuarioVincular.username} vinculado al docente ✅`,
        { duration: 4000, id: 'vincular-docente' }
      );
      setUsuarioVincular(null);
      setIdDocVincular('');
      await cargarUsuarios();
      rolesService.getDocentesSinVinculo()
        .then(setDocentesLibres)
        .catch(() => setDocentesLibres([]));
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo actualizar el vínculo', { duration: 6000 });
    } finally {
      vinculoEnviado.current = false;
      setVinculando(false);
    }
  };

  // ---------- Reset de contraseña ----------
  const confirmarReset = async () => {
    if (!usuarioReset) return;
    if (nuevaPass.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres'); return;
    }
    setReseteando(true);
    try {
      await rolesService.resetPassword(usuarioReset.id_usu, nuevaPass);
      toast.success(`Contraseña de ${usuarioReset.username} actualizada (cuenta desbloqueada)`, { duration: 5000 });
      setUsuarioReset(null);
      setNuevaPass('');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo resetear la contraseña', { duration: 6000 });
    } finally {
      setReseteando(false);
    }
  };

  // ---------- Matriz de permisos (sin cambios de lógica) ----------
  const abrirGestorPermisos = async (usuario: Usuario) => {
    setUsuarioSeleccionado(usuario);
    setIsLoading(true);
    setIsModalOpen(true);
    try {
      const data = await rolesService.getPermisosUsuario(usuario.id_usu);
      setMatriz(data);
    } catch {
      toast.error('Error al cargar permisos');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermiso = (moduloId: number, permisoCodigo: 'CRE' | 'ACT' | 'LEC' | 'BOR') => {
    setMatriz(prev => prev.map(m => {
      if (m.modulo.id_mod !== moduloId) return m;
      const celda = m.permisos[permisoCodigo];
      if (celda.alcanceMaximo === 'NAD') return m;
      const nuevoActivo = !celda.activo;
      return {
        ...m,
        permisos: {
          ...m.permisos,
          [permisoCodigo]: {
            ...celda,
            activo: nuevoActivo,
            // Restaurar como máximo el alcance del rol, nunca elevarlo.
            alcance: nuevoActivo ? celda.alcanceMaximo : 'NAD',
            esPersonalizado: true,
          },
        },
      };
    }));
  };

  const cambiarAlcance = (moduloId: number, permisoCodigo: 'CRE' | 'ACT' | 'LEC' | 'BOR', alcance: 'TODO' | 'SP' | 'LIM' | 'NAD') => {
    setMatriz(prev => prev.map(m => {
      if (m.modulo.id_mod !== moduloId) return m;
      if (JERARQUIA[alcance] > JERARQUIA[m.permisos[permisoCodigo].alcanceMaximo]) return m;
      return {
        ...m,
        permisos: {
          ...m.permisos,
          [permisoCodigo]: {
            ...m.permisos[permisoCodigo],
            alcance,
            activo: alcance !== 'NAD',
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
      toast.success(`Permisos actualizados para ${usuarioSeleccionado.username}. Aplican al volver a iniciar sesión.`, { duration: 5000 });
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? 'Error al guardar permisos', { duration: 7000 });
    }
  };

  return (
    <div className="unem-page">
      <PageHero
        icon={Shield}
        titulo="Gestión de Usuarios y Permisos"
        descripcion="Cuentas del sistema, roles y permisos personalizados por usuario. El Administrador conserva acceso total por diseño."
      />

      {/* Tabla de Usuarios */}
      <div className="unem-card" style={{ overflow: 'hidden' }}>
        <div className="unem-toolbar" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--line-2)', padding: '14px 18px' }}>
          <div>
            <b style={{ fontSize: 14, color: 'var(--tx-1)' }}>Usuarios del Sistema</b>
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--tx-3)' }}>
              Los cambios de rol/permisos aplican cuando el usuario vuelve a iniciar sesión.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '0 0 auto' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--tx-2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                className="unem-check"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
              />
              Mostrar inactivos
            </label>
            {puedeCrear && (
              <button
                className="unem-btn unem-btn-primary"
                onClick={() => { setForm(FORM_INICIAL); setVerPass(false); setModalCrear(true); }}
              >
                <Plus size={15} /> Nuevo Usuario
              </button>
            )}
          </div>
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
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              ) : usuarios.map((u: Usuario) => {
                const yo = u.id_usu === idUsuario;
                const ocupado = procesandoId === u.id_usu;
                return (
                  <tr key={u.id_usu} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-600">#{u.id_usu}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        {u.username}
                        {yo && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                            TÚ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {puedeEditar && !yo ? (
                        <select
                          value={u.id_rol}
                          disabled={ocupado}
                          onChange={(e) => cambiarRol(u, Number(e.target.value))}
                          className="text-xs font-bold px-2 py-1 rounded-md border border-indigo-300 bg-indigo-50 text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {ROLES_ASIGNABLES.map((r: number) => (
                            <option key={r} value={r}>{ROLES_NOMBRES[r]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-300">
                          {ROLES_NOMBRES[u.id_rol] || `Rol ${u.id_rol}`}
                        </span>
                      )}
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
                      <div className="inline-flex items-center gap-2">
                        {u.id_rol === 1 ? (
                          <span
                            title="El Administrador tiene acceso total por diseño: no se puede modificar"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed"
                          >
                            <Shield size={14} /> Acceso total (fijo)
                          </span>
                        ) : (
                          <button
                            onClick={() => abrirGestorPermisos(u)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs font-medium"
                          >
                            <Shield size={14} /> Gestionar Permisos
                          </button>
                        )}
                        {puedeEditar && (
                          <>
                            {u.id_rol === 4 && (
                              <button
                                onClick={() => { setUsuarioVincular(u); setIdDocVincular(u.id_doc ?? ''); }}
                                disabled={ocupado}
                                title={u.id_doc ? 'Cambiar o quitar el vínculo con el docente' : 'Vincular a ficha de docente'}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition disabled:opacity-50 ${
                                  u.id_doc
                                    ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
                                }`}
                              >
                                {u.id_doc ? <><UserCheck size={14} /> Vinculado</> : <LinkIcon size={14} />}
                              </button>
                            )}
                            <button
                              onClick={() => { setUsuarioReset(u); setNuevaPass(''); }}
                              disabled={ocupado}
                              title="Resetear contraseña"
                              className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition disabled:opacity-50"
                            >
                              <KeyRound size={14} />
                            </button>
                            <button
                              onClick={() => toggleEstatus(u)}
                              disabled={yo || ocupado}
                              title={yo ? 'No puedes desactivarte a ti mismo' : (u.estatus === 'A' ? 'Desactivar' : 'Activar')}
                              className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium border transition disabled:opacity-40 ${
                                u.estatus === 'A'
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                                  : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                              }`}
                            >
                              {u.estatus === 'A' ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Usuario */}
      {modalCrear && createPortal(
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Nuevo Usuario</h2>
              <button onClick={() => setModalCrear(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Username *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="ej: docente1"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500">Mínimo 3 caracteres, sin espacios.</p>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ej: docente1@unem.edu.ve"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Contraseña *</label>
                <div className="relative">
                  <input
                    type={verPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setVerPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title={verPass ? 'Ocultar' : 'Mostrar'}
                  >
                    {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Rol *</label>
                <select
                  value={form.id_rol}
                  onChange={(e) => setForm({ ...form, id_rol: Number(e.target.value), id_doc: '' })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {ROLES_ASIGNABLES.map((r: number) => (
                    <option key={r} value={r}>{ROLES_NOMBRES[r]}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">El rol Estudiante está reservado (sin acceso al sistema).</p>
              </div>
              {form.id_rol === 4 && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Ficha de docente a vincular *
                  </label>
                  <select
                    value={form.id_doc}
                    onChange={(e) => setForm({ ...form, id_doc: e.target.value ? Number(e.target.value) : '' })}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Selecciona un docente sin usuario…</option>
                    {docentesLibres.map((d) => (
                      <option key={d.id_doc} value={d.id_doc}>
                        {d.cedula_nombre}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    Solo se listan docentes activos que aún no tienen un usuario vinculado.
                    El vínculo es obligatorio para el rol Docente (un docente = una cuenta).
                  </p>
                  {docentesLibres.length === 0 && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <b>Sin docentes libres.</b> Todos los docentes activos ya tienen usuario.
                      Desvincula uno desde su fila o registra un docente nuevo primero.
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={() => setModalCrear(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium">
                  Cancelar
                </button>
                <button
                  onClick={crearUsuario}
                  disabled={guardando}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2"
                >
                  <Save size={16} /> {guardando ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Reset de Contraseña */}
      {usuarioReset && createPortal(
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Resetear contraseña</h2>
              <button onClick={() => setUsuarioReset(null)} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Nueva contraseña para <b>{usuarioReset.username}</b>. También se desbloquea la cuenta y se reinician los intentos fallidos.
              </p>
              <input
                type="text"
                value={nuevaPass}
                onChange={(e) => setNuevaPass(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                <button onClick={() => setUsuarioReset(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium">
                  Cancelar
                </button>
                <button
                  onClick={confirmarReset}
                  disabled={reseteando}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2"
                >
                  <KeyRound size={16} /> {reseteando ? 'Guardando...' : 'Resetear'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Vincular / Desvincular docente a usuario existente */}
      {usuarioVincular && createPortal(
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <LinkIcon size={18} /> Vínculo con docente
              </h2>
              <button
                onClick={() => setUsuarioVincular(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Usuario <b>{usuarioVincular.username}</b> (rol {ROLES_NOMBRES[usuarioVincular.id_rol]}).
                Selecciona una ficha de docente para vincular, o deja vacío para desvincular.
              </p>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Ficha de docente</label>
                <select
                  value={idDocVincular}
                  onChange={(e) => setIdDocVincular(e.target.value ? Number(e.target.value) : '')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">— Sin vínculo (desvincular) —</option>
                  {usuarioVincular.id_doc && (
                    <option value={usuarioVincular.id_doc}>
                      {usuarioVincular.docente_vinculado ?? `Docente vinculado (#${usuarioVincular.id_doc})`}
                    </option>
                  )}
                  {docentesLibres.map((d) => (
                    <option key={d.id_doc} value={d.id_doc}>{d.cedula_nombre}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Un docente no puede estar vinculado a dos usuarios. Solo se muestran los libres.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setUsuarioVincular(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarVinculo}
                  disabled={vinculando}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2"
                >
                  <Save size={16} /> {vinculando ? 'Guardando…' : 'Guardar vínculo'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Gestión de Permisos (lógica original intacta) */}
      {isModalOpen && usuarioSeleccionado && createPortal(
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Permisos de {usuarioSeleccionado.username}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Rol base: {ROLES_NOMBRES[usuarioSeleccionado.id_rol]} |
                  Puedes restringir permisos o restaurarlos hasta el máximo del rol.
                  Los accesos prohibidos aparecen bloqueados. Aplica al volver a iniciar sesión.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

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
                          const config = ALCANCE_CONFIG[p.alcance] ?? ALCANCE_CONFIG.NAD;
                          return (
                            <div key={codigo} className={`p-3 rounded-lg border ${
                              p.esPersonalizado ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={p.activo}
                                    disabled={p.alcanceMaximo === 'NAD'}
                                    onChange={() => togglePermiso(modulo.id_mod, codigo)}
                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                  />
                                  <span className="text-xs font-bold text-gray-700">{codigo}</span>
                                </label>
                                {p.esPersonalizado && (
                                  <span className="text-xs text-indigo-600 font-medium">Personalizado</span>
                                )}
                              </div>
                              {p.alcanceMaximo === 'NAD' && (
                                <span className="text-xs text-gray-400">Bloqueado por rol</span>
                              )}
                              {p.activo && (
                                <select
                                  value={p.alcance}
                                  onChange={(e) => cambiarAlcance(modulo.id_mod, codigo, e.target.value as any)}
                                  className={`w-full text-xs px-2 py-1 rounded border ${config.color}`}
                                >
                                  {ALCANCES.filter(a => JERARQUIA[a] <= JERARQUIA[p.alcanceMaximo]).reverse().map(a => (
                                    <option key={a} value={a}>{ALCANCE_CONFIG[a].label}</option>
                                  ))}
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

            <div className="p-6 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={async () => {
                  if (usuarioSeleccionado && window.confirm('¿Restaurar todos los permisos a los valores por defecto del rol?')) {
                    try {
                      await rolesService.resetearPermisos(usuarioSeleccionado.id_usu);
                      toast.success('Permisos restaurados a valores del rol');
                      const data = await rolesService.getPermisosUsuario(usuarioSeleccionado.id_usu);
                      setMatriz(data);
                    } catch {
                      toast.error('Error al restaurar permisos');
                    }
                  }
                }}
                className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition text-sm font-medium"
              >
                Restaurar a valores del rol
              </button>

              <div className="flex gap-3">
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
        </div>,
        document.body
      )}
    </div>
  );
};