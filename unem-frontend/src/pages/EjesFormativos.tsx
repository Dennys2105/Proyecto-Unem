import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useEjes } from '../hooks/useEjes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { EjeFormativo, EjeCreate, EjeUpdate } from '../types/models';
import {
  BookOpen, Search, Plus, X, AlertCircle, Info,
  Edit, UserX, UserCheck, ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHero } from '../components/PageHero';
import { useAuth } from '../hooks/useAuth';

interface ColumnDef {
  key: string;
  label: string;
  render?: (value: any, row: EjeFormativo) => ReactNode;
  sortable?: boolean;
}

const ejeSchema = z.object({
  codigo: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(5, 'Máximo 5 caracteres')
    .regex(/^[A-Z0-9]+$/, 'Solo letras mayúsculas y números'),
  nombre: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .regex(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/, 'Solo letras y espacios'),
  descripcion: z.string()
    .min(5, 'Mínimo 5 caracteres')
    .max(250, 'Máximo 250 caracteres'),
});

type EjeFormData = z.infer<typeof ejeSchema>;
type SortKey = 'id_eje' | 'nombre';
type SortDir = 'asc' | 'desc';

export const EjesFormativos = () => {
  const { puede } = useAuth();
  const { ejes, isLoading, createEje, updateEje, isCreating, isUpdating, refetch } = useEjes();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEje, setEditingEje] = useState<EjeFormativo | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('A');
  const [busqueda, setBusqueda] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('id_eje');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EjeFormData>({
    resolver: zodResolver(ejeSchema),
    mode: 'onChange',
  });

  const codigoWatch = watch('codigo');

  useEffect(() => {
    if (codigoWatch) {
      setValue('codigo', codigoWatch.toUpperCase(), { shouldValidate: true });
    }
  }, [codigoWatch, setValue]);

  const openCreateModal = () => {
    setEditingEje(null);
    reset({ codigo: '', nombre: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (eje: EjeFormativo) => {
    setEditingEje(eje);
    reset({
      codigo: eje.codigo ?? '',
      nombre: eje.nombre ?? '',
      descripcion: eje.descripcion ?? '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingEje(null); reset(); };

  const onSubmit = async (data: EjeFormData) => {
    try {
      if (editingEje) {
        await updateEje({ id: editingEje.id_eje, data: data as EjeUpdate });
        toast.success(`Eje "${data.nombre}" actualizado correctamente`);
      } else {
        await createEje(data as EjeCreate);
        toast.success(`Eje "${data.nombre}" registrado exitosamente`);
      }
      closeModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al guardar el eje');
    }
  };

  const toggleRetiro = async (eje: EjeFormativo) => {
    const actual = eje.estatus ?? 'A';
    const nuevoEstatus = actual === 'A' ? 'I' : 'A';
    const accion = nuevoEstatus === 'A' ? 'reincorporado' : 'retirado';
    try {
      await updateEje({ id: eje.id_eje, data: { estatus: nuevoEstatus } as EjeUpdate });
      await refetch();
      toast.success(`"${eje.nombre}" ${accion} correctamente`, {
        icon: nuevoEstatus === 'A' ? '✅' : '📋',
      });
    } catch {
      toast.error(`No se pudo ${accion} el eje`);
    }
  };

  const ejesFiltrados = useMemo(() => {
    if (!ejes) return [];
    const filtrados = ejes.filter(e => {
      const estatus = e.estatus ?? 'A';
      if (filtroEstado && estatus !== filtroEstado) return false;
      if (busqueda) {
        const texto = `${e.codigo} ${e.nombre}`.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
    return [...filtrados].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'id_eje') cmp = (a.id_eje ?? 0) - (b.id_eje ?? 0);
      else cmp = (a.nombre ?? '').localeCompare(b.nombre ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [ejes, filtroEstado, busqueda, sortKey, sortDir]);

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="text-gray-400" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />;
  };

  const columns: ColumnDef[] = [
    { key: 'id_eje', label: 'ID', sortable: true },
    { key: 'codigo', label: 'Código', render: (v: any) => <span className="font-mono font-semibold text-gray-900 text-sm">{v}</span> },
    { key: 'nombre', label: 'Nombre', sortable: true, render: (v: any) => <span className="text-sm font-medium text-gray-900">{v}</span> },
    { key: 'descripcion', label: 'Descripción', render: (v: any) => <span className="text-sm text-gray-600 max-w-xs truncate">{v}</span> },
    {
      key: 'estatus', label: 'Estado',
      render: (value: any) => {
        const est = value ?? 'A';
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
            est === 'A' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            {est === 'A' ? <><UserCheck size={12} /> Activo</> : <><UserX size={12} /> Retirado</>}
          </span>
        );
      },
    },
    {
      key: 'acciones', label: 'Acciones',
      render: (_: any, row: EjeFormativo) => {
        const esActivo = (row.estatus ?? 'A') === 'A';
        const puedeEditar = puede('malla', 'ACT', 'LIM');
        const puedeRetirar = puede('malla', 'BOR', 'LIM');

        if (!puedeEditar && !puedeRetirar) return <span className="unem-chip unem-chip-mut">Sin permisos</span>;

        return (
          <div className="flex flex-wrap gap-2">
            {puedeEditar && (
              <button className="unem-btn unem-btn-sm" onClick={() => openEditModal(row)}>
                <Edit size={14} /> Editar
              </button>
            )}
            {puedeRetirar && (
              <button
                className="unem-btn unem-btn-sm"
                onClick={() => toggleRetiro(row)}
                disabled={isUpdating}
                style={{ color: esActivo ? 'var(--warn)' : 'var(--ok)' }}
              >
                {esActivo ? <UserX size={14} /> : <UserCheck size={14} />}
                {esActivo ? 'Retirar' : 'Reincorporar'}
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
        titulo="Ejes Formativos"
        descripcion="Ejes transversales del currículo (Proyecto, Socio-Crítico, Disciplinario, Epistemológico, Interdisciplinario y Actividades Acreditables). Los ejes retirados no aparecen en materias, pero pueden reincorporarse."
      />

      <section className="unem-card unem-card-pad">
        <div className="unem-toolbar">
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-3)' }} />
            <input type="text" className="unem-input" style={{ paddingLeft: 34 }} placeholder="Buscar por código o nombre…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <select className="unem-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="A">Solo activos</option>
            <option value="I">Solo retirados</option>
            <option value="">Todos los estados</option>
          </select>
          {puede('malla', 'CRE', 'LIM') && (
            <button className="unem-btn unem-btn-primary" onClick={openCreateModal}>
              <Plus size={15} /> Nuevo Eje
            </button>
          )}
        </div>
      </section>

      {isLoading ? (
        <section className="unem-card unem-card-pad">
          {[0, 1, 2, 3].map((i: number) => <div key={i} className="unem-skel" style={{ height: 40, marginBottom: 10 }} />)}
        </section>
      ) : ejesFiltrados.length === 0 ? (
        <div className="unem-empty">
          <span className="unem-empty-i"><BookOpen size={34} /></span>
          <p>No se encontraron ejes formativos.</p>
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
              {ejesFiltrados.map((eje) => (
                <tr key={eje.id_eje}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render((eje as any)[col.key], eje) : (eje as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--tx-3)', textAlign: 'center' }}>
        Mostrando {ejesFiltrados.length} de {ejes?.length || 0} ejes registrados
        {' · '}Ordenado por <b>{sortKey === 'id_eje' ? 'ID' : 'Nombre'}</b> ({sortDir === 'asc' ? 'ascendente' : 'descendente'})
      </p>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingEje ? 'Editar Eje Formativo' : 'Nuevo Eje Formativo'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>El código debe ser corto (máx. 5 caracteres), en mayúsculas y sin espacios (Ej: <strong>PROY</strong>, <strong>SOCR</strong>).</p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Código *</label>
                <input type="text" {...register('codigo')} placeholder="Ej: PROY" maxLength={5} className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 font-mono uppercase ${errors.codigo ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                {errors.codigo && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.codigo.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                <input type="text" {...register('nombre')} placeholder="Ej: Proyecto" className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${errors.nombre ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                {errors.nombre && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.nombre.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Descripción *</label>
                <textarea {...register('descripcion')} rows={3} placeholder="Descripción breve del enfoque del eje..." className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${errors.descripcion ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                {errors.descripcion && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.descripcion.message}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={isCreating || isUpdating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2">
                  {isCreating || isUpdating ? 'Guardando...' : 'Guardar Eje'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};