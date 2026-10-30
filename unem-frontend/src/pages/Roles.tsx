import { useState } from 'react';
import { useRoles } from '../hooks/useRoles';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Rol, RolCreate, RolUpdate } from '../types/models';

const rolSchema = z.object({
  rol: z.string().min(3, 'El nombre del rol debe tener al menos 3 caracteres').max(50, 'Máximo 50 caracteres'),
  descripcion: z.string().max(150, 'Máximo 150 caracteres').optional(),
});

type RolFormData = z.infer<typeof rolSchema>;

export const Roles = () => {
  const { roles, isLoading, createRol, updateRol, deleteRol, isCreating, isUpdating } = useRoles();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRol, setEditingRol] = useState<Rol | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Rol | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RolFormData>({
    resolver: zodResolver(rolSchema),
  });

  const openCreateModal = () => {
    setEditingRol(null);
    reset({ rol: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (rol: Rol) => {
    setEditingRol(rol);
    reset({ rol: rol.rol, descripcion: rol.descripcion || '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRol(null);
    reset();
  };

  const onSubmit = (data: RolFormData) => {
    if (editingRol) {
      updateRol({ id: editingRol.id_rol, data: data as RolUpdate });
    } else {
      createRol(data as RolCreate);
    }
    closeModal();
  };

  const handleDelete = (rol: Rol) => {
    setDeleteConfirm(rol);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteRol(deleteConfirm.id_rol);
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { key: 'id_rol', label: 'ID' },
    { key: 'rol', label: 'Rol' },
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
        <h1 className="text-2xl font-bold text-gray-800">Roles</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nuevo Rol
        </button>
      </div>

      <DataTable
        columns={columns}
        data={roles || []}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        rowKey={(row) => row.id_rol}
      />

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingRol ? 'Editar Rol' : 'Nuevo Rol'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                label="Nombre del Rol"
                name="rol"
                register={register}
                errors={errors}
                placeholder="Ej: Administrador"
              />
              <FormField
                label="Nombre del Rol"
                name="rol"
                register={register}
                errors={errors}
                placeholder="Ej: Administrador"
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
              ¿Está seguro de eliminar el rol <strong>{deleteConfirm.rol}</strong>?
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