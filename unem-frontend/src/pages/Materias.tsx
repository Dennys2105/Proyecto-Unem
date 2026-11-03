import { useState } from 'react';
import { useMaterias } from '../hooks/useMaterias';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Materia, MateriaCreate, MateriaUpdate } from '../types/models';

const materiaSchema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio').max(20, 'Máximo 20 caracteres'),
  nombre: z.string().min(3, 'Mínimo 3 caracteres').max(150, 'Máximo 150 caracteres'),
  uc: z.string().min(1, 'Obligatorio'),
  horas_teoricas: z.string().min(1, 'Obligatorio'),
  horas_practicas: z.string().min(1, 'Obligatorio'),
});

type MateriaFormData = z.infer<typeof materiaSchema>;

export const Materias = () => {
  const { materias, isLoading, createMateria, updateMateria, deleteMateria, isCreating, isUpdating } = useMaterias();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Materia | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MateriaFormData>({
    resolver: zodResolver(materiaSchema),
  });

  const openCreateModal = () => {
    setEditingMateria(null);
    reset({ codigo: '', nombre: '', uc: '', horas_teoricas: '', horas_practicas: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (mat: Materia) => {
    setEditingMateria(mat);
    reset({
      codigo: mat.codigo,
      nombre: mat.nombre,
      uc: mat.uc.toString(),
      horas_teoricas: mat.horas_teoricas.toString(),
      horas_practicas: mat.horas_practicas.toString(),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMateria(null);
    reset();
  };

  const onSubmit = (data: MateriaFormData) => {
    const payload = {
      codigo: data.codigo,
      nombre: data.nombre,
      uc: parseInt(data.uc, 10),
      horas_teoricas: parseInt(data.horas_teoricas, 10),
      horas_practicas: parseInt(data.horas_practicas, 10),
    };

    if (editingMateria) {
      updateMateria({ id: editingMateria.id_mat, data: payload as MateriaUpdate });
    } else {
      createMateria(payload as MateriaCreate);
    }
    closeModal();
  };

  const handleDelete = (mat: Materia) => setDeleteConfirm(mat);
  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMateria(deleteConfirm.id_mat);
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { key: 'id_mat', label: 'ID' },
    { key: 'codigo', label: 'Código' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'uc', label: 'UC' },
    { key: 'horas_teoricas', label: 'H. Teóricas' },
    { key: 'horas_practicas', label: 'H. Prácticas' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Materias</h1>
        <button onClick={openCreateModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Nueva Materia
        </button>
      </div>

      <DataTable
        columns={columns}
        data={materias || []}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        rowKey={(row) => row.id_mat}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingMateria ? 'Editar Materia' : 'Nueva Materia'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField label="Código" name="codigo" register={register} errors={errors} placeholder="Ej: MAT-101" />
              <FormField label="Nombre" name="nombre" register={register} errors={errors} placeholder="Ej: Matemáticas I" />
              <FormField label="Unidades de Crédito (UC)" name="uc" type="text" register={register} errors={errors} placeholder="Ej: 4" />
              <FormField label="Horas Teóricas" name="horas_teoricas" type="text" register={register} errors={errors} placeholder="Ej: 3" />
              <FormField label="Horas Prácticas" name="horas_practicas" type="text" register={register} errors={errors} placeholder="Ej: 1" />

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
            <p className="text-gray-700 mb-6">¿Eliminar la materia <strong>{deleteConfirm.nombre}</strong>?</p>
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