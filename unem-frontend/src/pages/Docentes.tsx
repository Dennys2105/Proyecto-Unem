import { useState } from 'react';
import { useDocentes } from '../hooks/useDocentes';
import { useMunicipios } from '../hooks/useMunicipios';
import { useProgramas } from '../hooks/useProgramas';
import { DataTable } from '../components/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type { Docente, DocenteCreate, DocenteUpdate } from '../types/models';

const docenteSchema = z.object({
  tipo_cedula: z.enum(['V', 'E'], { message: 'Selecciona V o E' }),
  cedula_numero: z.string()
    .min(6, 'Mínimo 6 dígitos')
    .max(8, 'Máximo 8 dígitos')
    .regex(/^\d+$/, 'Solo se permiten números'),
  
  nombre: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(150, 'Máximo 150 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo se permiten letras'),
  
  apellido: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(150, 'Máximo 150 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo se permiten letras'),
  
  id_mun: z.string().min(1, 'Selecciona un municipio'),
  especialidad: z.string().min(1, 'Selecciona un PNF / Especialidad'),
  
  telefono_prefijo: z.enum(['0414', '0424', '0412', '0416', '0426']),
  telefono_numero: z.string()
    .regex(/^\d{0,7}$/, 'Máximo 7 dígitos, solo números')
    .optional()
    .or(z.literal('')),
  
  tipo_contrato: z.enum(['Estipendio', 'Contratado']),
  horas_max_sem: z.string().min(1, 'Obligatorio'),
  horas_disponibles: z.string().min(1, 'Obligatorio'),
})
.refine((data) => {
  const max = parseInt(data.horas_max_sem, 10);
  const disp = parseInt(data.horas_disponibles, 10);
  if (isNaN(max) || isNaN(disp)) return false;
  if (max < 1 || max > 20) return false;
  if (disp < 0 || disp > max) return false;
  return true;
}, {
  message: 'Horas máx: 1-20. Disponibles: entre 0 y horas máximas.',
  path: ['horas_disponibles'],
});

type DocenteFormData = z.infer<typeof docenteSchema>;

const PREFIJOS_TELEFONO = ['0414', '0424', '0412', '0416', '0426'];

// Funciones auxiliares para filtrar caracteres en tiempo real
const filtrarSoloNumeros = (value: string) => value.replace(/\D/g, '');
const filtrarSoloLetras = (value: string) => value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');

