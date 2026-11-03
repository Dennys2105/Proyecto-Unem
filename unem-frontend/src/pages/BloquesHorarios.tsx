import { useState } from 'react';
import { useBloquesHorarios } from '../hooks/useBloquesHorarios';
import { DataTable } from '../components/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BloqueHorario, BloqueHorarioCreate, BloqueHorarioUpdate } from '../types/models';

const bloqueSchema = z.object({
  hora_inicio: z.string().min(1, 'Obligatorio'),
  hora_fin: z.string().min(1, 'Obligatorio'),
});

type BloqueFormData = z.infer<typeof bloqueSchema>;

export const BloquesHorarios = () => {
  const { bloques, isLoading, createBloque, updateBloque, deleteBloque, isCreating, isUpdating } = useBloquesHorarios();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBloque, setEditingBloque] = useState<BloqueHorario | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BloqueHorario | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BloqueFormData>({
    resolver: zodResolver(bloqueSchema),
  });

  const openCreateModal = () => {
    setEditingBloque(null);
    reset({ hora_inicio: '07:00', hora_fin: '08:00' });
    setIsModalOpen(true);
  };

  const openEditModal = (bloque: BloqueHorario) => {
    setEditingBloque(bloque);
    reset({
      hora_inicio: bloque.hora_inicio,
      hora_fin: bloque.hora_fin,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBloque(null);
    reset();
  };

  const onSubmit = (data: BloqueFormData) => {
    const payload = {
      hora_inicio: data.hora_inicio,
      hora_fin: data.hora_fin,
    };

    if (editingBloque) {
      updateBloque({ id: editingBloque.id_bloq, data: payload as BloqueHorarioUpdate });
    } else {
      createBloque(payload as BloqueHorarioCreate);
    }
    closeModal();
  };

  const handleDelete = (bloque: BloqueHorario) => setDeleteConfirm(bloque);
  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteBloque(deleteConfirm.id_bloq);
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { key: 'id_bloq', label: 'ID' },
    { key: 'hora_inicio', label: 'Hora Inicio' },
    { key: 'hora_fin', label: 'Hora Fin' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Bloques Horarios</h1>
        <button onClick={openCreateModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Nuevo Bloque
        </button>
      </div>

      <DataTable
        columns={columns}
        data={bloques || []}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        rowKey={(row) => row.id_bloq}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingBloque ? 'Editar Bloque' : 'Nuevo Bloque Horario'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Hora Inicio *</label>
                <input
                  type="time"
                  {...register('hora_inicio')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.hora_inicio && <p className="text-sm text-red-600">{errors.hora_inicio.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Hora Fin *</label>
                <input
                  type="time"
                  {...register('hora_fin')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.hora_fin && <p className="text-sm text-red-600">{errors.hora_fin.message}</p>}
              </div>

              <div className="flex justify-end space-x-2">
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
            <p className="text-gray-700 mb-6">¿Eliminar el bloque <strong>{deleteConfirm.hora_inicio} - {deleteConfirm.hora_fin}</strong>?</p>
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