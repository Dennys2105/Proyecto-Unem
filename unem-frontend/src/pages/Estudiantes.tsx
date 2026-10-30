import { useState } from 'react';
import { useEstudiantes } from '../hooks/useEstudiantes';
import { useMunicipios } from '../hooks/useMunicipios';
import { useProgramas } from '../hooks/useProgramas';
import { useSecciones } from '../hooks/useSecciones';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Estudiante, EstudianteCreate, EstudianteUpdate } from '../types/models';

const estudianteSchema = z.object({
  cedula: z.string().min(6, 'Cédula inválida').max(20, 'Máximo 20 caracteres'),
  nombre: z.string().min(3, 'Mínimo 3 caracteres').max(150, 'Máximo 150 caracteres'),
  apellido: z.string().min(3, 'Mínimo 3 caracteres').max(150, 'Máximo 150 caracteres'),
  id_mun: z.string().min(1, 'Selecciona un municipio'),
  id_pro: z.string().min(1, 'Selecciona un programa'),
  id_sec: z.string().optional().or(z.literal('')),
  trayecto: z.string().min(1, 'Obligatorio'),
  id_usu: z.string().optional().or(z.literal('')),
});

type EstudianteFormData = z.infer<typeof estudianteSchema>;

export const Estudiantes = () => {
  const { estudiantes, isLoading, createEstudiante, updateEstudiante, deleteEstudiante, isCreating, isUpdating } = useEstudiantes();
  const { municipios } = useMunicipios();
  const { programas } = useProgramas();
  const { secciones } = useSecciones();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEstudiante, setEditingEstudiante] = useState<Estudiante | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Estudiante | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EstudianteFormData>({
    resolver: zodResolver(estudianteSchema),
  });

  const openCreateModal = () => {
    setEditingEstudiante(null);
    reset({ cedula: '', nombre: '', apellido: '', id_mun: '', id_pro: '', id_sec: '', trayecto: '', id_usu: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (est: Estudiante) => {
    setEditingEstudiante(est);
    reset({
      cedula: est.cedula,
      nombre: est.nombre,
      apellido: est.apellido,
      id_mun: est.id_mun.toString(),
      id_pro: est.id_pro?.toString() || '',
      id_sec: est.id_sec?.toString() || '',
      trayecto: est.trayecto.toString(),
      id_usu: est.id_usu?.toString() || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEstudiante(null);
    reset();
  };

  const onSubmit = (data: EstudianteFormData) => {
    const payload: any = {
      cedula: data.cedula,
      nombre: data.nombre,
      apellido: data.apellido,
      id_mun: parseInt(data.id_mun, 10),
      id_pro: data.id_pro ? parseInt(data.id_pro, 10) : undefined,
      id_sec: data.id_sec && data.id_sec.trim() !== '' ? parseInt(data.id_sec, 10) : undefined,
      trayecto: parseInt(data.trayecto, 10),
    };

    if (data.id_usu && data.id_usu.trim() !== '') {
      payload.id_usu = parseInt(data.id_usu, 10);
    } else {
      payload.id_usu = null;
    }

    if (editingEstudiante) {
      updateEstudiante({ id: editingEstudiante.id_est, data: payload as EstudianteUpdate });
    } else {
      createEstudiante(payload as EstudianteCreate);
    }
    closeModal();
  };

  const handleDelete = (est: Estudiante) => setDeleteConfirm(est);
  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteEstudiante(deleteConfirm.id_est);
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { key: 'id_est', label: 'ID' },
    { key: 'cedula', label: 'Cédula' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { key: 'trayecto', label: 'Trayecto' },
    { 
      key: 'municipio', 
      label: 'Municipio',
      render: (value: any) => value?.nombre || 'N/A'
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Estudiantes</h1>
        <button onClick={openCreateModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Nuevo Estudiante
        </button>
      </div>

      <DataTable
        columns={columns}
        data={estudiantes || []}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        rowKey={(row) => row.id_est}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingEstudiante ? 'Editar Estudiante' : 'Nuevo Estudiante'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Cédula" name="cedula" register={register} errors={errors} />
                <FormField label="ID Usuario (Opcional)" name="id_usu" type="text" register={register} errors={errors} placeholder="Dejar vacío si no tiene" />
                <FormField label="Nombre" name="nombre" register={register} errors={errors} />
                <FormField label="Apellido" name="apellido" register={register} errors={errors} />
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Municipio *</label>
                  <select {...register('id_mun')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona un municipio</option>
                    {municipios?.map((m) => <option key={m.id_mun} value={m.id_mun}>{m.nombre}</option>)}
                  </select>
                  {errors.id_mun && <p className="text-sm text-red-600">{errors.id_mun.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Programa *</label>
                  <select {...register('id_pro')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona un programa</option>
                    {programas?.map((p) => <option key={p.id_pro} value={p.id_pro}>{p.nombre}</option>)}
                  </select>
                  {errors.id_pro && <p className="text-sm text-red-600">{errors.id_pro.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Sección (Opcional)</label>
                  <select {...register('id_sec')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Sin sección asignada</option>
                    {secciones?.map((s) => <option key={s.id_sec} value={s.id_sec}>{s.codigo} - {s.trayecto}/{s.periodo}</option>)}
                  </select>
                </div>

                <FormField label="Trayecto (1-10)" name="trayecto" type="text" register={register} errors={errors} />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={isCreating || isUpdating} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isCreating || isUpdating ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4 text-red-600">Confirmar Eliminación</h2>
            <p className="text-gray-700 mb-6">¿Eliminar al estudiante <strong>{deleteConfirm.nombre} {deleteConfirm.apellido}</strong>?</p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};