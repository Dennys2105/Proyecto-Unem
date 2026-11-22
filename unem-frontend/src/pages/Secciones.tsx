import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSecciones } from '../hooks/useSecciones';
import { useProgramas } from '../hooks/useProgramas';
import { usePeriodos } from '../hooks/usePeriodos';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Seccion, SeccionCreate, SeccionUpdate } from '../types/models';
import { descargarEstudiantesSeccion } from '../utils/descargas';
import { useAuth } from '../hooks/useAuth';
import {
  Layers, Search, Plus, X, AlertCircle, Info,
  CheckCircle2, XCircle, Edit, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHero } from '../components/PageHero';

const aRomano = (n: number): string => {
  const romanos = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return romanos[n - 1] || n.toString();
};

interface ColumnDef {
  key: string;
  label: string;
  render?: (value: any, row: Seccion) => ReactNode;
}

const seccionSchema = z.object({
  codigo: z.string()
    .min(3, 'El código debe tener al menos 3 caracteres')
    .regex(/^[A-Z0-9.\-]+$/, 'Solo mayúsculas, números, puntos y guiones'),
  trayecto: z.string().min(1, 'Selecciona un trayecto'),
  periodo: z.string().min(1, 'Selecciona un período'),
  id_per: z.string().min(1, 'Selecciona el período académico'),
  capacidad_maxima: z.string()
    .min(1, 'La capacidad es obligatoria')
    .regex(/^[1-9][0-9]*$/, 'Debe ser un número válido mayor a 0'),
  id_pro: z.string().min(1, 'Selecciona un programa'),
});

type SeccionFormData = z.infer<typeof seccionSchema>;

