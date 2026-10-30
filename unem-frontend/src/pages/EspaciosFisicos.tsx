import { useState } from 'react';
import { useEspaciosFisicos } from '../hooks/useEspaciosFisicos';
import { useMunicipios } from '../hooks/useMunicipios';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { EspacioFisico, EspacioFisicoCreate, EspacioFisicoUpdate } from '../types/models';

const espacioSchema = z.object({
  nombre_centro: z.string().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
  id_mun: z.string().min(1, 'Selecciona un municipio'),
  ubicacion: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  tipo_espacio: z.enum(['Aula'], { message: 'El backend solo acepta "Aula" por ahora' }),
  capacidad: z.string().min(1, 'Obligatorio'),
  equipamiento: z.string().optional().or(z.literal('')),
});

type EspacioFormData = z.infer<typeof espacioSchema>;

export const EspaciosFisicos = () => {
  const { espacios, isLoading, createEspacio, updateEspacio, deleteEspacio, isCreating, isUpdating } = useEspaciosFisicos();
  const { municipios } = useMunicipios();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEspacio, setEditingEspacio] = useState<EspacioFisico | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<EspacioFisico | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EspacioFormData>({
    resolver: zodResolver(espacioSchema),
    defaultValues: {
      tipo_espacio: 'Aula'
    }
  });

  const openCreateModal = () => {
    setEditingEspacio(null);
    reset({ nombre_centro: '', id_mun: '', ubicacion: '', tipo_espacio: 'Aula', capacidad: '', equipamiento: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (esp: EspacioFisico) => {
    setEditingEspacio(esp);
    reset({
      nombre_centro: esp.nombre_centro,
      id_mun: esp.id_mun.toString(),
      ubicacion: esp.ubicacion,
      tipo_espacio: 'Aula', // Forzamos Aula porque el backend solo lo acepta
      capacidad: esp.capacidad.toString(),
      equipamiento: esp.equipamiento || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEspacio(null);
    reset();
  };

  const onSubmit = (data: EspacioFormData) => {
    const payload = {
      nombre_centro: data.nombre_centro,
      id_mun: parseInt(data.id_mun, 10),
      ubicacion: data.ubicacion,
      tipo_espacio: 'Aula', // Enviamos estrictamente "Aula"
      capacidad: parseInt(data.capacidad, 10),
      equipamiento: data.equipamiento && data.equipamiento.trim() !== '' ? data.equipamiento : undefined,
      disponibilidad: true,
    };

    if (editingEspacio) {
      updateEspacio({ id: editingEspacio.id_esp, data: payload as EspacioFisicoUpdate });
    } else {
      createEspacio(payload as EspacioFisicoCreate);
    }
    closeModal();
  };

  const handleDelete = (esp: EspacioFisico) => setDeleteConfirm(esp);
  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteEspacio(deleteConfirm.id_esp);
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { key: 'id_esp', label: 'ID' },
    { key: 'nombre_centro', label: 'Nombre del Centro' },
    { key: 'ubicacion', label: 'Ubicación' },
    { key: 'tipo_espacio', label: 'Tipo' },
    { key: 'capacidad', label: 'Capacidad' },
    { 
      key: 'municipio', 
      label: 'Municipio',
      render: (value: any) => value?.nombre || 'N/A'
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Espacios Físicos</h1>
        <button onClick={openCreateModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Nuevo Espacio
        </button>
      </div>

      <DataTable
        columns={columns}
        data={espacios || []}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        rowKey={(row) => row.id_esp}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingEspacio ? 'Editar Espacio' : 'Nuevo Espacio Físico'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Nombre del Centro" name="nombre_centro" register={register} errors={errors} placeholder="Ej: Aula 101" />
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Municipio *</label>
                  <select {...register('id_mun')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona un municipio</option>
                    {municipios?.map((m) => <option key={m.id_mun} value={m.id_mun}>{m.nombre}</option>)}
                  </select>
                  {errors.id_mun && <p className="text-sm text-red-600">{errors.id_mun.message}</p>}
                </div>

                <FormField label="Ubicación Detallada" name="ubicacion" register={register} errors={errors} placeholder="Ej: Piso 2, Ala Norte" />
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Tipo de Espacio *</label>
                  <select 
                    {...register('tipo_espacio')} 
                    disabled 
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                  >
                    <option value="Aula">Aula (Único tipo soportado por el backend)</option>
                  </select>
                  <p className="text-xs text-gray-500">Tu compañero debe agregar "Laboratorio", "Auditorio", etc. al backend para habilitar más opciones.</p>
                </div>

                <FormField label="Capacidad (personas)" name="capacidad" type="text" register={register} errors={errors} placeholder="Ej: 40" />
                <FormField label="Equipamiento (Opcional)" name="equipamiento" register={register} errors={errors} placeholder="Ej: Proyector, Aire Acondicionado" />
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
            <p className="text-gray-700 mb-6">¿Eliminar el espacio <strong>{deleteConfirm.nombre_centro}</strong>?</p>
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