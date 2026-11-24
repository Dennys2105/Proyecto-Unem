import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useProgramas } from '../hooks/useProgramas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Programa, ProgramaCreate, ProgramaUpdate } from '../types/models';
import { useAuth } from '../hooks/useAuth';
import {
  BookOpen, Search, Plus, X, AlertCircle, Info,
  Edit, UserX, UserCheck, ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHero } from '../components/PageHero';

interface ColumnDef {
  key: string;
  label: string;
  render?: (value: any, row: Programa) => ReactNode;
  sortable?: boolean;
}

const programaSchema = z.object({
  codigo: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(10, 'Máximo 10 caracteres')
    .regex(/^[A-Z0-9\-]+$/, 'Solo letras mayúsculas, números y guiones'),
  nombre: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .regex(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/, 'Solo letras y espacios')
    .refine((v) => v.trim().length >= 3, 'Escribe al menos 3 letras (no solo espacios)'),
  tipo_sistema: z.enum(['Trimestral', 'Semestral'], { message: 'Seleccione un tipo válido' }),
  total_trayectos: z.string()
    .regex(/^([1-9]|1[0-2])$/, 'Debe ser un número entre 1 y 12')
    .optional()
    .or(z.literal('')),
  total_uc: z.string()
    .regex(/^[1-9][0-9]{0,2}$/, 'Debe ser un número entre 1 y 999')
    .optional()
    .or(z.literal('')),
});

type ProgramaFormData = z.infer<typeof programaSchema>;
type SortKey = 'id_pro' | 'codigo' | 'nombre';
type SortDir = 'asc' | 'desc';

