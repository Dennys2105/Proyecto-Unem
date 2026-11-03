import { useState } from 'react';
import { usePeriodos } from '../hooks/usePeriodos';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { PeriodoAcademico, PeriodoCreate, PeriodoUpdate } from '../types/models';

const periodoSchema = z.object({
  nombre: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  anio: z.string().min(4, 'Año inválido').max(4, 'Año inválido'),
  numero_periodo: z.string().min(1, 'Obligatorio'),
  tipo: z.enum(['Trimestre', 'Semestre']),
  fecha_inicio: z.string().min(1, 'Obligatorio'),
  fecha_fin: z.string().min(1, 'Obligatorio'),
});

type PeriodoFormData = z.infer<typeof periodoSchema>;

export const PeriodosAcademicos = () => {
  const { periodos, isLoading, createPeriodo, updatePeriodo, deletePeriodo, isCreating, isUpdating } = usePeriodos();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriodo, setEditingPeriodo] = useState<PeriodoAcademico | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PeriodoAcademico | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PeriodoFormData>({ resolver: zodResolver(periodoSchema) });

  const openCreateModal = () => { 
    setEditingPeriodo(null); 
    reset({ nombre: '', anio: new Date().getFullYear().toString(), numero_periodo: '1', tipo: 'Trimestre', fecha_inicio: '', fecha_fin: '' }); 
    setIsModalOpen(true); 
  };
  
  const openEditModal = (per: PeriodoAcademico) => { 
    setEditingPeriodo(per); 
    reset({ 
      nombre: per.nombre, anio: per.anio.toString(), numero_periodo: per.numero_periodo.toString(), 
      tipo: per.tipo, fecha_inicio: per.fecha_inicio, fecha_fin: per.fecha_fin 
    }); 
    setIsModalOpen(true); 
  };
  
  const closeModal = () => { setIsModalOpen(false); setEditingPeriodo(null); reset(); };

  const onSubmit = (data: PeriodoFormData) => {
    const payload = {
      nombre: data.nombre,
      anio: parseInt(data.anio, 10),
      numero_periodo: parseInt(data.numero_periodo, 10),
      tipo: data.tipo,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      activo: true,
      actualizar: new Date().toISOString(),
    };

    if (editingPeriodo) updatePeriodo({ id: editingPeriodo.id_per, data: payload as PeriodoUpdate });
    else createPeriodo(payload as PeriodoCreate);
    closeModal();
  };

  const handleDelete = (per: PeriodoAcademico) => setDeleteConfirm(per);
  const confirmDelete = () => { if (deleteConfirm) { deletePeriodo(deleteConfirm.id_per); setDeleteConfirm(null); } };

  const columns = [
    { key: 'id_per', label: 'ID' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'anio', label: 'Año' },
    { key: 'numero_periodo', label: 'Período' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'fecha_inicio', label: 'Inicio' },
    { key: 'fecha_fin', label: 'Fin' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Periodos Académicos</h1>
        <button onClick={openCreateModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Nuevo Periodo</button>
      </div>
      <DataTable columns={columns} data={periodos || []} isLoading={isLoading} onEdit={openEditModal} onDelete={handleDelete} rowKey={(row) => row.id_per} />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingPeriodo ? 'Editar Periodo' : 'Nuevo Periodo Académico'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Nombre" name="nombre" register={register} errors={errors} placeholder="Ej: Periodo Regular" />
                <FormField label="Año" name="anio" type="text" register={register} errors={errors} placeholder="Ej: 2024" />
                <FormField label="Número de Período" name="numero_periodo" type="text" register={register} errors={errors} placeholder="Ej: 1" />
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Tipo *</label>
                  <select {...register('tipo')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="Trimestre">Trimestre</option>
                    <option value="Semestre">Semestre</option>
                  </select>
                  {errors.tipo && <p className="text-sm text-red-600">{errors.tipo.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Fecha Inicio *</label>
                  <input type="date" {...register('fecha_inicio')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  {errors.fecha_inicio && <p className="text-sm text-red-600">{errors.fecha_inicio.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Fecha Fin *</label>
                  <input type="date" {...register('fecha_fin')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  {errors.fecha_fin && <p className="text-sm text-red-600">{errors.fecha_fin.message}</p>}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
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
            <p className="text-gray-700 mb-6">¿Eliminar el periodo <strong>{deleteConfirm.nombre}</strong>?</p>
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