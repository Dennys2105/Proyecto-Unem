import { useState } from 'react';
import { useEjes } from '../hooks/useEjes';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { EjeFormativo, EjeCreate, EjeUpdate } from '../types/models';

const ejeSchema = z.object({
  codigo: z.string().min(1, 'Obligatorio').max(5, 'Máximo 5 caracteres'),
  nombre: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  descripcion: z.string().min(3, 'Mínimo 3 caracteres').max(250, 'Máximo 250 caracteres'),
});

type EjeFormData = z.infer<typeof ejeSchema>;

export const EjesFormativos = () => {
  const { ejes, isLoading, createEje, updateEje, deleteEje, isCreating, isUpdating } = useEjes();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEje, setEditingEje] = useState<EjeFormativo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<EjeFormativo | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EjeFormData>({ resolver: zodResolver(ejeSchema) });

  const openCreateModal = () => { setEditingEje(null); reset({ codigo: '', nombre: '', descripcion: '' }); setIsModalOpen(true); };
  const openEditModal = (eje: EjeFormativo) => { setEditingEje(eje); reset({ codigo: eje.codigo, nombre: eje.nombre, descripcion: eje.descripcion }); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingEje(null); reset(); };

  const onSubmit = (data: EjeFormData) => {
    if (editingEje) updateEje({ id: editingEje.id_eje, data: data as EjeUpdate });
    else createEje(data as EjeCreate);
    closeModal();
  };

  const handleDelete = (eje: EjeFormativo) => setDeleteConfirm(eje);
  const confirmDelete = () => { if (deleteConfirm) { deleteEje(deleteConfirm.id_eje); setDeleteConfirm(null); } };

  const columns = [
    { key: 'id_eje', label: 'ID' },
    { key: 'codigo', label: 'Código' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ejes Formativos</h1>
        <button onClick={openCreateModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Nuevo Eje</button>
      </div>
      <DataTable columns={columns} data={ejes || []} isLoading={isLoading} onEdit={openEditModal} onDelete={handleDelete} rowKey={(row) => row.id_eje} />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingEje ? 'Editar Eje' : 'Nuevo Eje Formativo'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField label="Código" name="codigo" register={register} errors={errors} placeholder="Ej: EF-01" />
              <FormField label="Nombre" name="nombre" register={register} errors={errors} placeholder="Ej: Ciencias Básicas" />
              <FormField label="Descripción" name="descripcion" register={register} errors={errors} placeholder="Descripción del eje" />
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
            <p className="text-gray-700 mb-6">¿Eliminar el eje <strong>{deleteConfirm.nombre}</strong>?</p>
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