import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useEstudiantes } from '../hooks/useEstudiantes';
import { useMunicipios } from '../hooks/useMunicipios';
import { useSecciones } from '../hooks/useSecciones';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Estudiante, EstudianteCreate, EstudianteUpdate } from '../types/models';
import { useAuth } from '../hooks/useAuth';
import { estudianteService } from '../services/estudianteService';
import {
  GraduationCap, Search, Plus, X, AlertCircle, Info,
  Edit, UserX, UserCheck, ArrowUp, ArrowDown, ArrowUpDown, FileSpreadsheet
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
  render?: (value: any, row: Estudiante) => ReactNode;
  sortable?: boolean;
}

// ✅ Extrae el número de la cédula para ordenar numéricamente
const numeroDeCedula = (cedula: string): number => {
  const match = (cedula ?? '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// ✅ Extrae el tipo (V/E) para agrupar venezolanas antes que extranjeras
const tipoDeCedula = (cedula: string): string => {
  const match = (cedula ?? '').match(/^([VE])/i);
  return match ? match[1].toUpperCase() : 'V';
};

const SOLO_LETRAS = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/;

const estudianteSchema = z.object({
  tipo_cedula: z.enum(['V', 'E'], { message: 'Selecciona V o E' }),
  numero_cedula: z.string()
    .min(6, 'La cédula debe tener al menos 6 dígitos')
    .max(9, 'La cédula no puede exceder 9 dígitos')
    .regex(/^[0-9]+$/, 'La cédula solo puede contener números'),
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .regex(SOLO_LETRAS, 'El nombre solo puede contener letras y espacios'),
  apellido: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .regex(SOLO_LETRAS, 'El apellido solo puede contener letras y espacios'),
  trayecto: z.string().min(1, 'Selecciona un trayecto'),
  id_mun: z.string().min(1, 'Selecciona un municipio'),
  id_sec: z.string().optional(),
});

type EstudianteFormData = z.infer<typeof estudianteSchema>;
type SortKey = 'id_est' | 'cedula';
type SortDir = 'asc' | 'desc';

export const Estudiantes = () => {
  const { puede } = useAuth();
  const { estudiantes, isLoading, createEstudiante, updateEstudiante, isCreating, isUpdating } = useEstudiantes();
  const { municipios } = useMunicipios();
  const { secciones } = useSecciones();

  const listaMunicipios: any[] = Array.isArray(municipios) ? municipios : [];
  const listaSecciones: any[] = Array.isArray(secciones) ? secciones.filter(s => s.estatus === 'A') : [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEstudiante, setEditingEstudiante] = useState<Estudiante | null>(null);
  const [filtroMunicipio, setFiltroMunicipio] = useState<string>('');
  const [filtroTrayecto, setFiltroTrayecto] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('A');
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroSeccion, setFiltroSeccion] = useState<number | ''>('');
  const [descargandoLista, setDescargandoLista] = useState(false);

  // ✅ Estado de ordenamiento (por defecto: ID ascendente)
  const [sortKey, setSortKey] = useState<SortKey>('id_est');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EstudianteFormData>({
    resolver: zodResolver(estudianteSchema),
    mode: 'onChange',
    defaultValues: { tipo_cedula: 'V' },
  });

  const tipoCedulaWatch = watch('tipo_cedula');
  const numeroCedulaWatch = watch('numero_cedula');

  const soloNumeros = (val: string) => val.replace(/[^0-9]/g, '');
  const soloLetras = (val: string) => val.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]/g, '');

  const openCreateModal = () => {
    setEditingEstudiante(null);
    reset({ tipo_cedula: 'V', numero_cedula: '', nombre: '', apellido: '', trayecto: '', id_mun: '', id_sec: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (est: Estudiante) => {
    setEditingEstudiante(est);
    const match = (est.cedula ?? '').match(/^([VE])-?(\d+)$/i);
    reset({
      tipo_cedula: (match?.[1]?.toUpperCase() as 'V' | 'E') ?? 'V',
      numero_cedula: match?.[2] ?? (est.cedula ?? '').replace(/^[VE]-?/i, ''),
      nombre: est.nombre ?? '',
      apellido: est.apellido ?? '',
      trayecto: (est.trayecto ?? 1).toString(),
      id_mun: est.id_mun?.toString() ?? '',
      id_sec: est.id_sec?.toString() ?? '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEstudiante(null);
    reset();
  };

  const onSubmit = async (data: EstudianteFormData) => {
    const cedula = `${data.tipo_cedula}-${data.numero_cedula}`;
    const payload = {
      cedula,
      nombre: data.nombre.trim().toUpperCase(),
      apellido: data.apellido.trim().toUpperCase(),
      trayecto: parseInt(data.trayecto, 10),
      id_mun: parseInt(data.id_mun, 10),
      id_sec: data.id_sec ? parseInt(data.id_sec, 10) : undefined,
    };

    try {
      if (editingEstudiante) {
        await updateEstudiante({ id: editingEstudiante.id_est, data: payload as EstudianteUpdate });
        toast.success(`Estudiante ${data.nombre} ${data.apellido} actualizado correctamente`);
      } else {
        await createEstudiante(payload as EstudianteCreate);
        toast.success(`Estudiante ${data.nombre} ${data.apellido} registrado exitosamente`);
      }
      closeModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al guardar el estudiante');
    }
  };

  const toggleRetiro = async (est: Estudiante) => {
    const actual = est.estatus ?? 'A';
    const nuevoEstatus = actual === 'A' ? 'I' : 'A';
    const accion = nuevoEstatus === 'A' ? 'reincorporado' : 'retirado';

    try {
      await updateEstudiante({
        id: est.id_est,
        data: { estatus: nuevoEstatus } as EstudianteUpdate,
      });
      toast.success(`${est.nombre} ${est.apellido} ${accion} correctamente`, {
        icon: nuevoEstatus === 'A' ? '✅' : '📋',
        duration: 3000,
      });
    } catch {
      toast.error(`No se pudo ${accion} al estudiante. Verifica el endpoint PATCH en el backend.`);
    }
  };

  // ✅ Filtrado + ORDENAMIENTO determinista
  const estudiantesFiltrados = useMemo(() => {
    if (!estudiantes) return [];
    const filtrados = estudiantes.filter(e => {
      const estatus = e.estatus ?? 'A';
      if (filtroMunicipio && e.id_mun?.toString() !== filtroMunicipio) return false;
      if (filtroTrayecto && e.trayecto.toString() !== filtroTrayecto) return false;
      if (filtroSeccion && e.id_sec !== filtroSeccion) return false;
      if (filtroEstado && estatus !== filtroEstado) return false;
      if (busqueda) {
        const texto = `${e.cedula} ${e.nombre} ${e.apellido}`.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });

    // Ordenamiento
    const ordenados = [...filtrados].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'id_est') {
        cmp = (a.id_est ?? 0) - (b.id_est ?? 0);
      } else if (sortKey === 'cedula') {
        // Primero tipo (V < E), luego número numéricamente
        const tipoA = tipoDeCedula(a.cedula);
        const tipoB = tipoDeCedula(b.cedula);
        if (tipoA !== tipoB) cmp = tipoA.localeCompare(tipoB);
        else cmp = numeroDeCedula(a.cedula) - numeroDeCedula(b.cedula);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return ordenados;
  }, [estudiantes, filtroMunicipio, filtroTrayecto, filtroSeccion, filtroEstado, busqueda, sortKey, sortDir]);

  const getNombreMunicipio = (row: Estudiante): string => {
    if (row.municipio?.nombre) return row.municipio.nombre;
    const mun = listaMunicipios.find(m => m.id_mun === row.id_mun);
    return mun?.nombre ?? `Mun. ${row.id_mun ?? '—'}`;
  };

  const columns: ColumnDef[] = [
    { key: 'id_est', label: 'ID', sortable: true },
    {
      key: 'cedula',
      label: 'Cédula',
      sortable: true,
      render: (value: any) => <span className="font-mono font-semibold text-gray-900 text-sm">{value}</span>,
    },
    {
      key: 'nombre',
      label: 'Nombre',
      render: (value: any) => <span className="text-sm text-gray-900 font-medium">{value}</span>,
    },
    {
      key: 'apellido',
      label: 'Apellido',
      render: (value: any) => <span className="text-sm text-gray-900 font-medium">{value}</span>,
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
      key: 'municipio',
      label: 'Municipio',
      render: (_: any, row: Estudiante) => (
        <span className="text-sm text-gray-700">{getNombreMunicipio(row)}</span>
      ),
    },
    {
      key: 'estatus',
      label: 'Estado',
      render: (value: any) => {
        const est = value ?? 'A';
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
            est === 'A'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            {est === 'A' ? <><UserCheck size={12} /> Activo</> : <><UserX size={12} /> Retirado</>}
          </span>
        );
      },
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (_: any, est: Estudiante) => {
        const esActivo = (est.estatus ?? 'A') === 'A';
        const puedeEditar = puede('estudiantes', 'ACT', 'LIM');
        const puedeRetirar = puede('estudiantes', 'BOR', 'TODO');

        if (!puedeEditar && !puedeRetirar) return <span className="text-xs text-gray-400">Sin permisos</span>;

        return (
          <div className="flex gap-2">
            {puedeEditar && (
              <button
                onClick={() => openEditModal(est)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              >
                <Edit size={14} /> Editar
              </button>
            )}
            {puedeRetirar && (
              <button
                onClick={() => toggleRetiro(est)}
                disabled={isUpdating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                  esActivo
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                }`}
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

  // ✅ Ícono dinámico de ordenamiento
  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="text-gray-400" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-indigo-600" />
      : <ArrowDown size={12} className="text-indigo-600" />;
  };

  return (
    <div className="unem-page">
      <PageHero
        icon={GraduationCap}
        titulo="Estudiantes"
        descripcion={<>Matrícula estudiantil de la sede. Los <b>retirados</b> no aparecen en listados de clase, pero pueden <b>reincorporarse</b> siguiendo el reglamento académico de la UNEM.</>}
      />

      <section className="unem-card unem-card-pad">
        <div className="unem-toolbar">
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-3)' }} />
            <input type="text" className="unem-input" style={{ paddingLeft: 34 }} placeholder="Buscar por cédula, nombre o apellido…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <select className="unem-select" value={filtroMunicipio} onChange={(e) => setFiltroMunicipio(e.target.value)}>
            <option value="">Todos los municipios</option>
            {listaMunicipios.map((m) => (
              <option key={m.id_mun} value={m.id_mun}>{m.nombre}</option>
            ))}
          </select>
          <select className="unem-select" value={filtroTrayecto} onChange={(e) => setFiltroTrayecto(e.target.value)}>
            <option value="">Todos los trayectos</option>
            {[1, 2, 3, 4].map((t: number) => (
              <option key={t} value={t}>Trayecto {aRomano(t)}</option>
            ))}
          </select>
          <select className="unem-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="A">Solo activos</option>
            <option value="I">Solo retirados</option>
            <option value="">Todos los estados</option>
          </select>
          <select
            className="unem-select"
            value={filtroSeccion}
            onChange={(e) => setFiltroSeccion(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todas las secciones</option>
            {listaSecciones.map((s) => (
              <option key={s.id_sec} value={s.id_sec}>
                {s.codigo} - {s.programa?.codigo || `Prog. ${s.id_pro}`}
              </option>
            ))}
          </select>
          {filtroSeccion && (
            <button
              onClick={async () => {
                setDescargandoLista(true);
                try {
                  await estudianteService.descargarListaAsistencia(filtroSeccion as number);
                  toast.success('Lista de asistencia descargada', { icon: '📋' });
                } catch (error: unknown) {
                  const detail = (error as { response?: { data?: { detail?: string } } })
                    ?.response?.data?.detail;
                  toast.error(detail || 'Error al descargar la lista');
                } finally {
                  setDescargandoLista(false);
                }
              }}
              disabled={descargandoLista}
              className="unem-btn"
              style={{ whiteSpace: 'nowrap' }}
            >
              <FileSpreadsheet size={16} />
              {descargandoLista ? 'Descargando...' : 'Lista de Asistencia'}
            </button>
          )}
          {puede('estudiantes', 'CRE', 'TODO') && (
            <button className="unem-btn unem-btn-primary" onClick={openCreateModal}>
              <Plus size={15} /> Nuevo Estudiante
            </button>
          )}
        </div>
      </section>

      {isLoading ? (
        <section className="unem-card unem-card-pad">
          {[0, 1, 2, 3, 4].map((i: number) => <div key={i} className="unem-skel" style={{ height: 40, marginBottom: 10 }} />)}
        </section>
      ) : estudiantesFiltrados.length === 0 ? (
        <div className="unem-empty">
          <span className="unem-empty-i"><GraduationCap size={34} /></span>
          <p>No se encontraron estudiantes.</p>
          <p style={{ fontSize: 12, color: 'var(--tx-3)' }}>
            {estudiantes?.length === 0
              ? 'Comienza registrando el primer estudiante.'
              : 'Intenta ajustar los filtros de búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="unem-table-wrap unem-scroll">
          <table className="unem-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>
                    {col.sortable ? (
                      <button
                        className="unem-th-btn"
                        onClick={() => toggleSort(col.key as SortKey)}
                        title={`Ordenar por ${col.label}`}
                      >
                        {col.label}
                        <SortIcon colKey={col.key as SortKey} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estudiantesFiltrados.map((est) => (
                <tr key={est.id_est}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render((est as any)[col.key], est) : (est as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--tx-3)', textAlign: 'center' }}>
        Mostrando {estudiantesFiltrados.length} de {estudiantes?.length || 0} estudiantes registrados
        {' · '}Ordenado por <b>{sortKey === 'id_est' ? 'ID' : 'Cédula'}</b> ({sortDir === 'asc' ? 'ascendente' : 'descendente'})
      </p>

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingEstudiante ? 'Editar Estudiante' : 'Nuevo Estudiante'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>
                  <strong>V</strong> = venezolana, <strong>E</strong> = extranjera. La cédula solo acepta números;
                  nombre y apellido solo letras y espacios.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Cédula *</label>
                <div className="flex gap-2">
                  <select
                    {...register('tipo_cedula')}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="V">V -</option>
                    <option value="E">E -</option>
                  </select>
                  <input
                    type="text"
                    inputMode="numeric"
                    {...register('numero_cedula')}
                    onChange={(e) => setValue('numero_cedula', soloNumeros(e.target.value), { shouldValidate: true })}
                    placeholder="12345678"
                    maxLength={9}
                    className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 font-mono ${
                      errors.numero_cedula
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Vista previa: <span className="font-mono font-semibold text-gray-700">{tipoCedulaWatch}-{numeroCedulaWatch || '________'}</span>
                </p>
                {errors.numero_cedula && (
                  <p className="flex items-center gap-1 text-sm text-red-600 mt-1">
                    <AlertCircle size={14} /> {errors.numero_cedula.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                  <input
                    type="text"
                    {...register('nombre')}
                    onChange={(e) => setValue('nombre', soloLetras(e.target.value), { shouldValidate: true })}
                    placeholder="Ej: María José"
                    className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 uppercase ${
                      errors.nombre
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                  />
                  {errors.nombre && (
                    <p className="flex items-center gap-1 text-sm text-red-600 mt-1">
                      <AlertCircle size={14} /> {errors.nombre.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Apellido *</label>
                  <input
                    type="text"
                    {...register('apellido')}
                    onChange={(e) => setValue('apellido', soloLetras(e.target.value), { shouldValidate: true })}
                    placeholder="Ej: González Pérez"
                    className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 uppercase ${
                      errors.apellido
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                  />
                  {errors.apellido && (
                    <p className="flex items-center gap-1 text-sm text-red-600 mt-1">
                      <AlertCircle size={14} /> {errors.apellido.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Municipio *</label>
                  <select
                    {...register('id_mun')}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Selecciona</option>
                    {listaMunicipios.map((m) => (
                      <option key={m.id_mun} value={m.id_mun}>{m.nombre}</option>
                    ))}
                  </select>
                  {errors.id_mun && (
                    <p className="flex items-center gap-1 text-sm text-red-600 mt-1">
                      <AlertCircle size={14} /> {errors.id_mun.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Trayecto *</label>
                  <select
                    {...register('trayecto')}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Selecciona</option>
                    {[1, 2, 3, 4].map(t => (
                      <option key={t} value={t}>Trayecto {aRomano(t)}</option>
                    ))}
                  </select>
                  {errors.trayecto && (
                    <p className="flex items-center gap-1 text-sm text-red-600 mt-1">
                      <AlertCircle size={14} /> {errors.trayecto.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Sección (Opcional)</label>
                <select
                  {...register('id_sec')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Sin sección asignada</option>
                  {listaSecciones.map((s) => (
                    <option key={s.id_sec} value={s.id_sec}>
                      {s.codigo} - {s.programa?.codigo || `Prog. ${s.id_pro}`} (T{aRomano(s.trayecto)} P{aRomano(s.periodo)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2"
                >
                  {isCreating || isUpdating ? 'Guardando...' : 'Guardar Estudiante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};