export const Secciones = () => {
  const { puede } = useAuth();
  const { secciones, isLoading, createSeccion, updateSeccion, isCreating, isUpdating } = useSecciones();
  const { programas } = useProgramas();
  const { periodos } = usePeriodos();

  const listaProgramas: any[] = Array.isArray(programas) ? programas : [];
  const listaPeriodos = Array.isArray(periodos) ? periodos : [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeccion, setEditingSeccion] = useState<Seccion | null>(null);
  const [filtroPrograma, setFiltroPrograma] = useState<string>('');
  const [filtroTrayecto, setFiltroTrayecto] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('A');
  const [busqueda, setBusqueda] = useState<string>('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SeccionFormData>({
    resolver: zodResolver(seccionSchema),
  });

  const openCreateModal = () => {
    setEditingSeccion(null);
    reset({ codigo: '', trayecto: '', periodo: '', id_per: '', capacidad_maxima: '', id_pro: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (sec: Seccion) => {
    setEditingSeccion(sec);
    reset({
      codigo: sec.codigo ?? '',
      trayecto: (sec.trayecto ?? 1).toString(),
      periodo: (sec.periodo ?? 1).toString(),
      id_per: sec.id_per?.toString() ?? '',
      capacidad_maxima: (sec.capacidad_maxima ?? 30).toString(), // ✅ FIX: usa capacidad_maxima con fallback
      id_pro: sec.id_pro?.toString() ?? '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSeccion(null);
    reset();
  };

  const onSubmit = async (data: SeccionFormData) => {
    const payload = {
      codigo: data.codigo.trim().toUpperCase(),
      trayecto: parseInt(data.trayecto, 10),
      periodo: parseInt(data.periodo, 10),
      id_per: parseInt(data.id_per, 10),
      capacidad_maxima: parseInt(data.capacidad_maxima, 10), // ✅ FIX: envía capacidad_maxima
      id_pro: parseInt(data.id_pro, 10),
    };

    try {
      if (editingSeccion) {
        await updateSeccion({ id: editingSeccion.id_sec, data: payload as SeccionUpdate });
        toast.success(`Sección "${data.codigo}" actualizada correctamente`);
      } else {
        await createSeccion(payload as SeccionCreate);
        toast.success(`Sección "${data.codigo}" creada exitosamente`);
      }
      closeModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al guardar la sección');
    }
  };

  const toggleStatus = async (sec: Seccion) => {
    const actual = sec.estatus ?? 'A'; // ✅ FIX: fallback si estatus es undefined
    const nuevoEstatus = actual === 'A' ? 'I' : 'A';
    const accion = nuevoEstatus === 'A' ? 'activada' : 'desactivada';

    try {
      await updateSeccion({
        id: sec.id_sec,
        data: { estatus: nuevoEstatus } as SeccionUpdate,
      });
      toast.success(`Sección "${sec.codigo}" ${accion} correctamente`, {
        icon: nuevoEstatus === 'A' ? '✅' : '⛔',
        duration: 3000,
      });
    } catch {
      toast.error(`No se pudo ${accion} la sección`);
    }
  };

  const seccionesFiltradas = useMemo(() => {
    if (!secciones) return [];
    return secciones.filter(s => {
      if (filtroPrograma && s.id_pro?.toString() !== filtroPrograma) return false;
      if (filtroTrayecto && s.trayecto.toString() !== filtroTrayecto) return false;
      if (filtroEstado && s.estatus !== filtroEstado) return false;
      if (busqueda) {
        const texto = `${s.codigo} ${s.programa?.nombre || ''}`.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
  }, [secciones, filtroPrograma, filtroTrayecto, filtroEstado, busqueda]);

  const columns: ColumnDef[] = [
    { key: 'id_sec', label: 'ID' },
    {
      key: 'codigo',
      label: 'Código',
      render: (value: any) => <span className="font-mono font-semibold text-gray-900 text-sm">{value}</span>,
    },
    {
      key: 'trayecto',
      label: 'Trayecto',
      render: (value: any) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs">
          {aRomano(value)}
        </span>
      ),
    },
    {
      key: 'periodo',
      label: 'Período',
      render: (value: any) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
          {aRomano(value)}
        </span>
      ),
    },
    {
      key: 'periodo_academico',
      label: 'Período académico',
      render: (_: any, row: Seccion) => (
        <span className="text-sm text-gray-700">
          {row.periodo_academico
            ? `${row.periodo_academico.nombre} · hasta ${row.periodo_academico.fecha_fin}`
            : 'Sin período asignado'}
        </span>
      ),
    },
    {
      key: 'periodo_finalizado',
      label: 'Vigencia académica',
      render: (_: any, row: Seccion) => {
        const finalizado = row.id_per !== null && row.periodo_finalizado;
        const label = row.id_per === null ? 'Sin período' : finalizado ? 'Finalizado' : 'En curso';
        return (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
            row.id_per === null
              ? 'bg-gray-100 text-gray-600'
              : finalizado
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
          }`}>
            {label}
          </span>
        );
      },
    },
    {
      key: 'capacidad_maxima', // ✅ FIX: nombre correcto de la columna
      label: 'Capacidad',
      render: (value: any) => <span className="text-sm text-gray-700">{value} est.</span>,
    },
    {
      key: 'programa',
      label: 'Programa',
      render: (_: any, row: Seccion) => (
        <span className="text-sm text-gray-700">{row.programa?.codigo || `Prog. ${row.id_pro}`}</span>
      ),
    },
    {
      key: 'estatus',
      label: 'Estado',
      render: (value: any) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
          value === 'A' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {value === 'A' ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (_: any, row: Seccion) => {
        const isActive = row.estatus === 'A';
        const puedeEditar = puede('secciones', 'ACT', 'LIM');
        const puedeDesactivar = puede('secciones', 'BOR', 'TODO');

        return (
          <div className="flex gap-2">
            {puedeEditar && (
              <button
                onClick={() => openEditModal(row)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                title="Editar sección"
              >
                <Edit size={14} /> Editar
              </button>
            )}
            <button
              onClick={() => descargarEstudiantesSeccion(row.id_sec)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
              title="Listado de estudiantes de la sección en Excel"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            {puedeDesactivar && (
              <button
                onClick={() => toggleStatus(row)}
                disabled={isUpdating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                  isActive ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                }`}
                title={isActive ? 'Desactivar sección' : 'Activar sección'}
              >
                {isActive ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                {isActive ? 'Desactivar' : 'Activar'}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="unem-page">
      <PageHero
        icon={Layers}
        titulo="Secciones"
        descripcion={<>Grupos de estudiantes organizados por <b>programa, trayecto y período académico</b>. Cada sección tiene un código institucional único y una capacidad máxima.</>}
      />

      <section className="unem-card unem-card-pad">
        <div className="mb-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Info size={18} className="shrink-0 mt-0.5" />
          <p>Asigna un período académico a cada sección existente. Al pasar su fecha de fin se bloquearán nuevas matrículas y asignaciones; el estado administrativo Activo/Inactivo no se modificará automáticamente.</p>
        </div>
        <div className="unem-toolbar">
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-3)' }} />
            <input type="text" className="unem-input" style={{ paddingLeft: 34 }} placeholder="Buscar por código o programa…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <select className="unem-select" value={filtroPrograma} onChange={(e) => setFiltroPrograma(e.target.value)}>
            <option value="">Todos los programas</option>
            {listaProgramas.map((p) => (
              <option key={p.id_pro} value={p.id_pro}>{p.codigo} — {p.nombre}</option>
            ))}
          </select>
          <select className="unem-select" value={filtroTrayecto} onChange={(e) => setFiltroTrayecto(e.target.value)}>
            <option value="">Todos los trayectos</option>
            {[1, 2, 3, 4].map((t: number) => <option key={t} value={t}>Trayecto {aRomano(t)}</option>)}
          </select>
          <select className="unem-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="A">Activos</option>
            <option value="I">Inactivos</option>
          </select>
          {puede('secciones', 'CRE', 'TODO') && (
            <button className="unem-btn unem-btn-primary" onClick={openCreateModal}>
              <Plus size={15} /> Nueva Sección
            </button>
          )}
        </div>
      </section>

      {isLoading ? (
        <section className="unem-card unem-card-pad">
          {[0, 1, 2, 3].map((i: number) => <div key={i} className="unem-skel" style={{ height: 40, marginBottom: 10 }} />)}
        </section>
      ) : seccionesFiltradas.length === 0 ? (
        <div className="unem-empty">
          <span className="unem-empty-i"><Layers size={34} /></span>
          <p>No se encontraron secciones.</p>
        </div>
      ) : (
        <div className="unem-table-wrap unem-scroll">
          <table className="unem-table">
            <thead>
              <tr>
                {columns.map((col) => <th key={col.key}>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {seccionesFiltradas.map((sec) => (
                <tr key={sec.id_sec}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render((sec as any)[col.key], sec) : (sec as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--tx-3)', textAlign: 'center' }}>
        Mostrando {seccionesFiltradas.length} de {secciones?.length || 0} secciones registradas
      </p>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingSeccion ? 'Editar Sección' : 'Nueva Sección'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>El <strong>código</strong> debe seguir el formato institucional (ej: <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">NT.2021.AESP.20.01</code>).</p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Código *</label>
                <input type="text" {...register('codigo')} placeholder="Ej: NT.2021.AESP.20.01" className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase" />
                {errors.codigo && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.codigo.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Programa *</label>
                  <select {...register('id_pro')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">Selecciona</option>
                    {listaProgramas.map((p) => <option key={p.id_pro} value={p.id_pro}>{p.codigo} - {p.nombre}</option>)}
                  </select>
                  {errors.id_pro && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.id_pro.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Capacidad Máx. *</label>
                  <input type="text" inputMode="numeric" {...register('capacidad_maxima')} placeholder="Ej: 30" className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  {errors.capacidad_maxima && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.capacidad_maxima.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Período académico *</label>
                  <select {...register('id_per')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">Selecciona el período</option>
                    {listaPeriodos.map((p) => (
                      <option key={p.id_per} value={p.id_per}>
                        {p.nombre} ({p.tipo}) · hasta {p.fecha_fin}
                      </option>
                    ))}
                  </select>
                  {errors.id_per && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.id_per.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Trayecto *</label>
                  <select {...register('trayecto')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">Selecciona</option>
                    {[1, 2, 3, 4].map(t => <option key={t} value={t}>Trayecto {aRomano(t)}</option>)}
                  </select>
                  {errors.trayecto && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.trayecto.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Período *</label>
                  <select {...register('periodo')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">Selecciona</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => <option key={p} value={p}>Período {aRomano(p)}</option>)}
                  </select>
                  {errors.periodo && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.periodo.message}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={isCreating || isUpdating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2">
                  {isCreating || isUpdating ? 'Guardando...' : 'Guardar Sección'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};