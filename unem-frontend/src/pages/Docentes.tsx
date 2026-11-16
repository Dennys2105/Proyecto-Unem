import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useDocentes } from '../hooks/useDocentes';
import { useMunicipios } from '../hooks/useMunicipios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Docente, DocenteCreate, DocenteUpdate } from '../types/models';
import {
  UserCog, Search, Plus, X, AlertCircle, Info,
  Edit, UserX, UserCheck, ArrowUp, ArrowDown, ArrowUpDown, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';


interface ColumnDef {
  key: string;
  label: string;
  render?: (value: any, row: Docente) => ReactNode;
  sortable?: boolean;
}

const SOLO_LETRAS = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/;
const SOLO_ESPEC = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/;

// ✅ Validaciones alineadas a los CHECK de la BD
const docenteSchema = z.object({
  tipo_cedula: z.enum(['V', 'E'], { message: 'Selecciona V o E' }),
  numero_cedula: z.string()
    .min(7, 'La cédula debe tener entre 7 y 8 dígitos')
    .max(8, 'La cédula debe tener entre 7 y 8 dígitos')
    .regex(/^[0-9]+$/, 'La cédula solo puede contener números'),
  codigo_telefono: z.string().optional(),
  numero_telefono: z.string()
    .regex(/^[0-9]*$/, 'El teléfono solo puede contener números')
    .refine(v => v === '' || v.length === 7, 'El teléfono debe tener 7 dígitos'),
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .regex(SOLO_LETRAS, 'El nombre solo puede contener letras y espacios'),
  apellido: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .regex(SOLO_LETRAS, 'El apellido solo puede contener letras y espacios'),
  id_mun: z.string().min(1, 'Selecciona un municipio'),
  especialidad: z.string()
    .min(3, 'La especialidad debe tener al menos 3 caracteres')
    .max(150, 'Máximo 150 caracteres')
    .regex(SOLO_ESPEC, 'La especialidad solo puede contener letras y espacios'),
  tipo_contrato: z.enum(['Estipendio', 'Contratado'], { message: 'Selecciona un tipo de contrato' }),
  horas_max_sem: z.string()
    .min(1, 'Las horas máximas son obligatorias')
    .regex(/^[1-9][0-9]?$|^40$/, 'Debe ser un número entre 1 y 40'),
});

type DocenteFormData = z.infer<typeof docenteSchema>;
type SortKey = 'id_doc' | 'cedula';
type SortDir = 'asc' | 'desc';

export const DocentesPage = () => {
  const { docentes, isLoading, createDocente, updateDocente, isCreating, isUpdating, refetch } = useDocentes();
  const { municipios } = useMunicipios();

  const listaMunicipios: any[] = Array.isArray(municipios) ? municipios : [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocente, setEditingDocente] = useState<Docente | null>(null);
  const [filtroMunicipio, setFiltroMunicipio] = useState<string>('');
  const [filtroContrato, setFiltroContrato] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('A');
  const [busqueda, setBusqueda] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('id_doc');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<DocenteFormData>({
    resolver: zodResolver(docenteSchema),
    mode: 'onChange',
    defaultValues: { tipo_cedula: 'V', codigo_telefono: '0414', tipo_contrato: 'Estipendio', horas_max_sem: '20' },
  });

  const tipoCedulaWatch = watch('tipo_cedula');
  const numeroCedulaWatch = watch('numero_cedula');
  const codigoTelWatch = watch('codigo_telefono');
  const numeroTelWatch = watch('numero_telefono');
  const horasMaxWatch = watch('horas_max_sem');
  const horasAsignadasWatch = editingDocente ? (editingDocente as any).horas_asignadas ?? 0 : 0;

  const soloNumeros = (val: string) => val.replace(/[^0-9]/g, '');
  const soloLetras = (val: string) => val.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]/g, '');

  const openCreateModal = () => {
    setEditingDocente(null);
    reset({
      tipo_cedula: 'V', numero_cedula: '', codigo_telefono: '0414', numero_telefono: '',
      nombre: '', apellido: '', id_mun: '', especialidad: '', tipo_contrato: 'Estipendio', horas_max_sem: '20',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (doc: Docente) => {
    setEditingDocente(doc);
    const match = (doc.cedula ?? '').match(/^([VE])-?(\d+)$/i);
    const tel = (doc as any).telefono ?? '';
    const telMatch = tel.match(/^(04\d{2})(\d{7})$/);
    reset({
      tipo_cedula: (match?.[1]?.toUpperCase() as 'V' | 'E') ?? 'V',
      numero_cedula: match?.[2] ?? '',
      codigo_telefono: telMatch?.[1] ?? '0414',
      numero_telefono: telMatch?.[2] ?? '',
      nombre: doc.nombre ?? '',
      apellido: doc.apellido ?? '',
      id_mun: doc.id_mun?.toString() ?? '',
      especialidad: (doc as any).especialidad ?? '',
      tipo_contrato: ((doc as any).tipo_contrato === 'Contratado' ? 'Contratado' : 'Estipendio') as any,
      horas_max_sem: ((doc as any).horas_max_sem ?? 20).toString(),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingDocente(null); reset(); };

  const onSubmit = async (data: DocenteFormData) => {
    // ✅ Teléfono SIN guion (la BD exige ^04[0-9]{9}$)
    const telefono = data.numero_telefono
      ? `${data.codigo_telefono ?? '0414'}${data.numero_telefono}`
      : undefined;

    const payload: any = {
      cedula: `${data.tipo_cedula}-${data.numero_cedula}`,
      nombre: data.nombre.trim().toUpperCase(),
      apellido: data.apellido.trim().toUpperCase(),
      id_mun: parseInt(data.id_mun, 10),
      especialidad: data.especialidad.trim().toUpperCase(),
      tipo_contrato: data.tipo_contrato,
      horas_max_sem: parseInt(data.horas_max_sem, 10),
      telefono,
    };

    try {
      if (editingDocente) {
        await updateDocente({ id: editingDocente.id_doc, data: payload as DocenteUpdate });
        toast.success(`Docente ${data.nombre} ${data.apellido} actualizado correctamente`);
      } else {
        await createDocente(payload as DocenteCreate);
        toast.success(`Docente ${data.nombre} ${data.apellido} registrado exitosamente`);
      }
      closeModal();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Error al guardar el docente');
    }
  };

  const toggleRetiro = async (doc: Docente) => {
    const actual = (doc as any).estatus ?? 'A';
    const nuevoEstatus = actual === 'A' ? 'I' : 'A';
    const accion = nuevoEstatus === 'A' ? 'reincorporado' : 'retirado';

    try {
      await updateDocente({
        id: doc.id_doc,
        data: { estatus: nuevoEstatus } as DocenteUpdate,
      });
      // ✅ Fuerza a React Query a traer los datos frescos
      await refetch();
      toast.success(`${doc.nombre} ${doc.apellido} ${accion} correctamente`, {
        icon: nuevoEstatus === 'A' ? '✅' : '📋',
        duration: 3000,
      });
    } catch {
      toast.error(`No se pudo ${accion} al docente`);
    }
  };

  const docentesFiltrados = useMemo(() => {
    if (!docentes) return [];
    const filtrados = docentes.filter(d => {
      const estatus = (d as any).estatus ?? 'A';
      if (filtroMunicipio && d.id_mun?.toString() !== filtroMunicipio) return false;
      if (filtroContrato && (d as any).tipo_contrato !== filtroContrato) return false;
      if (filtroEstado && estatus !== filtroEstado) return false;
      if (busqueda) {
        const texto = `${d.cedula} ${d.nombre} ${d.apellido}`.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
    return [...filtrados].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'id_doc') cmp = (a.id_doc ?? 0) - (b.id_doc ?? 0);
      else {
        const tipoA = (a.cedula ?? '').match(/^([VE])/i)?.[1].toUpperCase() ?? 'V';
        const tipoB = (b.cedula ?? '').match(/^([VE])/i)?.[1].toUpperCase() ?? 'V';
        if (tipoA !== tipoB) cmp = tipoA.localeCompare(tipoB);
        else {
          const numA = parseInt((a.cedula ?? '').match(/(\d+)/)?.[1] ?? '0', 10);
          const numB = parseInt((b.cedula ?? '').match(/(\d+)/)?.[1] ?? '0', 10);
          cmp = numA - numB;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [docentes, filtroMunicipio, filtroContrato, filtroEstado, busqueda, sortKey, sortDir]);

  const getNombreMunicipio = (row: Docente): string => {
    if ((row as any).municipio?.nombre) return (row as any).municipio.nombre;
    const mun = listaMunicipios.find(m => m.id_mun === row.id_mun);
    return mun?.nombre ?? `Mun. ${row.id_mun ?? '—'}`;
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="text-gray-400" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />;
  };

  const columns: ColumnDef[] = [
    { key: 'id_doc', label: 'ID', sortable: true },
    { key: 'cedula', label: 'Cédula', sortable: true, render: (v: any) => <span className="font-mono font-semibold text-gray-900 text-sm">{v}</span> },
    { key: 'nombre', label: 'Nombre', render: (v: any) => <span className="text-sm font-medium text-gray-900">{v}</span> },
    { key: 'apellido', label: 'Apellido', render: (v: any) => <span className="text-sm font-medium text-gray-900">{v}</span> },
    { key: 'municipio', label: 'Municipio', render: (_: any, row: Docente) => <span className="text-sm text-gray-700">{getNombreMunicipio(row)}</span> },
    { key: 'especialidad', label: 'Especialidad', render: (v: any) => <span className="text-sm text-gray-700">{v ?? 'N/A'}</span> },
    { key: 'tipo_contrato', label: 'Contrato', render: (v: any) => (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
        v === 'Contratado' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
      }`}>{v}</span>
    )},
    {
      key: 'horas', label: 'Horas',
      render: (_: any, row: Docente) => {
        const max = (row as any).horas_max_sem ?? 0;
        const asig = (row as any).horas_asignadas ?? 0;
        const disp = Math.max(0, max - asig);
        return (
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="text-gray-700"><b>{max}</b>h máx</span>
            <span className="text-blue-600"><b>{asig}</b>h asig</span>
            <span className={disp === 0 ? 'text-red-600 font-bold' : 'text-green-600'}><b>{disp}</b>h disp</span>
          </div>
        );
      },
    },
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
      render: (_: any, row: Docente) => {
        const isActive = ((row as any).estatus ?? 'A') === 'A';
        return (
          <div className="flex gap-2">
            <button onClick={() => openEditModal(row)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
              <Edit size={14} /> Editar
            </button>
            <button onClick={() => toggleRetiro(row)} disabled={isUpdating} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
              isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}>
              {isActive ? <UserX size={14} /> : <UserCheck size={14} />}
              {isActive ? 'Retirar' : 'Reincorporar'}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="bg-indigo-100 p-3 rounded-xl"><UserCog className="text-indigo-600" size={32} /></div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Docentes</h1>
          <p className="text-gray-600 mt-1 max-w-3xl">
            Registro y control del personal docente. Los <strong>retirados</strong> no pueden recibir nuevas
            asignaciones pero pueden ser <strong>reincorporados</strong>. Las horas disponibles se calculan
            automáticamente desde la carga horaria asignada.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Buscar por cédula, nombre o apellido..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <select value={filtroMunicipio} onChange={(e) => setFiltroMunicipio(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todos los municipios</option>
            {listaMunicipios.map(m => <option key={m.id_mun} value={m.id_mun}>{m.nombre}</option>)}
          </select>
          <select value={filtroContrato} onChange={(e) => setFiltroContrato(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todos los contratos</option>
            <option value="Estipendio">Estipendio</option>
            <option value="Contratado">Contratado</option>
          </select>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="A">Solo activos</option>
            <option value="I">Solo retirados</option>
            <option value="">Todos los estados</option>
          </select>
          <button onClick={openCreateModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm whitespace-nowrap">
            <Plus size={16} /> Nuevo Docente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div><p className="text-gray-500 mt-4">Cargando docentes...</p></div>
        ) : docentesFiltrados.length === 0 ? (
          <div className="p-12 text-center"><UserCog className="mx-auto text-gray-300 mb-3" size={48} /><p className="text-gray-500 font-medium">No se encontraron docentes</p></div>
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
                {docentesFiltrados.map(doc => (
                  <tr key={doc.id_doc} className="hover:bg-gray-50 transition">
                    {columns.map(col => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                        {col.render ? col.render((doc as any)[col.key], doc) : (doc as any)[col.key]}
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
        Mostrando {docentesFiltrados.length} de {docentes?.length || 0} docentes registrados
        {' · '}Ordenado por <span className="font-semibold">{sortKey === 'id_doc' ? 'ID' : 'Cédula'}</span> ({sortDir === 'asc' ? 'ascendente' : 'descendente'})
      </p>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingDocente ? 'Editar Docente' : 'Registrar Nuevo Docente'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>La cédula de docentes es venezolana (<strong>V-</strong>). El teléfono se guarda como 04XX + 7 dígitos. Las horas disponibles se calculan automáticamente.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Cédula *</label>
                  <div className="flex gap-2">
                    <select {...register('tipo_cedula')} className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold">
                      <option value="V">V -</option><option value="E">E -</option>
                    </select>
                    <input type="text" inputMode="numeric" {...register('numero_cedula')} onChange={(e) => setValue('numero_cedula', soloNumeros(e.target.value), { shouldValidate: true })} placeholder="12345678" maxLength={8} className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 font-mono ${errors.numero_cedula ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Vista previa: <span className="font-mono font-semibold text-gray-700">{tipoCedulaWatch}-{numeroCedulaWatch || '________'}</span></p>
                  {errors.numero_cedula && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.numero_cedula.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Teléfono (Opcional)</label>
                  <div className="flex gap-2">
                    <select {...register('codigo_telefono')} className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      {['0414','0424','0412','0416','0426'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="text" inputMode="numeric" {...register('numero_telefono')} onChange={(e) => setValue('numero_telefono', soloNumeros(e.target.value), { shouldValidate: true })} placeholder="1234567" maxLength={7} className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 font-mono ${errors.numero_telefono ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Vista previa: <span className="font-mono font-semibold text-gray-700">{codigoTelWatch}{numeroTelWatch || '_______'}</span></p>
                  {errors.numero_telefono && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.numero_telefono.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                  <input type="text" {...register('nombre')} onChange={(e) => setValue('nombre', soloLetras(e.target.value), { shouldValidate: true })} placeholder="Ej: María José" className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 uppercase ${errors.nombre ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  {errors.nombre && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.nombre.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Apellido *</label>
                  <input type="text" {...register('apellido')} onChange={(e) => setValue('apellido', soloLetras(e.target.value), { shouldValidate: true })} placeholder="Ej: González Pérez" className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 uppercase ${errors.apellido ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  {errors.apellido && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.apellido.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Municipio *</label>
                  <select {...register('id_mun')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">Selecciona un municipio</option>
                    {listaMunicipios.map(m => <option key={m.id_mun} value={m.id_mun}>{m.nombre}</option>)}
                  </select>
                  {errors.id_mun && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.id_mun.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Tipo de Contrato *</label>
                  <select {...register('tipo_contrato')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="Estipendio">Estipendio</option>
                    <option value="Contratado">Contratado</option>
                  </select>
                  {errors.tipo_contrato && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.tipo_contrato.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Especialidad / PNF *</label>
                <input type="text" {...register('especialidad')} onChange={(e) => setValue('especialidad', soloLetras(e.target.value), { shouldValidate: true })} placeholder="Ej: Educación Primaria" className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${errors.especialidad ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                {errors.especialidad && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.especialidad.message}</p>}
              </div>

              {/* ✅ Horas máximas con slider + cálculo en vivo */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Horas Máx. Semanales: <span className="font-bold text-indigo-600">{horasMaxWatch || 0}h</span>
                </label>
                <input
                  type="range" min={1} max={40} step={1}
                  value={parseInt(horasMaxWatch || '20', 10)}
                  onChange={(e) => setValue('horas_max_sem', e.target.value, { shouldValidate: true })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400"><span>1h</span><span>20h</span><span>40h</span></div>

                {editingDocente && (
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <Clock className="text-indigo-600 shrink-0" size={20} />
                    <div className="text-sm text-indigo-900">
                      <p className="font-semibold">Carga horaria actual</p>
                      <p className="text-xs text-indigo-700">
                        <b>{horasMaxWatch || 0}</b>h máx · <b>{horasAsignadasWatch}</b>h asignadas · <b className="text-green-700">{Math.max(0, (parseInt(horasMaxWatch || '0', 10)) - horasAsignadasWatch)}</b>h disponibles
                      </p>
                      {parseInt(horasMaxWatch || '0', 10) < horasAsignadasWatch && (
                        <p className="text-xs text-red-600 mt-1 font-medium">⚠️ El máximo no puede ser menor a las horas ya asignadas ({horasAsignadasWatch}h)</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={isCreating || isUpdating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2">
                  {isCreating || isUpdating ? 'Guardando...' : 'Guardar Docente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};