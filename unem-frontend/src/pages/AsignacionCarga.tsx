import { useState } from 'react';
import { useAsignaciones } from '../hooks/useAsignaciones';
import { useDocentes } from '../hooks/useDocentes';
import { useMallas } from '../hooks/useMallas';
import { useEspaciosFisicos } from '../hooks/useEspaciosFisicos';
import { useBloquesHorarios } from '../hooks/useBloquesHorarios';
import { useDias } from '../hooks/useDias';
import { usePeriodos } from '../hooks/usePeriodos';
import { DataTable } from '../components/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AsignacionCarga, AsignacionCreate, AsignacionUpdate } from '../types/models';

const asignacionSchema = z.object({
  id_doc: z.string().min(1, 'Selecciona un docente'),
  id_malla: z.string().min(1, 'Selecciona una malla'),
  id_esp: z.string().min(1, 'Selecciona un espacio'),
  id_bloq: z.string().min(1, 'Selecciona un bloque'),
  id_dia: z.string().min(1, 'Selecciona un día'),
  id_per: z.string().min(1, 'Selecciona un periodo'),
  hora_inicio: z.string().min(1, 'Obligatorio'),
  hora_fin: z.string().min(1, 'Obligatorio'),
});

type AsignacionFormData = z.infer<typeof asignacionSchema>;

export const AsignacionCargaPage = () => {
  const { asignaciones, isLoading, createAsignacion, updateAsignacion, deleteAsignacion, isCreating, isUpdating } = useAsignaciones();
  const { docentes } = useDocentes();
  const { mallas } = useMallas();
  const { espacios } = useEspaciosFisicos();
  const { bloques } = useBloquesHorarios();
  const { dias } = useDias();
  const { periodos } = usePeriodos();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsignacion, setEditingAsignacion] = useState<AsignacionCarga | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AsignacionCarga | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AsignacionFormData>({
    resolver: zodResolver(asignacionSchema),
  });

  const openCreateModal = () => {
    setEditingAsignacion(null);
    reset({ id_doc: '', id_malla: '', id_esp: '', id_bloq: '', id_dia: '', id_per: '', hora_inicio: '07:00', hora_fin: '08:00' });
    setIsModalOpen(true);
  };

  const openEditModal = (asig: AsignacionCarga) => {
    setEditingAsignacion(asig);
    reset({
      id_doc: asig.id_doc?.toString() || '',
      id_malla: asig.id_malla?.toString() || '',
      id_esp: asig.id_esp?.toString() || '',
      id_bloq: asig.id_bloq?.toString() || '',
      id_dia: asig.id_dia?.toString() || '',
      id_per: asig.id_per?.toString() || '',
      hora_inicio: asig.hora_inicio || '07:00',
      hora_fin: asig.hora_fin || '08:00',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingAsignacion(null); reset(); };

  const onSubmit = (data: AsignacionFormData) => {
    // Aseguramos que la hora tenga formato HH:MM:SS si el backend lo exige estrictamente
    const formatTime = (time: string) => time.length === 5 ? `${time}:00` : time;

    const payload: any = {
      id_doc: parseInt(data.id_doc, 10),
      id_malla: parseInt(data.id_malla, 10),
      id_esp: parseInt(data.id_esp, 10),
      id_bloq: parseInt(data.id_bloq, 10),
      id_dia: parseInt(data.id_dia, 10),
      id_per: parseInt(data.id_per, 10),
      hora_inicio: formatTime(data.hora_inicio),
      hora_fin: formatTime(data.hora_fin),
      tipo_actividad: "Carga Académica", // ← Valor exacto que acepta el backend
      observaciones: "Asignación desde frontend",
    };

    if (editingAsignacion) {
      updateAsignacion({ id: editingAsignacion.id_asig, data: payload as AsignacionUpdate });
    } else {
      createAsignacion(payload as AsignacionCreate);
    }
    closeModal();
  };

  const handleDelete = (asig: AsignacionCarga) => setDeleteConfirm(asig);
  const confirmDelete = () => {
    if (deleteConfirm) { deleteAsignacion(deleteConfirm.id_asig); setDeleteConfirm(null); }
  };

  const columns = [
    { key: 'id_asig', label: 'ID' },
    { key: 'hora_inicio', label: 'Inicio' },
    { key: 'hora_fin', label: 'Fin' },
    { 
      key: 'dia', 
      label: 'Día',
      render: (_value: any, row: any) => {
        const d = dias?.find(x => x.id_dia === row.id_dia);
        return d?.dia || 'N/A';
      }
    },
    { 
      key: 'espacio', 
      label: 'Espacio',
      render: (_value: any, row: any) => {
        const e = espacios?.find(x => x.id_esp === row.id_esp);
        return e?.nombre_centro || 'N/A';
      }
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Asignación de Carga Horaria</h1>
        <button onClick={openCreateModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Nueva Asignación
        </button>
      </div>

      <DataTable
        columns={columns}
        data={asignaciones || []}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        rowKey={(row) => row.id_asig}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingAsignacion ? 'Editar Asignación' : 'Nueva Asignación de Carga'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Docente *</label>
                  <select {...register('id_doc')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona un docente</option>
                    {docentes?.map((d) => <option key={d.id_doc} value={d.id_doc}>{d.nombre} {d.apellido}</option>)}
                  </select>
                  {errors.id_doc && <p className="text-sm text-red-600">{errors.id_doc.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Malla Curricular *</label>
                  <select {...register('id_malla')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona una malla</option>
                    {mallas?.map((m) => (
                      <option key={m.id_malla} value={m.id_malla}>
                        ID: {m.id_malla} (Prog: {m.id_pro}, Mat: {m.id_mat})
                      </option>
                    ))}
                  </select>
                  {errors.id_malla && <p className="text-sm text-red-600">{errors.id_malla.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Espacio Físico *</label>
                  <select {...register('id_esp')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona un espacio</option>
                    {espacios?.map((e) => <option key={e.id_esp} value={e.id_esp}>{e.nombre_centro}</option>)}
                  </select>
                  {errors.id_esp && <p className="text-sm text-red-600">{errors.id_esp.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Bloque Horario *</label>
                  <select {...register('id_bloq')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona un bloque</option>
                    {bloques?.map((b) => <option key={b.id_bloq} value={b.id_bloq}>{b.nombre} ({b.hora_inicio} - {b.hora_fin})</option>)}
                  </select>
                  {errors.id_bloq && <p className="text-sm text-red-600">{errors.id_bloq.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Día *</label>
                  <select {...register('id_dia')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona un día</option>
                    {dias?.map((d) => <option key={d.id_dia} value={d.id_dia}>{d.dia}</option>)}
                  </select>
                  {errors.id_dia && <p className="text-sm text-red-600">{errors.id_dia.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Periodo Académico *</label>
                  <select {...register('id_per')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona un periodo</option>
                    {periodos?.map((p) => <option key={p.id_per} value={p.id_per}>{p.nombre} ({p.anio})</option>)}
                  </select>
                  {errors.id_per && <p className="text-sm text-red-600">{errors.id_per.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Hora Inicio *</label>
                  <input type="time" {...register('hora_inicio')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  {errors.hora_inicio && <p className="text-sm text-red-600">{errors.hora_inicio.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Hora Fin *</label>
                  <input type="time" {...register('hora_fin')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  {errors.hora_fin && <p className="text-sm text-red-600">{errors.hora_fin.message}</p>}
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
            <p className="text-gray-700 mb-6">¿Eliminar esta asignación de carga horaria?</p>
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