import { useState, useMemo } from 'react';
import { useAsignaciones } from '../hooks/useAsignaciones';
import { useDocentes } from '../hooks/useDocentes';
import { useMallas } from '../hooks/useMallas';
import { useEspaciosFisicos } from '../hooks/useEspaciosFisicos';
import { useDias } from '../hooks/useDias';
import { usePeriodos } from '../hooks/usePeriodos';
import { useMunicipios } from '../hooks/useMunicipios'; // ✅ NUEVO
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import api from '../lib/axios'; // ✅ NUEVO
import toast from 'react-hot-toast';
import { exportToExcel, generateFichaAcademicaPDF, generateGeneralPNFPDF } from '../utils/exportUtils'; // ✅ ACTUALIZADO
import { 
  FileSpreadsheet, FileText, X, User, Building, Calendar, 
  Clock, AlertTriangle, CheckCircle 
} from 'lucide-react';
import type { AsignacionCarga, AsignacionCreate, AsignacionUpdate } from '../types/models';
import { useAuth } from '../hooks/useAuth';
import { ordenarNaturalPor } from '../utils/ordenarNatural';

const asignacionSchema = z.object({
  id_doc: z.string().min(1, 'Selecciona un docente'),
  id_malla: z.string().min(1, 'Selecciona una malla/materia'),
  id_esp: z.string().min(1, 'Selecciona un espacio'),
  id_sec: z.string(),
  id_dia: z.string().min(1, 'Selecciona un día'),
  id_per: z.string().min(1, 'Selecciona un periodo'),
  hora_inicio: z.string().min(1, 'Obligatorio'),
  hora_fin: z.string().min(1, 'Obligatorio'),
}).refine((data) => data.hora_fin > data.hora_inicio, {
  message: "La hora de fin debe ser posterior a la hora de inicio",
  path: ["hora_fin"],
});

type AsignacionFormData = z.infer<typeof asignacionSchema>;

