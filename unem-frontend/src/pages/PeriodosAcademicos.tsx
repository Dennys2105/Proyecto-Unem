import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { usePeriodos } from '../hooks/usePeriodos';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import type { PeriodoAcademico, PeriodoCreate, PeriodoUpdate } from '../types/models';
import { useAuth } from '../hooks/useAuth';
import {
  CalendarDays, Search, Plus, X, AlertCircle, Info,
  Edit, UserX, UserCheck, ArrowUp, ArrowDown, ArrowUpDown,
  Star, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHero } from '../components/PageHero';

interface ColumnDef {
  key: string;
  label: string;
  render?: (value: any, row: PeriodoAcademico) => ReactNode;
  sortable?: boolean;
}

const aRomano = (n: number): string => {
  const romanos = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  return romanos[n - 1] || n.toString();
};

const periodoSchema = z.object({
  nombre: z.string().min(3, 'Mínimo 3 caracteres').max(50, 'Máximo 50 caracteres'),
  anio: z.string()
    .regex(/^[0-9]{4}$/, 'Debe ser un año de 4 dígitos')
    .refine(v => { const n = parseInt(v, 10); return n >= 2000 && n <= 2100; }, 'Año entre 2000 y 2100'),
  numero_periodo: z.string()
    .regex(/^[1-9][0-9]?$/, 'Debe ser un número entre 1 y 12')
    .refine(v => { const n = parseInt(v, 10); return n >= 1 && n <= 12; }, 'Debe ser entre 1 y 12'),
  tipo: z.enum(['Trimestre', 'Semestre'], { message: 'Selecciona Trimestre o Semestre' }),
  fecha_inicio: z.string().min(1, 'Fecha de inicio obligatoria'),
  fecha_fin: z.string().min(1, 'Fecha de fin obligatoria'),
}).refine(data => data.fecha_inicio < data.fecha_fin, {
  message: 'La fecha de fin debe ser posterior a la de inicio',
  path: ['fecha_fin'],
});

type PeriodoFormData = z.infer<typeof periodoSchema>;
type SortKey = 'id_per' | 'anio' | 'fecha_inicio';
type SortDir = 'asc' | 'desc';

