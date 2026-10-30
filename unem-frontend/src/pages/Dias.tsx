import { useState } from 'react';
import { useDias } from '../hooks/useDias';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Dia, DiaCreate, DiaUpdate } from '../types/models';

// Usamos z.string() para el orden para evitar conflictos de tipos con react-hook-form
const diaSchema = z.object({
  dia: z.string().min(3, 'El nombre del día debe tener al menos 3 caracteres').max(50, 'Máximo 50 caracteres'),
  orden: z.string().min(1, 'El orden es obligatorio').max(1, 'Máximo 1 dígito'),
});

type DiaFormData = z.infer<typeof diaSchema>;

export const Dias = () => {
  const { dias, isLoading, createDia, updateDia, deleteDia, isCreating, isUpdating } = useDias();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDia, setEditingDia] = useState<Dia | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Dia | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DiaFormData>({
    resolver: zodResolver(diaSchema),
  });

  const openCreateModal = () => {
    setEditingDia(null);
    reset({ dia: '', orden: '1' });
    setIsModalOpen(true);
  };

  const openEditModal = (dia: Dia) => {
    setEditingDia(dia);
    reset({ dia: dia.dia, orden: dia.orden.toString() });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDia(null);
    reset();
  };

  const onSubmit = (data: DiaFormData) => {
    // Convertimos el string a number solo aquí, para el payload del backend
    const payload = {
      dia: data.dia,
      orden: parseInt(data.orden, 10),
    };

    if (editingDia) {
      updateDia({ id: editingDia.id_dia, data: payload as DiaUpdate });
    } else {
      createDia(payload as DiaCreate);
    }
    closeModal();
  };

  const handleDelete = (dia: Dia) => {
    setDeleteConfirm(dia);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteDia(deleteConfirm.id_dia);
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { key: 'id_dia', label: 'ID' },
    { key: 'dia', label: 'Día' },
    { key: 'orden', label: 'Orden' },
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
        <h1 className="text-2xl font-bold text-gray-800">Días Laborales</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nuevo Día
        </button>
      </div>

      <DataTable
        columns={columns}
        data={dias || []}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        rowKey={(row) => row.id_dia}
      />

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingDia ? 'Editar Día' : 'Nuevo Día'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                label="Nombre del Día"
                name="dia"
                register={register}
                errors={errors}
                placeholder="Ej: Lunes"
              />
              <FormField
                label="Orden (1-7)"
                name="orden"
                type="text"
                register={register}
                errors={errors}
                placeholder="Ej: 1"
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
              ¿Está seguro de eliminar el día <strong>{deleteConfirm.dia}</strong>?
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