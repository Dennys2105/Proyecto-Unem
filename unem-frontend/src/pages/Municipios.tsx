import { useState } from 'react';
import { useMunicipios } from '../hooks/useMunicipios';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Municipio, MunicipioCreate, MunicipioUpdate } from '../types/models';

const municipioSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100, 'Máximo 100 caracteres'),
});

type MunicipioFormData = z.infer<typeof municipioSchema>;

export const Municipios = () => {
  const { municipios, isLoading, createMunicipio, updateMunicipio, deleteMunicipio, isCreating, isUpdating } = useMunicipios();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMunicipio, setEditingMunicipio] = useState<Municipio | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Municipio | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MunicipioFormData>({
    resolver: zodResolver(municipioSchema),
  });

  const openCreateModal = () => {
    setEditingMunicipio(null);
    reset({ nombre: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (municipio: Municipio) => {
    setEditingMunicipio(municipio);
    reset({ nombre: municipio.nombre });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMunicipio(null);
    reset();
  };

  const onSubmit = (data: MunicipioFormData) => {
    if (editingMunicipio) {
      updateMunicipio({ id: editingMunicipio.id_mun, data: data as MunicipioUpdate });
    } else {
      createMunicipio(data as MunicipioCreate);
    }
    closeModal();
  };

  const handleDelete = (municipio: Municipio) => {
    setDeleteConfirm(municipio);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMunicipio(deleteConfirm.id_mun);
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { key: 'id_mun', label: 'ID' },
    { key: 'nombre', label: 'Nombre' },
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
        <h1 className="text-2xl font-bold text-gray-800">Municipios</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nuevo Municipio
        </button>
      </div>

      <DataTable
        columns={columns}
        data={municipios || []}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        rowKey={(row) => row.id_mun}
      />

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingMunicipio ? 'Editar Municipio' : 'Nuevo Municipio'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                label="Nombre"
                name="nombre"
                register={register}
                errors={errors}
                placeholder="Ingrese el nombre del municipio"
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
              ¿Está seguro de eliminar el municipio <strong>{deleteConfirm.nombre}</strong>?
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