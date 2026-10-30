import { useState } from 'react';
import { useDocentes } from '../hooks/useDocentes';
import { useMunicipios } from '../hooks/useMunicipios';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Docente, DocenteCreate, DocenteUpdate } from '../types/models';

const docenteSchema = z.object({
  cedula: z.string().min(6, 'Cédula inválida').max(20, 'Máximo 20 caracteres'),
  nombre: z.string().min(3, 'Mínimo 3 caracteres').max(150, 'Máximo 150 caracteres'),
  apellido: z.string().min(3, 'Mínimo 3 caracteres').max(150, 'Máximo 150 caracteres'),
  id_mun: z.string().min(1, 'Selecciona un municipio'),
  especialidad: z.string().min(3, 'Mínimo 3 caracteres').max(150, 'Máximo 150 caracteres'),
  tipo_contrato: z.enum(['Estipendio', 'Contratado']),
  horas_max_sem: z.string().min(1, 'Obligatorio'),
  horas_disponibles: z.string().min(1, 'Obligatorio'),
  telefono: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
});

type DocenteFormData = z.infer<typeof docenteSchema>;

export const Docentes = () => {
  const { docentes, isLoading, createDocente, updateDocente, deleteDocente, isCreating, isUpdating } = useDocentes();
  const { municipios } = useMunicipios(); // Carga dinámica de municipios
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocente, setEditingDocente] = useState<Docente | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Docente | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocenteFormData>({
    resolver: zodResolver(docenteSchema),
  });

  const openCreateModal = () => {
    setEditingDocente(null);
    reset({ 
      cedula: '', nombre: '', apellido: '', id_mun: '', especialidad: '', 
      tipo_contrato: 'Estipendio', horas_max_sem: '', horas_disponibles: '', telefono: '' 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (docente: Docente) => {
    setEditingDocente(docente);
    reset({
      cedula: docente.cedula,
      nombre: docente.nombre,
      apellido: docente.apellido,
      id_mun: docente.id_mun.toString(),
      especialidad: docente.especialidad,
      tipo_contrato: docente.tipo_contrato,
      horas_max_sem: docente.horas_max_sem.toString(),
      horas_disponibles: docente.horas_disponibles.toString(),
      telefono: docente.telefono || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDocente(null);
    reset();
  };

  const onSubmit = (data: DocenteFormData) => {
    const payload = {
      cedula: data.cedula,
      nombre: data.nombre,
      apellido: data.apellido,
      id_mun: parseInt(data.id_mun, 10),
      especialidad: data.especialidad,
      tipo_contrato: data.tipo_contrato,
      horas_max_sem: parseInt(data.horas_max_sem, 10),
      horas_disponibles: parseInt(data.horas_disponibles, 10),
      telefono: data.telefono || undefined,
    };

    if (editingDocente) {
      updateDocente({ id: editingDocente.id_doc, data: payload as DocenteUpdate });
    } else {
      createDocente(payload as DocenteCreate);
    }
    closeModal();
  };

  const handleDelete = (docente: Docente) => setDeleteConfirm(docente);
  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteDocente(deleteConfirm.id_doc);
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { key: 'id_doc', label: 'ID' },
    { key: 'cedula', label: 'Cédula' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { 
      key: 'municipio', 
      label: 'Municipio',
      render: (value: any) => value?.nombre || 'N/A'
    },
    { key: 'especialidad', label: 'Especialidad' },
    { key: 'tipo_contrato', label: 'Contrato' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Docentes</h1>
        <button onClick={openCreateModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingDocente ? 'Editar Docente' : 'Nuevo Docente'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Cédula" name="cedula" register={register} errors={errors} />
                <FormField label="Teléfono (Opcional)" name="telefono" register={register} errors={errors} />
                <FormField label="Nombre" name="nombre" register={register} errors={errors} />
                <FormField label="Apellido" name="apellido" register={register} errors={errors} />
                
                {/* SELECT DINÁMICO DE MUNICIPIOS */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Municipio</label>
                  <select
                    {...register('id_mun')}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Selecciona un municipio</option>
                    {municipios?.map((mun) => (
                      <option key={mun.id_mun} value={mun.id_mun}>{mun.nombre}</option>
                    ))}
                  </select>
                  {errors.id_mun && <p className="text-sm text-red-600">{errors.id_mun.message}</p>}
                </div>

                <FormField label="Especialidad" name="especialidad" register={register} errors={errors} />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Tipo de Contrato</label>
                  <select
                    {...register('tipo_contrato')}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Estipendio">Estipendio</option>
                    <option value="Contratado">Contratado</option>
                  </select>
                </div>
                <FormField label="Horas Máx. Semanales" name="horas_max_sem" type="text" register={register} errors={errors} />
                <FormField label="Horas Disponibles" name="horas_disponibles" type="text" register={register} errors={errors} />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
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
            <p className="text-gray-700 mb-6">¿Eliminar al docente <strong>{deleteConfirm.nombre} {deleteConfirm.apellido}</strong>?</p>
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