import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useMunicipios } from '../hooks/useMunicipios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Municipio, MunicipioCreate, MunicipioUpdate } from '../types/models';
import {
  MapPin, Search, Plus, X, AlertCircle, Info,
  Edit, UserX, UserCheck, ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHero } from '../components/PageHero';
import { useAuth } from '../hooks/useAuth';

interface ColumnDef {
  key: string;
  label: string;
  render?: (value: any, row: Municipio) => ReactNode;
  sortable?: boolean;
}

const municipioSchema = z.object({
  nombre: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .regex(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/, 'Solo letras y espacios'),
});

type MunicipioFormData = z.infer<typeof municipioSchema>;
type SortKey = 'id_mun' | 'nombre';
type SortDir = 'asc' | 'desc';

export const Municipios = () => {
  const { puede } = useAuth();
  const { municipios, isLoading, createMunicipio, updateMunicipio, isCreating, isUpdating, refetch } = useMunicipios();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMunicipio, setEditingMunicipio] = useState<Municipio | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('A');
  const [busqueda, setBusqueda] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('id_mun');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<MunicipioFormData>({
    resolver: zodResolver(municipioSchema),
    mode: 'onChange',
  });

  const nombreWatch = watch('nombre');

  // ✅ Autocompletado en vivo: convierte a mayúsculas automáticamente
  useEffect(() => {
    if (nombreWatch) {
      setValue('nombre', nombreWatch.toUpperCase(), { shouldValidate: true });
    }
  }, [nombreWatch, setValue]);

  const openCreateModal = () => {
    setEditingMunicipio(null);
    reset({ nombre: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (mun: Municipio) => {
    setEditingMunicipio(mun);
    reset({ nombre: mun.nombre ?? '' });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingMunicipio(null); reset(); };

  const onSubmit = async (data: MunicipioFormData) => {
    try {
      if (editingMunicipio) {
        await updateMunicipio({ id: editingMunicipio.id_mun, data: { nombre: data.nombre.trim().toUpperCase() } as MunicipioUpdate });
        toast.success(`Municipio "${data.nombre}" actualizado correctamente`);
      } else {
        await createMunicipio({ nombre: data.nombre.trim().toUpperCase() } as MunicipioCreate);
        toast.success(`Municipio "${data.nombre}" registrado exitosamente`);
      }
      closeModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al guardar el municipio');
    }
  };

  // ✅ Toggle Activar/Desactivar (lógica de borrado lógico)
  const toggleActivacion = async (mun: Municipio) => {
    const actual = mun.estatus ?? 'A';
    const nuevoEstatus = actual === 'A' ? 'I' : 'A';
    const accion = nuevoEstatus === 'A' ? 'activado' : 'desactivado';
    try {
      await updateMunicipio({ id: mun.id_mun, data: { estatus: nuevoEstatus } as MunicipioUpdate });
      await refetch();
      toast.success(`"${mun.nombre}" ${accion} correctamente`, {
        icon: nuevoEstatus === 'A' ? '✅' : '⚠️',
      });
    } catch {
      toast.error(`No se pudo ${accion} el municipio`);
    }
  };

  const municipiosFiltrados = useMemo(() => {
    if (!municipios) return [];
    const filtrados = municipios.filter(m => {
      const estatus = m.estatus ?? 'A';
      if (filtroEstado && estatus !== filtroEstado) return false;
      if (busqueda) {
        const texto = m.nombre.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
    return [...filtrados].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'id_mun') cmp = (a.id_mun ?? 0) - (b.id_mun ?? 0);
      else cmp = (a.nombre ?? '').localeCompare(b.nombre ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [municipios, filtroEstado, busqueda, sortKey, sortDir]);

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="text-gray-400" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />;
  };

  const columns: ColumnDef[] = [
    { key: 'id_mun', label: 'ID', sortable: true },
    { key: 'nombre', label: 'Nombre', sortable: true, render: (v: any) => <span className="text-sm font-medium text-gray-900">{v}</span> },
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
      render: (_: any, row: Municipio) => {
        const esActivo = (row.estatus ?? 'A') === 'A';
        const puedeEditar = puede('municipios', 'ACT', 'TODO');
        const puedeDesactivar = puede('municipios', 'BOR', 'TODO');

        if (!puedeEditar && !puedeDesactivar) return <span className="unem-chip unem-chip-mut">Sin permisos</span>;

        return (
          <div className="flex flex-wrap gap-2">
            {puedeEditar && (
              <button className="unem-btn unem-btn-sm" onClick={() => openEditModal(row)}>
                <Edit size={14} /> Editar
              </button>
            )}
            {puedeDesactivar && (
              <button
                className="unem-btn unem-btn-sm"
                onClick={() => toggleActivacion(row)}
                disabled={isUpdating}
                style={{ color: esActivo ? 'var(--warn)' : 'var(--ok)' }}
              >
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
        icon={MapPin}
        titulo="Municipios"
        descripcion="Catálogo del estado Táchira. Los municipios desactivados no aparecen en los listados de selección, pero pueden reactivarse."
      />

      <section className="unem-card unem-card-pad">
        <div className="unem-toolbar">
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-3)' }} />
            <input type="text" className="unem-input" style={{ paddingLeft: 34 }} placeholder="Buscar por nombre…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <select className="unem-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="A">Solo activos</option>
            <option value="I">Solo desactivados</option>
            <option value="">Todos los estados</option>
          </select>
          {puede('municipios', 'CRE', 'TODO') && (
            <button className="unem-btn unem-btn-primary" onClick={openCreateModal}>
              <Plus size={15} /> Nuevo Municipio
            </button>
          )}
        </div>
      </section>

      {isLoading ? (
        <section className="unem-card unem-card-pad">
          {[0, 1, 2, 3].map((i: number) => <div key={i} className="unem-skel" style={{ height: 40, marginBottom: 10 }} />)}
        </section>
      ) : municipiosFiltrados.length === 0 ? (
        <div className="unem-empty">
          <span className="unem-empty-i"><MapPin size={34} /></span>
          <p>No se encontraron municipios.</p>
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
              {municipiosFiltrados.map((mun) => (
                <tr key={mun.id_mun}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render((mun as any)[col.key], mun) : (mun as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--tx-3)', textAlign: 'center' }}>
        Mostrando {municipiosFiltrados.length} de {municipios?.length || 0} municipios registrados
        {' · '}Ordenado por <b>{sortKey === 'id_mun' ? 'ID' : 'Nombre'}</b> ({sortDir === 'asc' ? 'ascendente' : 'descendente'})
      </p>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingMunicipio ? 'Editar Municipio' : 'Nuevo Municipio'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>El nombre se convertirá automáticamente a mayúsculas. Solo se permiten letras y espacios.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Nombre del Municipio *</label>
                <input type="text" {...register('nombre')} placeholder="Ej: SAN CRISTÓBAL" className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 uppercase ${errors.nombre ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                {errors.nombre && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.nombre.message}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={isCreating || isUpdating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2">
                  {isCreating || isUpdating ? 'Guardando...' : 'Guardar Municipio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};