export const AsignacionCargaPage = () => {
  const { asignaciones, isLoading, createAsignacion, updateAsignacion, deleteAsignacion, isCreating, isUpdating } = useAsignaciones();
  const { docentes } = useDocentes();
  const { mallas } = useMallas();
  const { espacios } = useEspaciosFisicos();
  const { dias } = useDias();
  const { periodos } = usePeriodos();
  const { municipios } = useMunicipios(); // ✅ NUEVO
  const { esAdmin, esCoordinador } = useAuth();
  const puedeEditar = esAdmin || esCoordinador;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingAsignacion, setEditingAsignacion] = useState<AsignacionCarga | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AsignacionCarga | null>(null);
  const [reportType, setReportType] = useState<'individual' | 'general' | null>(null);
  const [selectedDocenteId, setSelectedDocenteId] = useState<string>('');
  const [selectedPnf, setSelectedPnf] = useState<string>('');
  
  const [filtroDocente, setFiltroDocente] = useState<string>('');
  const [filtroEspacio, setFiltroEspacio] = useState<string>('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AsignacionFormData>({
    resolver: zodResolver(asignacionSchema),
  });

  const docenteWatch = watch('id_doc');
  const docenteSeleccionado = docentes?.find(d => d.id_doc.toString() === docenteWatch);

  const openCreateModal = () => {
    setEditingAsignacion(null);
    reset({ id_doc: '', id_malla: '', id_esp: '', id_sec: '', id_dia: '', id_per: '', hora_inicio: '07:00', hora_fin: '08:00' });
    setIsModalOpen(true);
  };

  const openEditModal = (asig: AsignacionCarga) => {
    setEditingAsignacion(asig);
    reset({
      id_doc: asig.id_doc?.toString() || '',
      id_malla: asig.id_malla?.toString() || '',
      id_esp: asig.id_esp?.toString() || '',
      id_sec: asig.id_sec?.toString() || '',
      id_dia: asig.id_dia?.toString() || '',
      id_per: asig.id_per?.toString() || '',
      hora_inicio: asig.hora_inicio || '07:00',
      hora_fin: asig.hora_fin || '08:00',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingAsignacion(null); reset(); };
  const closeReportModal = () => { setIsReportModalOpen(false); setReportType(null); setSelectedDocenteId(''); setSelectedPnf(''); };

  const onSubmit = async (data: z.infer<typeof asignacionSchema>) => {
    const formatTime = (time: string) => time.length === 5 ? `${time}:00` : time;
    const nuevoInicio = formatTime(data.hora_inicio);
    const nuevoFin = formatTime(data.hora_fin);
    const nuevoDia = parseInt(data.id_dia, 10);
    const nuevoDocente = parseInt(data.id_doc, 10);
    const nuevoEspacio = parseInt(data.id_esp, 10);

    const haySolapamiento = (ini1: string, fin1: string, ini2: string, fin2: string) => ini1 < fin2 && ini2 < fin1;

    const conflictos = (asignaciones || []).filter((asig) => {
      if (editingAsignacion && asig.id_asig === editingAsignacion.id_asig) return false;
      if (asig.id_dia !== nuevoDia) return false;
      const choqueDocente = asig.id_doc === nuevoDocente && haySolapamiento(nuevoInicio, nuevoFin, asig.hora_inicio, asig.hora_fin);
      const choqueEspacio = asig.id_esp === nuevoEspacio && haySolapamiento(nuevoInicio, nuevoFin, asig.hora_inicio, asig.hora_fin);
      return choqueDocente || choqueEspacio;
    });

    if (conflictos.length > 0) {
      const nombreDia = dias?.find(d => d.id_dia === nuevoDia)?.dia || 'este día';
      const conflictoDocente = conflictos.find(c => c.id_doc === nuevoDocente);
      const conflictoEspacio = conflictos.find(c => c.id_esp === nuevoEspacio);

      if (conflictoDocente) {
        const doc = docentes?.find(d => d.id_doc === nuevoDocente);
        toast.error(`⚠️ CONFLICTO: El docente ${doc?.nombre} ${doc?.apellido} ya tiene clase el ${nombreDia} de ${conflictoDocente.hora_inicio} a ${conflictoDocente.hora_fin}.`, { duration: 6000 });
        return;
      }
      if (conflictoEspacio) {
        const esp = espacios?.find(e => e.id_esp === nuevoEspacio);
        toast.error(`⚠️ CONFLICTO: El espacio "${esp?.ubicacion}" ya está ocupado el ${nombreDia} de ${conflictoEspacio.hora_inicio} a ${conflictoEspacio.hora_fin}.`, { duration: 6000 });
        return;
      }
    }

    const payload: AsignacionCreate | AsignacionUpdate = {
      id_doc: nuevoDocente,
      id_malla: parseInt(data.id_malla, 10),
      id_esp: nuevoEspacio,
      id_sec: data.id_sec ? parseInt(data.id_sec, 10) : undefined,
      id_dia: nuevoDia,
      id_per: parseInt(data.id_per, 10),
      hora_inicio: nuevoInicio,
      hora_fin: nuevoFin,
      tipo_actividad: "Carga Académica",
      observaciones: "Asignación directa",
    };

    try {
      if (editingAsignacion) {
        await updateAsignacion({ id: editingAsignacion.id_asig, data: payload as AsignacionUpdate });
        toast.success('Asignación actualizada correctamente');
      } else {
        await createAsignacion(payload as AsignacionCreate);
        toast.success('Asignación creada exitosamente');
      }
      closeModal();
    } catch (error: unknown) {
      const detail = isAxiosError<{ detail?: unknown }>(error) ? error.response?.data?.detail : undefined;
      toast.error(typeof detail === 'string' ? detail : 'Error al guardar la asignación (validación del servidor)', { duration: 5000 });
    }
  };

  const handleDelete = (asig: AsignacionCarga) => setDeleteConfirm(asig);
  const confirmDelete = async () => {
    if (deleteConfirm) {
      try {
        await deleteAsignacion(deleteConfirm.id_asig);
        toast.success('Asignación eliminada correctamente');
        setDeleteConfirm(null);
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Error al eliminar', { duration: 5000 });
      }
    }
  };

  // ==========================================
  // ✅ FUNCIONES DE REPORTES ACTUALIZADAS
  // ==========================================
  const handleVistaImpresion = async () => {
    const docente = docentes?.find(d => d.id_doc.toString() === selectedDocenteId);
    if (!docente?.cedula) { toast.error('Selecciona un docente válido'); return; }

    try {
      const res = await api.get('/analytics/Horario_docente', { params: { cedula: docente.cedula } });
      const datos = res.data as any[];

      if (!datos.length) {
        toast.error('Este docente no tiene asignaciones activas registradas');
        return;
      }

      const ordenDias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
      const filas = [...datos]
        .sort((a, b) => (ordenDias.indexOf(a.dia) - ordenDias.indexOf(b.dia)) || a.hora_inicio.localeCompare(b.hora_inicio))
        .map(r => `
          <tr>
            <td><b>${r.dia}</b></td>
            <td>${r.hora_inicio.slice(0,5)} - ${r.hora_fin.slice(0,5)}</td>
            <td>${r.materia} <span class="cod">(${r.cod_materia})</span></td>
            <td>${r.cod_seccion ?? '—'}</td>
            <td>${r.espacio_fisico ?? '—'}<br><span class="cod">${r.nombre_centro ?? ''}</span></td>
            <td>${r.eje_formativo}</td>
            <td>${r.tipo_actividad}</td>
          </tr>`)
        .join('');

      const win = window.open('', '_blank');
      if (!win) { toast.error('El navegador bloqueó la ventana emergente'); return; }
      win.document.write(`
        <html><head><title>Horario - ${docente.nombre} ${docente.apellido}</title>
        <style>
          body{font-family:Arial,sans-serif;margin:30px;color:#1a1a2e}
          h1{font-size:16px;text-align:center;margin:0} h2{font-size:11px;text-align:center;color:#555;margin:4px 0 2px}
          .linea{border-bottom:2px solid #003366;margin:10px 0 20px}
          .info{display:flex;justify-content:space-between;font-size:12px;margin-bottom:15px}
          table{width:100%;border-collapse:collapse;font-size:11px}
          th{background:#003366;color:#fff;padding:8px;text-align:left}
          td{padding:7px 8px;border-bottom:1px solid #ddd;vertical-align:top}
          tr:nth-child(even){background:#f5f7fa}
          .cod{color:#777;font-size:9px}
          .pie{margin-top:25px;font-size:9px;color:#888;text-align:center}
          @media print{button{display:none}}
        </style></head><body>
        <h1>UNIVERSIDAD NACIONAL EXPERIMENTAL DEL MAGISTERIO</h1>
        <h2>"SAMUEL ROBINSON" — Vicerrectorado Académico Territorial</h2>
        <div class="linea"></div>
        <div class="info">
          <span><b>Docente:</b> ${docente.nombre} ${docente.apellido} — C.I. ${docente.cedula}</span>
          <span><b>Período:</b> ${datos[0].periodo_academico}</span>
        </div>
        <table>
          <thead><tr><th>Día</th><th>Hora</th><th>Unidad Curricular</th><th>Sección</th><th>Espacio</th><th>Eje</th><th>Actividad</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <p class="pie">Generado desde el sistema de gestión de horarios — ${new Date().toLocaleString('es-VE')}</p>
        <button onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#003366;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ Imprimir / Guardar PDF</button>
        </body></html>`);
      win.document.close();
    } catch (e) {
      toast.error('No se pudo consultar el horario al servidor');
    }
  };

  const handleGenerateReport = () => {
    if (reportType === 'individual') {
      if (!selectedDocenteId) return toast.error('Selecciona un docente', { duration: 4000 });
      const docente = docentes?.find(d => d.id_doc.toString() === selectedDocenteId);
      if (!docente) return;

      const asigsDocente = asignaciones?.filter(a => a.id_doc?.toString() === selectedDocenteId) || [];
      const primera = asigsDocente[0];
      const periodo = periodos?.find(p => p.id_per === primera?.id_per);
      const municipioDocente = municipios?.find(m => m.id_mun === docente.id_mun)?.nombre || 'SAN CRISTÓBAL';

      const ucSet = new Set<string>();
      asigsDocente.forEach(a => {
        const malla = mallas?.find(m => m.id_malla === a.id_malla);
        if (malla?.materia?.nombre) ucSet.add(`${malla.materia.codigo}: ${malla.materia.nombre}`);
      });

      const franjas = [...new Set(asigsDocente.map(a => `${a.hora_inicio?.slice(0,5)} - ${a.hora_fin?.slice(0,5)}`))].sort();
      const horarioSemanal = franjas.map(franja => {
        const enFranja = asigsDocente.filter(a => `${a.hora_inicio?.slice(0,5)} - ${a.hora_fin?.slice(0,5)}` === franja);
        const porDia: Record<string, string> = {};
        enFranja.forEach(a => {
          const nombreDia = dias?.find(d => d.id_dia === a.id_dia)?.dia || 'N/A';
          const malla = mallas?.find(m => m.id_malla === a.id_malla);
          porDia[nombreDia] = (porDia[nombreDia] ? porDia[nombreDia] + ' | ' : '') + (malla?.materia?.codigo || `Malla ${a.id_malla}`);
        });
        return { horario: franja, viernes: porDia['Viernes'] || '', sabado: porDia['Sábado'] || '',
          observacion: Object.keys(porDia).filter(d => !['Viernes','Sábado'].includes(d)).join(', ') };
      });
      if (!horarioSemanal.length) horarioSemanal.push({ horario: 'Sin asignaciones', viernes: '', sabado: '', observacion: '' });

      const mallaPrimera = mallas?.find(m => m.id_malla === primera?.id_malla);
      const espacioPrimero = espacios?.find(e => e.id_esp === primera?.id_esp);

      generateFichaAcademicaPDF({
        estado: 'TÁCHIRA', municipio: municipioDocente.toUpperCase(),
        aulaTaller: (espacioPrimero?.nombre_centro || 'SEDE PRINCIPAL').toUpperCase(),
        periodoAcademico: periodo?.nombre || '2025-I',
        programaFormacion: mallaPrimera?.programa?.nombre || 'PNF',
        cohorte: '2026', trayecto: `T${mallaPrimera?.trayecto ?? 'I'}`, semestre: `P${mallaPrimera?.periodo ?? 'I'}`,
        unidadCurricular: ucSet.size ? Array.from(ucSet) : ['Sin asignaciones'],
        docenteInvestigador: `${docente.nombre} ${docente.apellido} (${docente.especialidad || 'Docente'})`.toUpperCase(),
        cedulaIdentidad: docente.cedula || 'V-00.000.000',
        correo: (docente as any).email || 'correo@unem.edu.ve',
        telefono: docente.telefono || '0000-0000000',
        fechaEntrega: new Date().toLocaleDateString('es-VE'),
        horarioSemanal,
      }, `Ficha_${docente.nombre}_${docente.apellido}`.replace(/\s+/g, '_'));

      closeReportModal();
      toast.success('Ficha académica generada');
    } else if (reportType === 'general') {
      if (!selectedPnf) return toast.error('Selecciona un PNF', { duration: 4000 });

      const filtradas = (asignaciones || []).filter(a => {
        const malla = mallas?.find(m => m.id_malla === a.id_malla);
        if (!malla) return false;
        return selectedPnf === 'primaria' ? malla.id_pro === 1 : malla.id_pro === 2;
      });

      const datos = filtradas.map(a => {
        const doc = docentes?.find(d => d.id_doc === a.id_doc);
        const malla = mallas?.find(m => m.id_malla === a.id_malla);
        const esp = espacios?.find(e => e.id_esp === a.id_esp);
        return {
          dia: dias?.find(d => d.id_dia === a.id_dia)?.dia || 'N/A',
          hora: `${a.hora_inicio?.slice(0,5)} - ${a.hora_fin?.slice(0,5)}`,
          docente: doc ? `${doc.nombre} ${doc.apellido}` : 'N/A',
          materia: malla?.materia?.nombre || `Malla ${a.id_malla}`,
          espacio: esp ? `${esp.ubicacion} (${esp.nombre_centro})` : 'N/A',
        };
      }).sort((a, b) => a.dia.localeCompare(b.dia) || a.hora.localeCompare(b.hora));

      generateGeneralPNFPDF(datos, selectedPnf === 'especial' ? 'EDUCACIÓN ESPECIAL' : 'EDUCACIÓN PRIMARIA');
      closeReportModal();
      toast.success('Horario general generado');
    }
  };

  // ==========================================
  // LÓGICA DE VISTA HORARIO SEMANAL
  // ==========================================
  const asignacionesFiltradas = useMemo(() => {
    return (asignaciones || []).filter(a => {
      if (filtroDocente && a.id_doc?.toString() !== filtroDocente) return false;
      if (filtroEspacio && a.id_esp?.toString() !== filtroEspacio) return false;
      return true;
    });
  }, [asignaciones, filtroDocente, filtroEspacio]);

  const horarioAgrupado = useMemo(() => {
    const agrupado: Record<number, any[]> = {};
    asignacionesFiltradas.forEach(a => {
      if (!agrupado[a.id_dia]) agrupado[a.id_dia] = [];
      agrupado[a.id_dia].push(a);
    });
    Object.keys(agrupado).forEach(dia => {
      agrupado[Number(dia)].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    });
    return agrupado;
  }, [asignacionesFiltradas]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asignación de Carga Horaria</h1>
          <p className="text-gray-600 mt-1">Gestione las asignaciones, evite solapamientos y genere reportes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeEditar && (
            <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm">
              <Calendar size={16} /> Nueva Asignación
            </button>
          )}
          <button onClick={() => setIsReportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium shadow-sm">
            <FileText size={16} /> Reportes PDF
          </button>
          {/* ✅ BOTÓN EXCEL ENRIQUECIDO */}
          <button 
            onClick={() => exportToExcel(
              (asignaciones || []).map(a => {
                const doc = docentes?.find(d => d.id_doc === a.id_doc);
                const malla = mallas?.find(m => m.id_malla === a.id_malla);
                const esp = espacios?.find(e => e.id_esp === a.id_esp);
                return {
                  'ID': a.id_asig,
                  'Docente': doc ? `${doc.nombre} ${doc.apellido}` : 'N/A',
                  'Materia': malla?.materia?.nombre || 'N/A',
                  'Programa': malla?.programa?.codigo || 'N/A',
                  'Día': dias?.find(d => d.id_dia === a.id_dia)?.dia || 'N/A',
                  'Inicio': a.hora_inicio?.slice(0, 5) || 'N/A',
                  'Fin': a.hora_fin?.slice(0, 5) || 'N/A',
                  'Espacio': esp ? `${esp.ubicacion} - ${esp.nombre_centro}` : 'N/A',
                  'Tipo': a.tipo_actividad || 'Carga Académica',
                };
              }), 
              'Reporte_Carga_Horaria'
            )} 
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium shadow-sm"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
        </div>
      </div>

      {/* Filtros Rápidos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={18} className="text-blue-600" />
            <span className="font-medium">Vista Horario Semanal</span>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filtroDocente}
              onChange={(e) => setFiltroDocente(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48"
            >
              <option value="">Todos los docentes</option>
              {docentes?.map(d => <option key={d.id_doc} value={d.id_doc}>{d.nombre} {d.apellido}</option>)}
            </select>
            <select
              value={filtroEspacio}
              onChange={(e) => setFiltroEspacio(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48"
            >
              <option value="">Todos los espacios</option>
              {espacios?.map(e => <option key={e.id_esp} value={e.id_esp}>{e.ubicacion}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* VISTA HORARIO SEMANAL VISUAL */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Cargando horario...</p>
        </div>
      ) : Object.keys(horarioAgrupado).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No hay asignaciones para los filtros seleccionados</p>
        </div>
      ) : (
        [1, 2, 3, 4, 5, 6].map(diaId => {
          const diaNombre = dias?.find(d => d.id_dia === diaId)?.dia;
          const asignacionesDia = horarioAgrupado[diaId] || [];
          if (asignacionesDia.length === 0) return null;

          return (
            <div key={diaId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex items-center gap-2">
                <Clock className="text-blue-600" size={18} />
                <h3 className="font-bold text-blue-900">{diaNombre}</h3>
                <span className="ml-auto text-xs font-medium bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                  {asignacionesDia.length} clases
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {asignacionesDia.map(asig => {
                  const doc = docentes?.find(d => d.id_doc === asig.id_doc);
                  const malla = mallas?.find(m => m.id_malla === asig.id_malla);
                  const esp = espacios?.find(e => e.id_esp === asig.id_esp);
                  
                  return (
                    <div key={asig.id_asig} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-100 text-blue-800 font-bold px-3 py-2 rounded-lg text-sm min-w-[100px] text-center">
                          {asig.hora_inicio?.slice(0,5)} - {asig.hora_fin?.slice(0,5)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{malla?.materia?.nombre || 'Materia N/A'}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <User size={14} /> {doc?.nombre} {doc?.apellido}
                            <span className="text-gray-300">|</span>
                            <Building size={14} /> {esp?.ubicacion} ({esp?.nombre_centro})
                          </div>
                          {malla?.programa && (
                            <div className="text-xs text-gray-500 mt-1">
                              {malla.programa.codigo} {asig.id_sec ? `• Sección: ${asig.id_sec}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      {puedeEditar && (
                        <div className="flex gap-2">
                          <button onClick={() => openEditModal(asig)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                            <Calendar size={16} />
                          </button>
                          <button onClick={() => handleDelete(asig)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* MODAL DE ASIGNACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingAsignacion ? 'Editar Asignación' : 'Nueva Asignación'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {docenteSeleccionado && (
                <div className={`p-4 rounded-lg border flex items-center gap-4 ${
                  (docenteSeleccionado.horas_asignadas || 0) >= (docenteSeleccionado.horas_max_sem || 20) 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className={`p-2 rounded-full ${
                    (docenteSeleccionado.horas_asignadas || 0) >= (docenteSeleccionado.horas_max_sem || 20) ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {(docenteSeleccionado.horas_asignadas || 0) >= (docenteSeleccionado.horas_max_sem || 20) ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{docenteSeleccionado.nombre} {docenteSeleccionado.apellido}</div>
                    <div className="text-sm text-gray-600">
                      Carga horaria: <span className="font-bold">{docenteSeleccionado.horas_asignadas || 0}</span> / {docenteSeleccionado.horas_max_sem || 20} horas semanales
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          (docenteSeleccionado.horas_asignadas || 0) >= (docenteSeleccionado.horas_max_sem || 20) ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(((docenteSeleccionado.horas_asignadas || 0) / (docenteSeleccionado.horas_max_sem || 20)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

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
                  <label className="block text-sm font-medium text-gray-700">Malla / Materia *</label>
                  <select {...register('id_malla')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona</option>
                    {mallas?.map((m) => (
                      <option key={m.id_malla} value={m.id_malla}>
                        {m.materia?.codigo} - {m.materia?.nombre} ({m.programa?.codigo})
                      </option>
                    ))}
                  </select>
                  {errors.id_malla && <p className="text-sm text-red-600">{errors.id_malla.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Espacio *</label>
                  <select {...register('id_esp')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecciona</option>
                    {ordenarNaturalPor(espacios ?? [], e => e.ubicacion).map((e) => (
                      <option key={e.id_esp} value={e.id_esp}>
                        {e.nombre_centro} - {e.ubicacion}
                      </option>
                    ))}
                  </select>
                  {errors.id_esp && <p className="text-sm text-red-600">{errors.id_esp.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Sección (Opcional)</label>
                  <select {...register('id_sec')} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Sin sección específica</option>
                  </select>
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

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={isCreating || isUpdating} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2">
                  {isCreating || isUpdating ? 'Guardando...' : 'Guardar Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Reportes */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Generar Reporte PDF</h2>
              <button onClick={closeReportModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            {!reportType ? (
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => setReportType('individual')} className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left">
                  <div className="bg-purple-100 p-3 rounded-full text-purple-600"><User size={24} /></div>
                  <div><h3 className="font-bold text-gray-900">Horario Individual por Docente</h3><p className="text-sm text-gray-600">Genera la ficha académica con el horario específico.</p></div>
                </button>
                <button onClick={() => setReportType('general')} className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
                  <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Building size={24} /></div>
                  <div><h3 className="font-bold text-gray-900">Horario General por PNF</h3><p className="text-sm text-gray-600">Consolidado semanal por PNF (Primaria o Especial).</p></div>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button onClick={() => setReportType(null)} className="text-sm text-purple-600 hover:underline flex items-center gap-1 mb-2">Volver a opciones</button>
                
                {/* ✅ REPORTE INDIVIDUAL ACTUALIZADO */}
                {reportType === 'individual' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Seleccionar Docente</label>
                    <select value={selectedDocenteId} onChange={(e) => setSelectedDocenteId(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500">
                      <option value="">-- Seleccione un docente --</option>
                      {docentes?.map((d) => <option key={d.id_doc} value={d.id_doc}>{d.nombre} {d.apellido}</option>)}
                    </select>

                    <button onClick={handleVistaImpresion} disabled={!selectedDocenteId}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium">
                      <FileText size={18} /> Vista de Impresión (datos del servidor)
                    </button>

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-gray-300"></div>
                      <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">o descarga el PDF</span>
                      <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    <button onClick={handleGenerateReport} disabled={!selectedDocenteId}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition">
                      Generar Ficha Académica (PDF)
                    </button>
                  </div>
                )}

                {/* ✅ REPORTE GENERAL ACTUALIZADO */}
                {reportType === 'general' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Seleccionar PNF</label>
                    <select value={selectedPnf} onChange={(e) => setSelectedPnf(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">-- Seleccione un PNF --</option>
                      <option value="primaria">Educación Primaria</option>
                      <option value="especial">Educación Especial</option>
                    </select>
                    <button onClick={handleGenerateReport} disabled={!selectedPnf}
                      className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium flex items-center justify-center gap-2">
                      <FileText size={18} /> Generar Horario General (PDF)
                    </button>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                  <button onClick={closeReportModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-red-600">Confirmar Eliminación</h2>
            <p className="text-gray-700 mb-6">¿Estás seguro de eliminar esta asignación? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};