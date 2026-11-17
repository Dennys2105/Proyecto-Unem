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
        return (
          <div className="flex gap-2">
            <button onClick={() => openEditModal(row)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
              <Edit size={14} /> Editar
            </button>
            <button onClick={() => toggleActivacion(row)} disabled={isUpdating} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
              esActivo ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}>
              {esActivo ? <UserX size={14} /> : <UserCheck size={14} />}
              {esActivo ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="bg-indigo-100 p-3 rounded-xl"><MapPin className="text-indigo-600" size={32} /></div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Municipios</h1>
          <p className="text-gray-600 mt-1 max-w-3xl">
            Catálogo de municipios del estado Táchira. Los municipios desactivados no aparecen en listados de selección pero pueden reactivarse.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="A">Solo activos</option>
            <option value="I">Solo desactivados</option>
            <option value="">Todos los estados</option>
          </select>
          <button onClick={openCreateModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm whitespace-nowrap">
            <Plus size={16} /> Nuevo Municipio
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div><p className="text-gray-500 mt-4">Cargando municipios...</p></div>
        ) : municipiosFiltrados.length === 0 ? (
          <div className="p-12 text-center"><MapPin className="mx-auto text-gray-300 mb-3" size={48} /><p className="text-gray-500 font-medium">No se encontraron municipios</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{columns.map(col => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    {col.sortable ? (
                      <button onClick={() => toggleSort(col.key as SortKey)} className="inline-flex items-center gap-1 hover:text-indigo-700 transition uppercase">
                        {col.label}<SortIcon colKey={col.key as SortKey} />
                      </button>
                    ) : col.label}
                  </th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {municipiosFiltrados.map(mun => (
                  <tr key={mun.id_mun} className="hover:bg-gray-50 transition">
                    {columns.map(col => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                        {col.render ? col.render((mun as any)[col.key], mun) : (mun as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        Mostrando {municipiosFiltrados.length} de {municipios?.length || 0} municipios registrados
        {' · '}Ordenado por <span className="font-semibold">{sortKey === 'id_mun' ? 'ID' : 'Nombre'}</span> ({sortDir === 'asc' ? 'ascendente' : 'descendente'})
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