export const Programas = () => {
  const { puede } = useAuth();
  const { programas, isLoading, createPrograma, updatePrograma, isCreating, isUpdating, refetch } = useProgramas();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrograma, setEditingPrograma] = useState<Programa | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('A');
  const [busqueda, setBusqueda] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('id_pro');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProgramaFormData>({
    resolver: zodResolver(programaSchema),
    mode: 'onChange',
    defaultValues: { tipo_sistema: 'Trimestral' },
  });

  const codigoWatch = watch('codigo');
  const nombreWatch = watch('nombre');
  const trayectosWatch = watch('total_trayectos');
  const ucWatch = watch('total_uc');

  // Máscaras de entrada: código en mayúsculas sin espacios/símbolos;
  // nombre solo letras y espacios; trayectos y UC solo dígitos.
  useEffect(() => {
    if (!codigoWatch) return;
    const limpio = codigoWatch.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (limpio !== codigoWatch) setValue('codigo', limpio, { shouldValidate: true });
  }, [codigoWatch, setValue]);

  useEffect(() => {
    if (!nombreWatch) return;
    const limpio = nombreWatch.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]/g, '');
    if (limpio !== nombreWatch) setValue('nombre', limpio, { shouldValidate: true });
  }, [nombreWatch, setValue]);

  useEffect(() => {
    if (!trayectosWatch) return;
    const limpio = trayectosWatch.replace(/\D/g, '').slice(0, 2);
    if (limpio !== trayectosWatch) setValue('total_trayectos', limpio, { shouldValidate: true });
  }, [trayectosWatch, setValue]);

  useEffect(() => {
    if (!ucWatch) return;
    const limpio = ucWatch.replace(/\D/g, '').slice(0, 3);
    if (limpio !== ucWatch) setValue('total_uc', limpio, { shouldValidate: true });
  }, [ucWatch, setValue]);

  const openCreateModal = () => {
    setEditingPrograma(null);
    reset({ codigo: '', nombre: '', tipo_sistema: 'Trimestral', total_trayectos: '', total_uc: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (prog: Programa) => {
    setEditingPrograma(prog);
    reset({
      codigo: prog.codigo ?? '',
      nombre: prog.nombre ?? '',
      tipo_sistema: prog.tipo_sistema === 'Semestral' ? 'Semestral' : 'Trimestral',
      total_trayectos: prog.total_trayectos?.toString() ?? '',
      total_uc: prog.total_uc?.toString() ?? '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingPrograma(null); reset(); };

  const onSubmit = async (data: ProgramaFormData) => {
    const payload = {
      codigo: data.codigo.trim().toUpperCase(),
      nombre: data.nombre.trim().toUpperCase(),
      tipo_sistema: data.tipo_sistema,
      total_trayectos: data.total_trayectos ? parseInt(data.total_trayectos, 10) : undefined,
      total_uc: data.total_uc ? parseInt(data.total_uc, 10) : undefined,
    };

    try {
      if (editingPrograma) {
        await updatePrograma({ id: editingPrograma.id_pro, data: payload as ProgramaUpdate });
        toast.success(`Programa "${data.nombre}" actualizado correctamente`);
      } else {
        await createPrograma(payload as ProgramaCreate);
        toast.success(`Programa "${data.nombre}" registrado exitosamente`);
      }
      closeModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al guardar el programa');
    }
  };

  // Toggle Activar/Desactivar (lógica de borrado lógico)
  const toggleActivacion = async (prog: Programa) => {
    const actual = prog.estatus ?? 'A';
    const nuevoEstatus = actual === 'A' ? 'I' : 'A';
    const accion = nuevoEstatus === 'A' ? 'activado' : 'desactivado';
    try {
      await updatePrograma({ id: prog.id_pro, data: { estatus: nuevoEstatus } as ProgramaUpdate });
      await refetch();
      toast.success(`"${prog.nombre}" ${accion} correctamente`, {
        icon: nuevoEstatus === 'A' ? '✅' : '⚠️',
      });
    } catch {
      toast.error(`No se pudo ${accion} el programa`);
    }
  };

  const programasFiltrados = useMemo(() => {
    if (!programas) return [];
    const filtrados = programas.filter(p => {
      const estatus = p.estatus ?? 'A';
      if (filtroTipo && p.tipo_sistema !== filtroTipo) return false;
      if (filtroEstado && estatus !== filtroEstado) return false;
      if (busqueda) {
        const texto = `${p.codigo} ${p.nombre}`.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
    return [...filtrados].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'id_pro') cmp = (a.id_pro ?? 0) - (b.id_pro ?? 0);
      else if (sortKey === 'codigo') cmp = (a.codigo ?? '').localeCompare(b.codigo ?? '');
      else cmp = (a.nombre ?? '').localeCompare(b.nombre ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [programas, filtroTipo, filtroEstado, busqueda, sortKey, sortDir]);

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="text-gray-400" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />;
  };

  const columns: ColumnDef[] = [
    { key: 'id_pro', label: 'ID', sortable: true },
    { key: 'codigo', label: 'Código', sortable: true, render: (v: any) => <span className="font-mono font-semibold text-gray-900 text-sm">{v}</span> },
    { key: 'nombre', label: 'Nombre', sortable: true, render: (v: any) => <span className="text-sm font-medium text-gray-900">{v}</span> },
    {
      key: 'tipo_sistema', label: 'Tipo',
      render: (v: any) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
          v === 'Trimestral' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
        }`}>{v}</span>
      ),
    },
    { key: 'total_trayectos', label: 'Trayectos', render: (v: any) => <span className="text-sm text-gray-700">{v ?? '—'}</span> },
    { key: 'total_uc', label: 'UC', render: (v: any) => <span className="text-sm text-gray-700">{v ?? '—'}</span> },
    {
      key: 'estatus', label: 'Estado',
      render: (value: any) => {
        const est = value ?? 'A';
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
            est === 'A' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
          }`}>
            {est === 'A' ? <><UserCheck size={12} /> Activo</> : <><UserX size={12} /> Desactivado</>}
          </span>
        );
      },
    },
    {
      key: 'acciones', label: 'Acciones',
      render: (_: any, row: Programa) => {
        const esActivo = (row.estatus ?? 'A') === 'A';
        const puedeEditar = puede('programas', 'ACT', 'LIM');
        const puedeDesactivar = puede('programas', 'BOR', 'TODO');

        if (!puedeEditar && !puedeDesactivar) return <span className="text-xs text-gray-400">Sin permisos</span>;

        return (
          <div className="flex gap-2">
            {puedeEditar && (
              <button onClick={() => openEditModal(row)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                <Edit size={14} /> Editar
              </button>
            )}
            {puedeDesactivar && (
              <button onClick={() => toggleActivacion(row)} disabled={isUpdating} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                esActivo ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}>
                {esActivo ? <UserX size={14} /> : <UserCheck size={14} />}
                {esActivo ? 'Desactivar' : 'Activar'}
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
        icon={BookOpen}
        titulo="Programas Académicos"
        descripcion="Programas Nacionales de Formación (PNF) y licenciaturas. Los programas desactivados no aparecen en listados de secciones, pero pueden reactivarse."
      />

      <section className="unem-card unem-card-pad">
        <div className="unem-toolbar">
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-3)' }} />
            <input type="text" className="unem-input" style={{ paddingLeft: 34 }} placeholder="Buscar por código o nombre…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <select className="unem-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Semestral">Semestral</option>
          </select>
          <select className="unem-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="A">Solo activos</option>
            <option value="I">Solo desactivados</option>
            <option value="">Todos los estados</option>
          </select>
          {puede('programas', 'CRE', 'TODO') && (
            <button className="unem-btn unem-btn-primary" onClick={openCreateModal}>
              <Plus size={15} /> Nuevo Programa
            </button>
          )}
        </div>
      </section>

      {isLoading ? (
        <section className="unem-card unem-card-pad">
          {[0, 1, 2, 3].map((i: number) => <div key={i} className="unem-skel" style={{ height: 40, marginBottom: 10 }} />)}
        </section>
      ) : programasFiltrados.length === 0 ? (
        <div className="unem-empty">
          <span className="unem-empty-i"><BookOpen size={34} /></span>
          <p>No se encontraron programas.</p>
        </div>
      ) : (
        <div className="unem-table-wrap unem-scroll">
          <table className="unem-table">
            <thead>
              <tr>{columns.map((col) => (
                <th key={col.key}>
                  {col.sortable ? (
                    <button className="unem-th-btn" onClick={() => toggleSort(col.key as SortKey)}>
                      {col.label}<SortIcon colKey={col.key as SortKey} />
                    </button>
                  ) : col.label}
                </th>
              ))}</tr>
            </thead>
            <tbody>
              {programasFiltrados.map((prog) => (
                <tr key={prog.id_pro}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render((prog as any)[col.key], prog) : (prog as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--tx-3)', textAlign: 'center' }}>
        Mostrando {programasFiltrados.length} de {programas?.length || 0} programas registrados
        {' · '}Ordenado por <b>{sortKey === 'id_pro' ? 'ID' : sortKey === 'codigo' ? 'Código' : 'Nombre'}</b> ({sortDir === 'asc' ? 'ascendente' : 'descendente'})
      </p>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingPrograma ? 'Editar Programa' : 'Nuevo Programa'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>El código debe ser único, en mayúsculas y sin espacios (Ej: <strong>LPRI</strong>, <strong>LESP</strong>).</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Código *</label>
                  <input type="text" {...register('codigo')} placeholder="Ej: LPRI" maxLength={10} className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 font-mono uppercase ${errors.codigo ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  {errors.codigo && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.codigo.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Tipo de Sistema *</label>
                  <select {...register('tipo_sistema')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                  </select>
                  {errors.tipo_sistema && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.tipo_sistema.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Nombre del Programa *</label>
                <input type="text" {...register('nombre')} placeholder="Ej: PNF en Educación Primaria" className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${errors.nombre ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                {errors.nombre && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.nombre.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Total Trayectos</label>
                  <input type="text" inputMode="numeric" {...register('total_trayectos')} placeholder="Ej: 4" maxLength={2} className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 font-mono ${errors.total_trayectos ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  {errors.total_trayectos && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.total_trayectos.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Total Unidades Crédito (UC)</label>
                  <input type="text" inputMode="numeric" {...register('total_uc')} placeholder="Ej: 200" maxLength={3} className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 font-mono ${errors.total_uc ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  {errors.total_uc && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.total_uc.message}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={isCreating || isUpdating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2">
                  {isCreating || isUpdating ? 'Guardando...' : 'Guardar Programa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};