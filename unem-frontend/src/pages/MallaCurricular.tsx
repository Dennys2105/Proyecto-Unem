import { useState } from 'react';
import { useMallas } from '../hooks/useMallas';
import { useProgramas } from '../hooks/useProgramas';
import { useMaterias } from '../hooks/useMaterias';
import { DataTable } from '../components/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { MallaCurricular, MallaCreate, MallaUpdate } from '../types/models';

const mallaSchema = z.object({
  id_pro: z.string().min(1, 'Selecciona un programa'),
  id_mat: z.string().min(1, 'Selecciona una materia'),
  perequisito_id_mat: z.string().optional().or(z.literal('')),
});

type MallaFormData = z.infer<typeof mallaSchema>;

export const MallaCurricularPage = () => {
  const { mallas, isLoading, createMalla, updateMalla, deleteMalla, isCreating, isUpdating } = useMallas();
  const { programas } = useProgramas();
  const { materias } = useMaterias();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMalla, setEditingMalla] = useState<MallaCurricular | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MallaCurricular | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MallaFormData>({
    resolver: zodResolver(mallaSchema),
  });

  const openCreateModal = () => {
    setEditingMalla(null);
    reset({ id_pro: '', id_mat: '', perequisito_id_mat: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (malla: MallaCurricular) => {
    setEditingMalla(malla);
    reset({
      id_pro: malla.id_pro.toString(),
      id_mat: malla.id_mat.toString(),
      perequisito_id_mat: malla.perequisito_id_mat?.toString() || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingMalla(null); reset(); };

  const onSubmit = (data: MallaFormData) => {
    const payload = {
      id_pro: parseInt(data.id_pro, 10),
      id_mat: parseInt(data.id_mat, 10),
      perequisito_id_mat: data.perequisito_id_mat && data.perequisito_id_mat.trim() !== '' 
        ? parseInt(data.perequisito_id_mat, 10) 
        : undefined,
    };

    if (editingMalla) updateMalla({ id: editingMalla.id_malla, data: payload as MallaUpdate });
    else createMalla(payload as MallaCreate);
    closeModal();
  };

  const handleDelete = (malla: MallaCurricular) => setDeleteConfirm(malla);
  const confirmDelete = () => {
    if (deleteConfirm) { deleteMalla(deleteConfirm.id_malla); setDeleteConfirm(null); }
  };

  const columns = [
    { key: 'id_malla', label: 'ID' },
    { 
      key: 'programa', 
      label: 'Programa',
      render: (value: any) => value?.nombre || 'N/A'
    },
    { 
      key: 'materia', 
      label: 'Materia',
      render: (value: any) => value?.nombre || 'N/A'
    },
    { 
      key: 'prerequisito', 
      label: 'Prerequisito',
      render: (value: any) => value?.nombre || 'Ninguno'
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Malla Curricular</h1>
        <button onClick={openCreateModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Nueva Asignación
        </button>
      </div>

      <DataTable
        columns={columns}
        data={mallas || []}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        rowKey={(row) => row.id_malla}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingMalla ? 'Editar Malla' : 'Nueva Malla Curricular'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Programa *</label>
                <select {...register('id_pro')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Selecciona un programa</option>
                  {programas?.map((p) => <option key={p.id_pro} value={p.id_pro}>{p.nombre}</option>)}
                </select>
                {errors.id_pro && <p className="text-sm text-red-600">{errors.id_pro.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Materia *</label>
                <select {...register('id_mat')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Selecciona una materia</option>
                  {materias?.map((m) => <option key={m.id_mat} value={m.id_mat}>{m.nombre}</option>)}
                </select>
                {errors.id_mat && <p className="text-sm text-red-600">{errors.id_mat.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Materia Prerequisito (Opcional)</label>
                <select {...register('perequisito_id_mat')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Ninguno</option>
                  {materias?.map((m) => <option key={m.id_mat} value={m.id_mat}>{m.nombre}</option>)}
                </select>
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
            <p className="text-gray-700 mb-6">¿Eliminar esta asignación de malla?</p>
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