export const Periodos = () => {
  const { esAdmin, esVicerrector } = useAuth();
  const puedeAdministrarPeriodo = esAdmin;
  const puedeCerrarOCambiarVigencia = esAdmin || esVicerrector;
  const {
    periodos, isLoading, createPeriodo, updatePeriodo,
    activarPeriodo, cerrarPeriodo, isCreating, isUpdating, isActivating, isClosing, refetch
  } = usePeriodos();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriodo, setEditingPeriodo] = useState<PeriodoAcademico | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('A');
  const [busqueda, setBusqueda] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('id_per');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PeriodoFormData>({
    resolver: zodResolver(periodoSchema),
    mode: 'onChange',
    defaultValues: { tipo: 'Trimestre', numero_periodo: '1' },
  });

  const tipoWatch = watch('tipo');
  const anioWatch = watch('anio');
  const numeroWatch = watch('numero_periodo');
  const nombreWatch = watch('nombre');

  useEffect(() => {
    if (!editingPeriodo && !nombreWatch && tipoWatch && anioWatch && numeroWatch) {
      const generado = `${tipoWatch} ${anioWatch}-${aRomano(parseInt(numeroWatch, 10))}`;
      setValue('nombre', generado, { shouldValidate: true });
    }
  }, [tipoWatch, anioWatch, numeroWatch]);

  const openCreateModal = () => {
    setEditingPeriodo(null);
    reset({ nombre: '', anio: new Date().getFullYear().toString(), numero_periodo: '1', tipo: 'Trimestre', fecha_inicio: '', fecha_fin: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (per: PeriodoAcademico) => {
    setEditingPeriodo(per);
    reset({
      nombre: per.nombre ?? '',
      anio: (per.anio ?? new Date().getFullYear()).toString(),
      numero_periodo: (per.numero_periodo ?? 1).toString(),
      tipo: per.tipo === 'Semestre' ? 'Semestre' : 'Trimestre',
      fecha_inicio: per.fecha_inicio ?? '',
      fecha_fin: per.fecha_fin ?? '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingPeriodo(null); reset(); };

  const onSubmit = async (data: PeriodoFormData) => {
    const payload = {
      nombre: data.nombre.trim(),
      anio: parseInt(data.anio, 10),
      numero_periodo: parseInt(data.numero_periodo, 10),
      tipo: data.tipo,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
    };

    try {
      if (editingPeriodo) {
        await updatePeriodo({ id: editingPeriodo.id_per, data: payload as PeriodoUpdate });
        toast.success(`Período "${data.nombre}" actualizado correctamente`);
      } else {
        await createPeriodo(payload as PeriodoCreate);
        toast.success(`Período "${data.nombre}" registrado exitosamente`);
      }
      closeModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al guardar el período');
    }
  };

  const activarVigente = async (per: PeriodoAcademico) => {
    const vigenteDelTipo = periodos?.find(
      (periodo) => periodo.tipo === per.tipo && periodo.activo && (periodo.estatus ?? 'A') === 'A',
    );
    const advertencia = vigenteDelTipo && vigenteDelTipo.id_per !== per.id_per
      ? ` Esto cerrará "${vigenteDelTipo.nombre}" y bloqueará la edición de sus calificaciones.`
      : '';
    if (!window.confirm(`¿Activar o reabrir "${per.nombre}"?${advertencia}`)) return;

    try {
      await activarPeriodo(per.id_per);
      await refetch();
      toast.success(`"${per.nombre}" es ahora el período vigente`, { icon: '⭐' });
    } catch (error: unknown) {
      const detail = isAxiosError<{ detail?: unknown }>(error) ? error.response?.data?.detail : undefined;
      toast.error(typeof detail === 'string' ? detail : 'No se pudo activar el período');
    }
  };

  const cerrarVigencia = async (per: PeriodoAcademico) => {
    const confirmado = window.confirm(
      `¿Cerrar "${per.nombre}"? Al dejar de estar vigente, no se podrán modificar sus calificaciones.`,
    );
    if (!confirmado) return;

    try {
      await cerrarPeriodo(per.id_per);
      await refetch();
      toast.success(`"${per.nombre}" fue cerrado y ya no está vigente`);
    } catch (error: unknown) {
      const detail = isAxiosError<{ detail?: unknown }>(error) ? error.response?.data?.detail : undefined;
      toast.error(typeof detail === 'string' ? detail : 'No se pudo cerrar el período');
    }
  };

  const toggleRetiro = async (per: PeriodoAcademico) => {
    const actual = per.estatus ?? 'A';
    if (actual === 'A' && per.activo) {
      toast.error('Cierra la vigencia antes de retirar el período');
      return;
    }
    const nuevoEstatus = actual === 'A' ? 'I' : 'A';
    const accion = nuevoEstatus === 'A' ? 'reincorporado' : 'retirado';
    try {
      await updatePeriodo({ id: per.id_per, data: { estatus: nuevoEstatus } as PeriodoUpdate });
      await refetch();
      toast.success(`"${per.nombre}" ${accion} correctamente`, {
        icon: nuevoEstatus === 'A' ? '✅' : '📋',
      });
    } catch {
      toast.error(`No se pudo ${accion} el período`);
    }
  };

  const periodosFiltrados = useMemo(() => {
    if (!periodos) return [];
    const filtrados = periodos.filter((p: PeriodoAcademico) => {  
      const estatus = p.estatus ?? 'A';
      if (filtroTipo && p.tipo !== filtroTipo) return false;
      if (filtroEstado && estatus !== filtroEstado) return false;
      if (busqueda) {
        const texto = `${p.nombre} ${p.anio} ${p.tipo}`.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
    return [...filtrados].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'id_per') cmp = (a.id_per ?? 0) - (b.id_per ?? 0);
      else if (sortKey === 'anio') cmp = (a.anio ?? 0) - (b.anio ?? 0);
      else cmp = (a.fecha_inicio ?? '').localeCompare(b.fecha_inicio ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [periodos, filtroTipo, filtroEstado, busqueda, sortKey, sortDir]);

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="text-gray-400" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />;
  };

  const columns: ColumnDef[] = [
    { key: 'id_per', label: 'ID', sortable: true },
    {
      key: 'nombre', label: 'Nombre',
      render: (v: any, row: PeriodoAcademico) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{v}</span>
          {row.activo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
              <Star size={10} fill="currentColor" /> Vigente
            </span>
          )}
        </div>
      ),
    },
    { key: 'anio', label: 'Año', sortable: true, render: (v: any) => <span className="font-mono text-sm">{v}</span> },
    {
      key: 'numero_periodo', label: 'N.º',
      render: (v: any) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs">
          {aRomano(v)}
        </span>
      ),
    },
    {
      key: 'tipo', label: 'Tipo',
      render: (v: any) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
          v === 'Trimestre' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
        }`}>{v}</span>
      ),
    },
    { key: 'fecha_inicio', label: 'Inicio', sortable: true, render: (v: any) => <span className="text-sm text-gray-700">{v}</span> },
    { key: 'fecha_fin', label: 'Fin', render: (v: any) => <span className="text-sm text-gray-700">{v}</span> },
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
      render: (_: any, row: PeriodoAcademico) => {
        const esVigente = row.activo === true;
        const esActivo = (row.estatus ?? 'A') === 'A';
        return (
          <div className="flex gap-2 flex-wrap">
            {puedeAdministrarPeriodo && (
              <button onClick={() => openEditModal(row)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                <Edit size={14} /> Editar
              </button>
            )}
            {esVigente && puedeCerrarOCambiarVigencia ? (
              <button onClick={() => cerrarVigencia(row)} disabled={isClosing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 bg-white text-amber-700 hover:bg-amber-50 border border-amber-300" title="Cerrar el período; sus calificaciones dejarán de ser editables">
                <Star size={14} /> Cerrar período
              </button>
            ) : esActivo && puedeCerrarOCambiarVigencia && (
              <button onClick={() => activarVigente(row)} disabled={isActivating} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200" title="Marcar como período vigente">
                <Sparkles size={14} /> Activar / reabrir
              </button>
            )}
            {puedeAdministrarPeriodo && (
              <button onClick={() => toggleRetiro(row)} disabled={isUpdating || (esActivo && esVigente)} title={esActivo && esVigente ? 'Cierra primero el período vigente' : undefined} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                esActivo ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}>
                {esActivo ? <UserX size={14} /> : <UserCheck size={14} />}
                {esActivo ? 'Retirar' : 'Reincorporar'}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const vigentes = periodos
    ?.filter((p: PeriodoAcademico) => p.activo === true && (p.estatus ?? 'A') === 'A')
    .sort((a, b) => a.tipo.localeCompare(b.tipo)) ?? [];

  return (
    <div className="unem-page">
      <PageHero
        icon={CalendarDays}
        titulo="Períodos Académicos"
        descripcion={<>Trimestres y semestres. Solo <b>un período vigente por tipo</b> (LPRI trimestral y LESP semestral coexisten). Los retirados no aparecen en listados, pero pueden reincorporarse.</>}
      />

      <section className="unem-card unem-card-pad">
        <div className="unem-toolbar">
          {vigentes.map((periodo) => (
            <span key={periodo.id_per} className="unem-chip unem-chip-soft">
              <Star size={13} /> {periodo.tipo} vigente: {periodo.nombre}
            </span>
          ))}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-3)' }} />
            <input type="text" className="unem-input" style={{ paddingLeft: 34 }} placeholder="Buscar por nombre o año…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <select className="unem-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="Trimestre">Trimestre</option>
            <option value="Semestre">Semestre</option>
          </select>
          <select className="unem-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="A">Solo activos</option>
            <option value="I">Solo retirados</option>
            <option value="">Todos los estados</option>
          </select>
          {puedeAdministrarPeriodo && (
            <button className="unem-btn unem-btn-primary" onClick={openCreateModal}>
              <Plus size={15} /> Nuevo Período
            </button>
          )}
        </div>
      </section>

      {isLoading ? (
        <section className="unem-card unem-card-pad">
          {[0, 1, 2].map((i: number) => <div key={i} className="unem-skel" style={{ height: 40, marginBottom: 10 }} />)}
        </section>
      ) : periodosFiltrados.length === 0 ? (
        <div className="unem-empty">
          <span className="unem-empty-i"><CalendarDays size={34} /></span>
          <p>No se encontraron períodos.</p>
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
              {periodosFiltrados.map((per) => (
                <tr key={per.id_per} data-sel={per.activo === true}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render((per as any)[col.key], per) : (per as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--tx-3)', textAlign: 'center' }}>
        Mostrando {periodosFiltrados.length} de {periodos?.length || 0} períodos registrados
        {' · '}Ordenado por <b>{sortKey === 'id_per' ? 'ID' : sortKey === 'anio' ? 'Año' : 'Inicio'}</b> ({sortDir === 'asc' ? 'ascendente' : 'descendente'})
      </p>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingPeriodo ? 'Editar Período' : 'Nuevo Período'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>El nombre se autocompleta con tipo + año + período. La fecha de fin debe ser posterior a la de inicio.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Tipo *</label>
                  <select {...register('tipo')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="Trimestre">Trimestre</option>
                    <option value="Semestre">Semestre</option>
                  </select>
                  {errors.tipo && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.tipo.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Año *</label>
                  <input type="text" inputMode="numeric" {...register('anio')} maxLength={4} placeholder="2025" className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 font-mono ${errors.anio ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  {errors.anio && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.anio.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">N.º de Período (1-12) *</label>
                  <input type="text" inputMode="numeric" {...register('numero_periodo')} maxLength={2} placeholder="1" className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 font-mono ${errors.numero_periodo ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  {errors.numero_periodo && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.numero_periodo.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Vista previa</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-mono text-gray-700">
                    {tipoWatch || 'Trimestre'} {anioWatch || '____'}-{numeroWatch ? aRomano(parseInt(numeroWatch, 10)) : 'I'}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                <input type="text" {...register('nombre')} placeholder="Ej: Trimestre 2025-I" className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${errors.nombre ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                {errors.nombre && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.nombre.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Fecha Inicio *</label>
                  <input type="date" {...register('fecha_inicio')} className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${errors.fecha_inicio ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  {errors.fecha_inicio && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.fecha_inicio.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Fecha Fin *</label>
                  <input type="date" {...register('fecha_fin')} className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${errors.fecha_fin ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  {errors.fecha_fin && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.fecha_fin.message}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={isCreating || isUpdating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2">
                  {isCreating || isUpdating ? 'Guardando...' : 'Guardar Período'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};