export const DocentesPage = () => {
  const { docentes, isLoading, createDocente, updateDocente, deleteDocente, isCreating, isUpdating } = useDocentes();
  const { municipios } = useMunicipios();
  const { programas } = useProgramas();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocente, setEditingDocente] = useState<Docente | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Docente | null>(null);

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<DocenteFormData>({
    resolver: zodResolver(docenteSchema),
    defaultValues: {
      tipo_cedula: 'V',
      cedula_numero: '',
      nombre: '',
      apellido: '',
      id_mun: '',
      especialidad: '',
      tipo_contrato: 'Estipendio',
      horas_max_sem: '20',
      horas_disponibles: '20',
      telefono_prefijo: '0414',
      telefono_numero: '',
    }
  });

  const horasMax = watch('horas_max_sem');

  const openCreateModal = () => {
    setEditingDocente(null);
    reset({
      tipo_cedula: 'V',
      cedula_numero: '',
      nombre: '',
      apellido: '',
      id_mun: '',
      especialidad: '',
      tipo_contrato: 'Estipendio',
      horas_max_sem: '20',
      horas_disponibles: '20',
      telefono_prefijo: '0414',
      telefono_numero: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (docente: Docente) => {
    setEditingDocente(docente);
    const [tipoCed, numCed] = docente.cedula.includes('-')
      ? docente.cedula.split('-')
      : ['V', docente.cedula];
    const tel = docente.telefono || '';
    const prefijo = tel.substring(0, 4);
    const telNum = tel.substring(4);

    reset({
      tipo_cedula: (tipoCed.toUpperCase() === 'E' ? 'E' : 'V') as 'V' | 'E',
      cedula_numero: numCed || '',
      nombre: docente.nombre,
      apellido: docente.apellido,
      id_mun: docente.id_mun.toString(),
      especialidad: docente.especialidad,
      tipo_contrato: docente.tipo_contrato as 'Estipendio' | 'Contratado',
      horas_max_sem: docente.horas_max_sem.toString(),
      horas_disponibles: docente.horas_disponibles.toString(),
      telefono_prefijo: PREFIJOS_TELEFONO.includes(prefijo) ? prefijo as any : '0414',
      telefono_numero: telNum || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingDocente(null); reset(); };

  const onSubmit = (data: DocenteFormData) => {
    const cedulaFinal = `${data.tipo_cedula}-${data.cedula_numero}`;
    const telefonoFinal = data.telefono_numero && data.telefono_numero.trim() !== ''
      ? `${data.telefono_prefijo}${data.telefono_numero}`
      : undefined;

    const payload: DocenteCreate | DocenteUpdate = {
      cedula: cedulaFinal,
      nombre: data.nombre.trim(),
      apellido: data.apellido.trim(),
      id_mun: parseInt(data.id_mun, 10),
      especialidad: data.especialidad,
      tipo_contrato: data.tipo_contrato,
      horas_max_sem: parseInt(data.horas_max_sem, 10),
      horas_disponibles: parseInt(data.horas_disponibles, 10),
      telefono: telefonoFinal,
    };

    if (editingDocente) {
      updateDocente({ id: editingDocente.id_doc, data: payload as DocenteUpdate }, {
        onSuccess: () => {
          toast.success('Docente actualizado correctamente');
          closeModal();
        },
        onError: () => toast.error('Error al actualizar el docente')
      });
    } else {
      createDocente(payload as DocenteCreate, {
        onSuccess: () => {
          toast.success('Docente registrado exitosamente');
          closeModal();
        },
        onError: () => toast.error('Error al registrar el docente (¿Cédula ya existe?)')
      });
    }
  };

  const handleDelete = (docente: Docente) => setDeleteConfirm(docente);

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteDocente(deleteConfirm.id_doc, {
        onSuccess: () => {
          toast.success('Docente eliminado correctamente');
          setDeleteConfirm(null);
        },
        onError: () => toast.error('Error al eliminar el docente')
      });
    }
  };

  const columns = [
    { key: 'id_doc', label: 'ID' },
    { key: 'cedula', label: 'Cédula' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    {
      key: 'municipio', label: 'Municipio',
      render: (_v: any, r: any) => municipios?.find(m => m.id_mun === r.id_mun)?.nombre || 'N/A'
    },
    { key: 'especialidad', label: 'Especialidad (PNF)' },
    { key: 'tipo_contrato', label: 'Contrato' },
    { key: 'horas_max_sem', label: 'H. Máx' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Docentes</h1>
          <p className="text-sm text-gray-500 mt-1">Registro y control del personal docente</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm"
        >
          Nuevo Docente
        </button>
      </div>

      <DataTable
        columns={columns}
        data={docentes || []}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        rowKey={(row) => row.id_doc}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingDocente ? 'Editar Docente' : 'Registrar Nuevo Docente'}
              </h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* CÉDULA: Select V/E + input solo números */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Cédula *</label>
                  <div className="flex gap-2">
                    <select
                      {...register('tipo_cedula')}
                      className="w-20 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="V">V</option>
                      <option value="E">E</option>
                    </select>
                    <span className="flex items-center text-gray-500 font-bold">-</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="12345678"
                      {...register('cedula_numero')}
                      onChange={(e) => {
                        const filtered = filtrarSoloNumeros(e.target.value).slice(0, 8);
                        e.target.value = filtered;
                      }}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                    />
                  </div>
                  {errors.tipo_cedula && <p className="text-sm text-red-600">{errors.tipo_cedula.message}</p>}
                  {errors.cedula_numero && <p className="text-sm text-red-600">{errors.cedula_numero.message}</p>}
                </div>

                {/* TELÉFONO: Select prefijo + input solo números */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Teléfono (Opcional)</label>
                  <div className="flex gap-2">
                    <select
                      {...register('telefono_prefijo')}
                      className="w-24 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {PREFIJOS_TELEFONO.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="1234567"
                      maxLength={7}
                      {...register('telefono_numero')}
                      onChange={(e) => {
                        const filtered = filtrarSoloNumeros(e.target.value).slice(0, 7);
                        e.target.value = filtered;
                      }}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  {errors.telefono_numero && <p className="text-sm text-red-600">{errors.telefono_numero.message}</p>}
                </div>

                {/* NOMBRE: solo letras */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                  <input
                    type="text"
                    {...register('nombre')}
                    placeholder="Solo letras"
                    onChange={(e) => {
                      const filtered = filtrarSoloLetras(e.target.value);
                      e.target.value = filtered;
                    }}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {errors.nombre && <p className="text-sm text-red-600">{errors.nombre.message}</p>}
                </div>

                {/* APELLIDO: solo letras */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Apellido *</label>
                  <input
                    type="text"
                    {...register('apellido')}
                    placeholder="Solo letras"
                    onChange={(e) => {
                      const filtered = filtrarSoloLetras(e.target.value);
                      e.target.value = filtered;
                    }}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {errors.apellido && <p className="text-sm text-red-600">{errors.apellido.message}</p>}
                </div>

                {/* MUNICIPIO */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Municipio *</label>
                  <select {...register('id_mun')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona un municipio</option>
                    {municipios?.map((m) => <option key={m.id_mun} value={m.id_mun}>{m.nombre}</option>)}
                  </select>
                  {errors.id_mun && <p className="text-sm text-red-600">{errors.id_mun.message}</p>}
                </div>

                {/* ESPECIALIDAD / PNF */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Especialidad / PNF *</label>
                  <select {...register('especialidad')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona un programa</option>
                    {programas?.map((p) => <option key={p.id_pro} value={p.nombre}>{p.nombre}</option>)}
                  </select>
                  {errors.especialidad && <p className="text-sm text-red-600">{errors.especialidad.message}</p>}
                </div>

                {/* CONTRATO */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Tipo de Contrato *</label>
                  <select {...register('tipo_contrato')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="Estipendio">Estipendio</option>
                    <option value="Contratado">Contratado</option>
                  </select>
                </div>

                {/* HORAS MÁXIMAS: solo números */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Horas Máx. Semanales (1-20) *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    {...register('horas_max_sem')}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (value > 20) e.target.value = '20';
                      if (value < 1 && e.target.value !== '') e.target.value = '1';
                    }}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {errors.horas_max_sem && <p className="text-sm text-red-600">{errors.horas_max_sem.message}</p>}
                </div>

                {/* HORAS DISPONIBLES: solo números */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Horas Disponibles (0-{horasMax || 20}) *</label>
                  <input
                    type="number"
                    min={0}
                    max={parseInt(horasMax || '20', 10)}
                    {...register('horas_disponibles')}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      const max = parseInt(horasMax || '20', 10);
                      if (value > max) e.target.value = max.toString();
                      if (value < 0 && e.target.value !== '') e.target.value = '0';
                    }}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {errors.horas_disponibles && <p className="text-sm text-red-600">{errors.horas_disponibles.message}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isCreating || isUpdating ? 'Guardando...' : 'Guardar Docente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-red-600 mb-2">Confirmar Eliminación</h2>
            <p className="text-gray-700 mb-6">
              ¿Estás seguro de eliminar al docente <strong>{deleteConfirm.nombre} {deleteConfirm.apellido}</strong>?
              Esta acción cambiará su estatus a inactivo.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};