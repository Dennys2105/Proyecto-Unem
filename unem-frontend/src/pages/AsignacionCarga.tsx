import { useState } from 'react';
import { useAsignaciones } from '../hooks/useAsignaciones';
import { useDocentes } from '../hooks/useDocentes';
import { useMallas } from '../hooks/useMallas';
import { useEspaciosFisicos } from '../hooks/useEspaciosFisicos';
import { useDias } from '../hooks/useDias';
import { usePeriodos } from '../hooks/usePeriodos';
import { useMunicipios } from '../hooks/useMunicipios';
import { DataTable } from '../components/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { exportToExcel, generateFichaAcademicaPDF, generateGeneralPNFPDF } from '../utils/exportUtils';
import { FileSpreadsheet, FileText, X, User, Building } from 'lucide-react';
import type { AsignacionCarga, AsignacionCreate, AsignacionUpdate } from '../types/models';

const asignacionSchema = z.object({
  id_doc: z.string().min(1, 'Selecciona un docente'),
  id_malla: z.string().min(1, 'Selecciona una malla'),
  id_esp: z.string().min(1, 'Selecciona un espacio'),
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
  const { dias } = useDias();
  const { periodos } = usePeriodos();
  const { municipios } = useMunicipios();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingAsignacion, setEditingAsignacion] = useState<AsignacionCarga | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AsignacionCarga | null>(null);
  const [reportType, setReportType] = useState<'individual' | 'general' | null>(null);
  const [selectedDocenteId, setSelectedDocenteId] = useState<string>('');
  const [selectedPnf, setSelectedPnf] = useState<string>('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AsignacionFormData>({
    resolver: zodResolver(asignacionSchema),
  });

  const openCreateModal = () => {
    setEditingAsignacion(null);
    reset({ id_doc: '', id_malla: '', id_esp: '', id_dia: '', id_per: '', hora_inicio: '07:00', hora_fin: '08:00' });
    setIsModalOpen(true);
  };

  const openEditModal = (asig: AsignacionCarga) => {
    setEditingAsignacion(asig);
    reset({
      id_doc: asig.id_doc?.toString() || '',
      id_malla: asig.id_malla?.toString() || '',
      id_esp: asig.id_esp?.toString() || '',
      id_dia: asig.id_dia?.toString() || '',
      id_per: asig.id_per?.toString() || '',
      hora_inicio: asig.hora_inicio || '07:00',
      hora_fin: asig.hora_fin || '08:00',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingAsignacion(null); reset(); };
  const closeReportModal = () => { setIsReportModalOpen(false); setReportType(null); setSelectedDocenteId(''); setSelectedPnf(''); };

  const onSubmit = (data: AsignacionFormData) => {
    const formatTime = (time: string) => time.length === 5 ? `${time}:00` : time;
    const payload: any = {
      id_doc: parseInt(data.id_doc, 10),
      id_malla: parseInt(data.id_malla, 10),
      id_esp: parseInt(data.id_esp, 10),
      id_dia: parseInt(data.id_dia, 10),
      id_per: parseInt(data.id_per, 10),
      hora_inicio: formatTime(data.hora_inicio),
      hora_fin: formatTime(data.hora_fin),
      tipo_actividad: "Carga Académica",
      observaciones: "Asignación directa",
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

  const handleGenerateReport = () => {
    if (reportType === 'individual') {
      if (!selectedDocenteId) return alert('Selecciona un docente.');
      const docente = docentes?.find((d) => d.id_doc.toString() === selectedDocenteId);
      if (!docente) return;

      const asignacionesDocente = asignaciones?.filter((a) => a.id_doc?.toString() === selectedDocenteId) || [];
      const primeraAsig = asignacionesDocente[0];
      const periodo = periodos?.find((p) => p.id_per === primeraAsig?.id_per);
      const municipioDocente = municipios?.find((m) => m.id_mun === docente.id_mun)?.nombre || 'SAN CRISTÓBAL';

      const ucSet = new Set<string>();
      asignacionesDocente.forEach((asig) => {
        const malla = mallas?.find((m) => m.id_malla === asig.id_malla);
        if (malla) ucSet.add(`Unidad Curricular (Malla ID: ${malla.id_malla})`);
      });

      const franjasUnicas = [...new Set(asignacionesDocente.map((a) => `${a.hora_inicio} - ${a.hora_fin}`))].sort();
      const horarioSemanal = franjasUnicas.map((franja) => {
        const asigsEnFranja = asignacionesDocente.filter((a) => `${a.hora_inicio} - ${a.hora_fin}` === franja);
        const porDia: Record<string, string> = {};
        asigsEnFranja.forEach((asig) => {
          const nombreDia = dias?.find((d) => d.id_dia === asig.id_dia)?.dia || 'Día N/A';
          const malla = mallas?.find((m) => m.id_malla === asig.id_malla);
          if (porDia[nombreDia]) porDia[nombreDia] += `\nMalla ${malla?.id_malla}`;
          else porDia[nombreDia] = `Malla ${malla?.id_malla}`;
        });
        return {
          horario: franja,
          viernes: porDia['Viernes'] || '',
          sabado: porDia['Sábado'] || '',
          observacion: Object.keys(porDia).filter((d) => d !== 'Viernes' && d !== 'Sábado').join(', '),
        };
      });

      if (horarioSemanal.length === 0) {
        horarioSemanal.push({ horario: 'Sin asignaciones', viernes: '', sabado: '', observacion: '' });
      }

      generateFichaAcademicaPDF({
        estado: 'TÁCHIRA',
        municipio: municipioDocente.toUpperCase(),
        aulaTaller: 'SEDE PRINCIPAL',
        periodoAcademico: periodo?.nombre || '2026-1',
        programaFormacion: 'PNF',
        cohorte: '2023',
        trayecto: 'III',
        semestre: 'VII',
        unidadCurricular: ucSet.size > 0 ? Array.from(ucSet) : ['Sin asignaciones'],
        docenteInvestigador: `${docente.nombre} ${docente.apellido} (${docente.especialidad || 'Docente'})`.toUpperCase(),
        cedulaIdentidad: docente.cedula || 'V-00.000.000',
        correo: 'correo@ejemplo.com',
        telefono: docente.telefono || '0000-0000000',
        fechaEntrega: new Date().toLocaleDateString('es-VE'),
        horarioSemanal,
      }, `Ficha_${docente.nombre}_${docente.apellido}`.replace(/\s+/g, '_'));

      closeReportModal();

    } else if (reportType === 'general') {
      if (!selectedPnf) return toast.error('Por favor, selecciona un PNF (Primaria o Especial).');

      // FILTRO ROBUSTO: Intenta usar el nombre del programa, pero si no existe, usa una lógica de respaldo
      const asignacionesFiltradas = asignaciones?.filter((asig) => {
        const malla = mallas?.find((m) => m.id_malla === asig.id_malla);
        if (!malla) return false;

        // Opción A: Si el backend devuelve el objeto programa anidado (lo ideal)
        if (malla.programa && malla.programa.nombre) {
          const nombrePrograma = malla.programa.nombre.toLowerCase();
          if (selectedPnf === 'primaria') return nombrePrograma.includes('primaria');
          if (selectedPnf === 'especial') return nombrePrograma.includes('especial');
        }
        
        // Opción B (Respaldo): Si el backend solo devuelve id_pro, podemos mapear IDs conocidos
        // (Ajusta estos IDs según los que tengas en tu BD real. En el SQL 4.1, id_pro 1 es Primaria, 2 es Especial)
        if (selectedPnf === 'primaria' && malla.id_pro === 1) return true;
        if (selectedPnf === 'especial' && malla.id_pro === 2) return true;

        return false;
      }) || [];

      const datosParaTabla = asignacionesFiltradas.map((asig) => {
        const doc = docentes?.find((d) => d.id_doc === asig.id_doc);
        const dia = dias?.find((d) => d.id_dia === asig.id_dia)?.dia || 'N/A';
        const espacio = espacios?.find((e) => e.id_esp === asig.id_esp)?.nombre_centro || 'N/A';
        const malla = mallas?.find((m) => m.id_malla === asig.id_malla);
        
        // Intenta obtener el nombre de la materia si el backend la incluye, sino usa el ID de malla
        const materiaNombre = typeof malla?.materia === 'string' 
          ? malla.materia 
          : (malla?.materia as any)?.nombre || `Malla ID: ${malla?.id_malla}`;

        return {
          dia,
          hora: `${asig.hora_inicio} - ${asig.hora_fin}`,
          docente: doc ? `${doc.nombre} ${doc.apellido}` : 'N/A',
          materia: materiaNombre,
          espacio,
        };
      }).sort((a, b) => a.dia.localeCompare(b.dia) || a.hora.localeCompare(b.hora));

      const pnfLabel = selectedPnf === 'especial' ? 'EDUCACIÓN ESPECIAL' : 'EDUCACIÓN PRIMARIA';
      generateGeneralPNFPDF(datosParaTabla, pnfLabel);
      toast.success('Reporte generado exitosamente. Revisa la nueva pestaña.');
      closeReportModal();
    }
  };

  const handleExportExcel = () => {
    const dataToExport = asignaciones?.map((a) => ({
      'ID': a.id_asig,
      'Docente': docentes?.find((d) => d.id_doc === a.id_doc)?.nombre || 'N/A',
      'Día': dias?.find((d) => d.id_dia === a.id_dia)?.dia || 'N/A',
      'Inicio': a.hora_inicio,
      'Fin': a.hora_fin,
      'Espacio': espacios?.find((e) => e.id_esp === a.id_esp)?.nombre_centro || 'N/A',
    })) || [];
    exportToExcel(dataToExport, 'Reporte_General_Carga');
  };

  const columns = [
    { key: 'id_asig', label: 'ID' },
    {
      key: 'id_doc', label: 'Docente',
      render: (_v: any, r: any) => {
        const doc = docentes?.find((d) => d.id_doc === r.id_doc);
        return doc ? `${doc.nombre} ${doc.apellido}` : 'N/A';
      },
    },
    { key: 'hora_inicio', label: 'Inicio' },
    { key: 'hora_fin', label: 'Fin' },
    {
      key: 'id_dia', label: 'Día',
      render: (_v: any, r: any) => dias?.find((d) => d.id_dia === r.id_dia)?.dia || 'N/A',
    },
    {
      key: 'id_esp', label: 'Espacio',
      render: (_v: any, r: any) => espacios?.find((e) => e.id_esp === r.id_esp)?.nombre_centro || 'N/A',
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asignación de Carga Horaria</h1>
          <p className="text-sm text-gray-500 mt-1">Gestione las asignaciones y genere reportes institucionales</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm">
            Nueva Asignación
          </button>
          <button onClick={() => setIsReportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium shadow-sm">
            <FileText size={18} /> Generar Reportes PDF
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium shadow-sm">
            <FileSpreadsheet size={18} /> Exportar Excel
          </button>
        </div>
      </div>

      <DataTable columns={columns} data={asignaciones || []} isLoading={isLoading} onEdit={openEditModal} onDelete={handleDelete} rowKey={(row) => row.id_asig} />

      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Generar Reporte PDF</h2>
              <button onClick={closeReportModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {!reportType ? (
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => setReportType('individual')} className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left">
                  <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Horario Individual por Docente</h3>
                    <p className="text-sm text-gray-600">Genera la ficha académica con el horario específico de un docente.</p>
                  </div>
                </button>
                <button onClick={() => setReportType('general')} className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
                  <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                    <Building size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Horario General por PNF</h3>
                    <p className="text-sm text-gray-600">Genera un consolidado semanal de todos los docentes por PNF (Primaria o Especial).</p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button onClick={() => setReportType(null)} className="text-sm text-purple-600 hover:underline flex items-center gap-1 mb-2">
                  ← Volver a opciones
                </button>

                {reportType === 'individual' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Seleccionar Docente</label>
                    <select value={selectedDocenteId} onChange={(e) => setSelectedDocenteId(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500">
                      <option value="">-- Seleccione un docente --</option>
                      {docentes?.map((d) => <option key={d.id_doc} value={d.id_doc}>{d.nombre} {d.apellido}</option>)}
                    </select>
                  </div>
                )}

                {reportType === 'general' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Seleccionar PNF</label>
                    <select value={selectedPnf} onChange={(e) => setSelectedPnf(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">-- Seleccione un PNF --</option>
                      <option value="primaria">Educación Primaria</option>
                      <option value="especial">Educación Especial</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                  <button onClick={closeReportModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button
                    onClick={handleGenerateReport}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={(reportType === 'individual' && !selectedDocenteId) || (reportType === 'general' && !selectedPnf)}
                  >
                    Generar PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingAsignacion ? 'Editar Asignación' : 'Nueva Asignación'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Docente *</label>
                  <select {...register('id_doc')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona</option>
                    {docentes?.map((d) => <option key={d.id_doc} value={d.id_doc}>{d.nombre} {d.apellido}</option>)}
                  </select>
                  {errors.id_doc && <p className="text-sm text-red-600">{errors.id_doc.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Malla *</label>
                  <select {...register('id_malla')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona</option>
                    {mallas?.map((m) => <option key={m.id_malla} value={m.id_malla}>ID: {m.id_malla}</option>)}
                  </select>
                  {errors.id_malla && <p className="text-sm text-red-600">{errors.id_malla.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Espacio *</label>
                  <select {...register('id_esp')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona</option>
                    {espacios?.map((e) => <option key={e.id_esp} value={e.id_esp}>{e.nombre_centro}</option>)}
                  </select>
                  {errors.id_esp && <p className="text-sm text-red-600">{errors.id_esp.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Día *</label>
                  <select {...register('id_dia')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona</option>
                    {dias?.map((d) => <option key={d.id_dia} value={d.id_dia}>{d.dia}</option>)}
                  </select>
                  {errors.id_dia && <p className="text-sm text-red-600">{errors.id_dia.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Periodo *</label>
                  <select {...register('id_per')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona</option>
                    {periodos?.map((p) => <option key={p.id_per} value={p.id_per}>{p.nombre}</option>)}
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
            <p className="text-gray-700 mb-6">¿Eliminar esta asignación?</p>
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