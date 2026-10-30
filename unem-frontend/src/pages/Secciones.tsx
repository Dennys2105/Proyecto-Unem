import { useState } from 'react';
import { useSecciones } from '../hooks/useSecciones';
import { useProgramas } from '../hooks/useProgramas';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Seccion } from '../types/models';

const seccionSchema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio').max(20, 'Máximo 20 caracteres'),
  id_pro: z.string().min(1, 'Selecciona un programa'),
  trayecto: z.string().min(1, 'Obligatorio'),
  periodo: z.string().min(1, 'Obligatorio'),
  capacidad_maxima: z.string().min(1, 'Obligatorio'),
});

type SeccionFormData = z.infer<typeof seccionSchema>;

export const Secciones = () => {
  const { secciones, isLoading, createSeccion, updateSeccion, deleteSeccion, isCreating, isUpdating } = useSecciones();
  const { programas } = useProgramas();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeccion, setEditingSeccion] = useState<Seccion | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Seccion | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SeccionFormData>({
    resolver: zodResolver(seccionSchema),
  });

  const openCreateModal = () => {
    setEditingSeccion(null);
    reset({ codigo: '', id_pro: '', trayecto: '', periodo: '', capacidad_maxima: '40' });
    setIsModalOpen(true);
  };

  const openEditModal = (seccion: Seccion) => {
    setEditingSeccion(seccion);
    reset({
      codigo: seccion.codigo,
      id_pro: seccion.id_pro.toString(),
      trayecto: seccion.trayecto.toString(),
      periodo: seccion.periodo.toString(),
      capacidad_maxima: seccion.capacidad_maxima.toString(),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSeccion(null);
    reset();
  };

  const onSubmit = (data: SeccionFormData) => {
    const payload = {
      codigo: data.codigo,
      id_pro: parseInt(data.id_pro, 10),
      trayecto: parseInt(data.trayecto, 10),
      periodo: parseInt(data.periodo, 10),
      capacidad_maxima: parseInt(data.capacidad_maxima, 10),
    };

    if (editingSeccion) {
      updateSeccion({ id: editingSeccion.id_sec, data: payload });
    } else {
      createSeccion(payload);
    }
    closeModal();
  };

  const handleDelete = (seccion: Seccion) => setDeleteConfirm(seccion);
  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteSeccion(deleteConfirm.id_sec);
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { key: 'id_sec', label: 'ID' },
    { key: 'codigo', label: 'Código' },
    { key: 'trayecto', label: 'Trayecto' },
    { key: 'periodo', label: 'Período' },
    { key: 'capacidad_maxima', label: 'Capacidad' },
    { 
      key: 'programa', 
      label: 'Programa',
      render: (value: any) => value?.nombre || 'N/A'
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Secciones</h1>
        <button onClick={openCreateModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Nueva Sección
        </button>
      </div>

      <DataTable
        columns={columns}
        data={secciones || []}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        rowKey={(row) => row.id_sec}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingSeccion ? 'Editar Sección' : 'Nueva Sección'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField label="Código" name="codigo" register={register} errors={errors} placeholder="Ej: SEC-001" />
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Programa *</label>
                <select {...register('id_pro')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Selecciona un programa</option>
                  {programas?.map((p) => <option key={p.id_pro} value={p.id_pro}>{p.nombre}</option>)}
                </select>
                {errors.id_pro && <p className="text-sm text-red-600">{errors.id_pro.message}</p>}
              </div>

              <FormField label="Trayecto" name="trayecto" type="text" register={register} errors={errors} placeholder="Ej: 1" />
              <FormField label="Período" name="periodo" type="text" register={register} errors={errors} placeholder="Ej: 1" />
              <FormField label="Capacidad Máxima" name="capacidad_maxima" type="text" register={register} errors={errors} placeholder="Ej: 40" />

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
            <p className="text-gray-700 mb-6">¿Eliminar la sección <strong>{deleteConfirm.codigo}</strong>?</p>
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