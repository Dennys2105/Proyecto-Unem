import { useState } from 'react';
import { useNotas } from '../hooks/useNotas';
import { useEstudiantes } from '../hooks/useEstudiantes';
import { useMallas } from '../hooks/useMallas';
import { usePeriodos } from '../hooks/usePeriodos';
import { DataTable } from '../components/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type { Nota, NotaCreate, NotaUpdate } from '../types/models';

// Schema estricto: nota es number desde el inicio
const notaSchema = z.object({
  id_est: z.string().min(1, 'Selecciona un estudiante'),
  id_malla: z.string().min(1, 'Selecciona una malla/materia'),
  id_per: z.string().min(1, 'Selecciona un periodo'),
  nota: z.number().min(0, 'La nota mínima es 0').max(20, 'La nota máxima es 20'),
  tipo_evaluacion: z.string().min(1, 'Selecciona el tipo de evaluación'),
  observaciones: z.string().optional(),
});

type NotaFormData = z.infer<typeof notaSchema>;

const TIPOS_EVALUACION = ['Parcial 1', 'Parcial 2', 'Parcial 3', 'Final', 'Recuperación', 'Trabajo'];

export const NotasPage = () => {
  const { notas, isLoading, createNota, updateNota, deleteNota, isCreating, isUpdating } = useNotas();
  const { estudiantes } = useEstudiantes();
  const { mallas } = useMallas();
  const { periodos } = usePeriodos();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNota, setEditingNota] = useState<Nota | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Nota | null>(null);

  // useForm ahora coincide perfectamente con NotaFormData
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NotaFormData>({
    resolver: zodResolver(notaSchema),
    defaultValues: {
      nota: 0,
      observaciones: ''
    }
  });

  const openCreateModal = () => {
    setEditingNota(null);
    reset({ id_est: '', id_malla: '', id_per: '', nota: 0, tipo_evaluacion: '', observaciones: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (nota: Nota) => {
    setEditingNota(nota);
    reset({
      id_est: nota.id_est?.toString() || '',
      id_malla: nota.id_malla?.toString() || '',
      id_per: nota.id_per?.toString() || '',
      nota: nota.nota || 0,
      tipo_evaluacion: nota.tipo_evaluacion || '',
      observaciones: nota.observaciones || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingNota(null); reset(); };

  const onSubmit = (data: NotaFormData) => {
    const payload: NotaCreate | NotaUpdate = {
      id_est: parseInt(data.id_est, 10),
      id_malla: parseInt(data.id_malla, 10),
      id_per: parseInt(data.id_per, 10),
      nota: data.nota,
      tipo_evaluacion: data.tipo_evaluacion,
      observaciones: data.observaciones || '',
      fecha_registro: new Date().toISOString(),
    };

    if (editingNota && editingNota.id_nota) {
      updateNota({ id: editingNota.id_nota, data: payload as NotaUpdate });
      toast.success('Nota actualizada correctamente');
    } else {
      createNota(payload as NotaCreate);
      toast.success('Nota registrada exitosamente');
    }
    closeModal();
  };

  const handleDelete = (nota: Nota) => setDeleteConfirm(nota);
  const confirmDelete = () => {
    if (deleteConfirm && deleteConfirm.id_nota) {
      deleteNota(deleteConfirm.id_nota);
      toast.success('Nota eliminada');
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { key: 'id_nota', label: 'ID' },
    { 
      key: 'estudiante', label: 'Estudiante',
      render: (_v: any, r: any) => {
        const est = estudiantes?.find(e => e.id_est === r.id_est);
        return est ? `${est.nombre} ${est.apellido}` : `ID: ${r.id_est}`;
      }
    },
    { 
      key: 'malla', label: 'Materia/Malla',
      render: (_v: any, r: any) => {
        const malla = mallas?.find(m => m.id_malla === r.id_malla);
        return malla ? `Malla ${malla.id_malla}` : `ID: ${r.id_malla}`;
      }
    },
    { key: 'nota', label: 'Nota' },
    { key: 'tipo_evaluacion', label: 'Tipo Evaluación' },
    { key: 'observaciones', label: 'Observaciones' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Notas</h1>
          <p className="text-sm text-gray-500 mt-1">Registro y control de evaluaciones académicas</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm">
          Nueva Nota
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={notas || []} 
        isLoading={isLoading} 
        onEdit={openEditModal} 
        onDelete={handleDelete} 
        rowKey={(row) => row.id_nota || 0} 
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingNota ? 'Editar Nota' : 'Registrar Nueva Nota'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Estudiante *</label>
                  <select {...register('id_est')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona</option>
                    {estudiantes?.map((e) => <option key={e.id_est} value={e.id_est}>{e.nombre} {e.apellido}</option>)}
                  </select>
                  {errors.id_est && <p className="text-sm text-red-600">{errors.id_est.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Malla / Materia *</label>
                  <select {...register('id_malla')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona</option>
                    {mallas?.map((m) => <option key={m.id_malla} value={m.id_malla}>ID: {m.id_malla}</option>)}
                  </select>
                  {errors.id_malla && <p className="text-sm text-red-600">{errors.id_malla.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Periodo Académico *</label>
                  <select {...register('id_per')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona</option>
                    {periodos?.map((p) => <option key={p.id_per} value={p.id_per}>{p.nombre}</option>)}
                  </select>
                  {errors.id_per && <p className="text-sm text-red-600">{errors.id_per.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Tipo de Evaluación *</label>
                  <select {...register('tipo_evaluacion')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona</option>
                    {TIPOS_EVALUACION.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                  {errors.tipo_evaluacion && <p className="text-sm text-red-600">{errors.tipo_evaluacion.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Nota (0-20) *</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="20" 
                    {...register('nota', { valueAsNumber: true })} // ← ESTA ES LA CLAVE
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  />
                  {errors.nota && <p className="text-sm text-red-600">{errors.nota.message}</p>}
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                  <input type="text" {...register('observaciones')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
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
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4 text-red-600">Confirmar Eliminación</h2>
            <p className="text-gray-700 mb-6">¿Eliminar esta nota?</p>
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