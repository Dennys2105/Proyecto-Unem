import { useState } from 'react';
import { useProgramas } from '../hooks/useProgramas';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Programa, ProgramaCreate, ProgramaUpdate } from '../types/models';

const programaSchema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio').max(10, 'Máximo 10 caracteres'),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100, 'Máximo 100 caracteres'),
  tipo_sistema: z.enum(['Trimestral', 'Semestral'], {
    message: 'Seleccione un tipo de sistema válido',
  }),
  total_trayectos: z.string().optional(),
  total_uc: z.string().optional(),
});

type ProgramaFormData = z.infer<typeof programaSchema>;

export const Programas = () => {
  const { programas, isLoading, createPrograma, updatePrograma, deletePrograma, isCreating, isUpdating } = useProgramas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrograma, setEditingPrograma] = useState<Programa | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Programa | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProgramaFormData>({
    resolver: zodResolver(programaSchema),
  });

  const openCreateModal = () => {
    setEditingPrograma(null);
    reset({ 
      codigo: '', 
      nombre: '', 
      tipo_sistema: 'Trimestral', 
      total_trayectos: '', 
      total_uc: '' 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (programa: Programa) => {
    setEditingPrograma(programa);
    reset({
      codigo: programa.codigo,
      nombre: programa.nombre,
      tipo_sistema: programa.tipo_sistema,
      total_trayectos: programa.total_trayectos?.toString() || '',
      total_uc: programa.total_uc?.toString() || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPrograma(null);
    reset();
  };

  const onSubmit = (data: ProgramaFormData) => {
    const payload = {
      codigo: data.codigo,
      nombre: data.nombre,
      tipo_sistema: data.tipo_sistema,
      total_trayectos: data.total_trayectos ? parseInt(data.total_trayectos) : undefined,
      total_uc: data.total_uc ? parseInt(data.total_uc) : undefined,
    };

    if (editingPrograma) {
      updatePrograma({ id: editingPrograma.id_pro, data: payload as ProgramaUpdate });
    } else {
      createPrograma(payload as ProgramaCreate);
    }
    closeModal();
  };

  const handleDelete = (programa: Programa) => {
    setDeleteConfirm(programa);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deletePrograma(deleteConfirm.id_pro);
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { key: 'id_pro', label: 'ID' },
    { key: 'codigo', label: 'Código' },
    { key: 'nombre', label: 'Nombre' },
    {
      key: 'tipo_sistema',
      label: 'Tipo Sistema',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${value === 'Trimestral' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
          {value}
        </span>
      ),
    },
    { key: 'total_trayectos', label: 'Trayectos' },
    { key: 'total_uc', label: 'UC' },
    {
      key: 'estatus',
      label: 'Estado',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${value === 'A' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {value === 'A' ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Programas</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nuevo Programa
        </button>
      </div>

      <DataTable
        columns={columns}
        data={programas || []}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        rowKey={(row) => row.id_pro}
      />

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingPrograma ? 'Editar Programa' : 'Nuevo Programa'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                label="Código"
                name="codigo"
                register={register}
                errors={errors}
                placeholder="Ej: INF-001"
              />
              <FormField
                label="Nombre"
                name="nombre"
                register={register}
                errors={errors}
                placeholder="Nombre del programa"
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Tipo de Sistema</label>
                <select
                  {...register('tipo_sistema')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Trimestral">Trimestral</option>
                  <option value="Semestral">Semestral</option>
                </select>
                {errors.tipo_sistema && (
                  <p className="text-sm text-red-600">{errors.tipo_sistema.message}</p>
                )}
              </div>
              <FormField
                label="Total Trayectos"
                name="total_trayectos"
                type="text"
                register={register}
                errors={errors}
                placeholder="Ej: 4"
              />
              <FormField
                label="Total UC"
                name="total_uc"
                type="text"
                register={register}
                errors={errors}
                placeholder="Ej: 20"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
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

      {/* Modal Confirmar Eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4 text-red-600">Confirmar Eliminación</h2>
            <p className="text-gray-700 mb-6">
              ¿Está seguro de eliminar el programa <strong>{deleteConfirm.nombre}</strong>?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};