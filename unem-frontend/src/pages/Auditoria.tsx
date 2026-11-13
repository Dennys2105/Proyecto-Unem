import { useState, useMemo } from 'react';
import { useAuditoria } from '../hooks/useAuditoria';
import { normalizarAuditoria } from '../types/models';
import {
  Shield, Search, ChevronDown, ChevronUp, Plus, Edit, Trash2,
  AlertTriangle, Clock, User, Globe, Database, FileJson, X, Info
} from 'lucide-react';

const ACCION_CONFIG: Record<string, { color: string; icon: any; label: string; descripcion: string }> = {
  INSERT: {
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: Plus,
    label: 'Creación',
    descripcion: 'Se creó un nuevo registro en el sistema'
  },
  UPDATE: {
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: Edit,
    label: 'Actualización',
    descripcion: 'Se modificaron datos de un registro existente'
  },
  DELETE: {
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: Trash2,
    label: 'Eliminación',
    descripcion: 'Se eliminó (lógicamente) un registro del sistema'
  },
};

// Detecta si un UPDATE es en realidad una eliminación lógica
// (cambio de estatus de 'A' a 'I' sin otros campos modificados)
const esEliminacionLogica = (resumen: string): boolean => {
  if (!resumen) return false;
  const resumenLower = resumen.toLowerCase();
  // Si el único campo modificado es "estatus"
  return resumenLower === 'estatus' || resumenLower.includes('solo estatus');
};

const TABLA_NOMBRES: Record<string, string> = {
  'docentes': 'Docentes',
  'estudiantes': 'Estudiantes',
  'municipios': 'Municipios',
  'programas': 'Programas Académicos',
  'ejes_formativos': 'Ejes Formativos',
  'periodos_academicos': 'Periodos Académicos',
  'espacios_fis': 'Espacios Físicos',
  'materias': 'Materias',
  'secciones': 'Secciones',
  'dias_laborales': 'Días Laborales',
  'roles': 'Roles',
  'usuarios': 'Usuarios',
  'credenciales': 'Credenciales',
  'malla_curricular': 'Malla Curricular',
  'asig_carga_horarias': 'Asignación de Carga Horaria',
  'notas': 'Notas',
  'bloques_horarios': 'Bloques Horarios',
};

const formatNombreTabla = (tabla: string): string => {
  return TABLA_NOMBRES[tabla.toLowerCase()] || tabla;
};

export const AuditoriaPage = () => {
  const { auditoria, isLoading, error } = useAuditoria();
  const [filtroTabla, setFiltroTabla] = useState<string>('');
  const [filtroAccion, setFiltroAccion] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [filaExpandida, setFilaExpandida] = useState<number | null>(null);

  const datosNormalizados = useMemo(() => {
    if (!auditoria) return [];
    return auditoria.map(normalizarAuditoria);
  }, [auditoria]);

  const tablasDisponibles = useMemo(() => {
    const set = new Set(datosNormalizados.map(d => d.tabla).filter(Boolean));
    return Array.from(set).sort();
  }, [datosNormalizados]);

  const datosFiltrados = useMemo(() => {
    return datosNormalizados.filter(d => {
      // Detectar si es una eliminación lógica (UPDATE que cambia estatus)
      const esEliminacionLogica = 
        d.accion === 'UPDATE' && 
        (d.resumen.toLowerCase().includes('estatus') || 
        d.resumen.toLowerCase().includes('eliminado') ||
        d.resumen.toLowerCase().includes('inactivo'));
      
      // Si el filtro es DELETE, incluir tanto eliminaciones físicas como lógicas
      if (filtroAccion === 'DELETE') {
        return d.accion === 'DELETE' || esEliminacionLogica;
      }
      
      // Para otros filtros, comportamiento normal
      if (filtroTabla && d.tabla !== filtroTabla) return false;
      if (filtroAccion && d.accion !== filtroAccion) return false;
      if (busqueda) {
        const texto = `${d.usuario} ${d.tabla} ${d.identificador} ${d.ip} ${d.resumen}`.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
  }, [datosNormalizados, filtroTabla, filtroAccion, busqueda]);

  const stats = useMemo(() => {
    const esEliminacionLogica = (d: any) => 
      d.accion === 'UPDATE' && 
      (d.resumen.toLowerCase().includes('estatus') || 
      d.resumen.toLowerCase().includes('eliminado') ||
      d.resumen.toLowerCase().includes('inactivo'));
    
    return {
      total: datosNormalizados.length,
      insert: datosNormalizados.filter(d => d.accion === 'INSERT').length,
      update: datosNormalizados.filter(d => d.accion === 'UPDATE' && !esEliminacionLogica(d)).length,
      delete: datosNormalizados.filter(d => d.accion === 'DELETE' || esEliminacionLogica(d)).length,
    };
  }, [datosNormalizados]);

  const formatearFecha = (fecha: string) => {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleString('es-VE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch {
      return fecha;
    }
  };

  const renderDetalle = (d: ReturnType<typeof normalizarAuditoria>) => {
    const esElimLogica = esEliminacionLogica(d.resumen);
    const accionReal = esElimLogica ? 'DELETE' : d.accion;
    const config = ACCION_CONFIG[accionReal] || {
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: Clock,
      label: d.accion,
      descripcion: 'Operación registrada'
    };
    const nombreTabla = formatNombreTabla(d.tabla);

    const getMensajeAccion = () => {
      if (esElimLogica) {
        return `Se eliminó (lógicamente) el registro "${d.identificador}" de "${nombreTabla}". El estatus cambió de Activo a Inactivo.`;
      }
      switch (d.accion) {
        case 'INSERT': return `Se registró un nuevo elemento en "${nombreTabla}".`;
        case 'UPDATE': return `Se actualizaron los datos de un registro en "${nombreTabla}".`;
        case 'DELETE': return `Se eliminó (lógicamente) un registro de "${nombreTabla}".`;
        default: return `Operación "${d.accion}" ejecutada sobre "${nombreTabla}".`;
      }
    };

    const resumenEsUtil = d.resumen &&
      d.resumen !== 'N/A' &&
      !d.resumen.includes('Ver columnas modificadas') &&
      d.resumen.trim().length > 0 &&
      !esElimLogica;

    return (
      <div className="mt-3 bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-md ${esElimLogica ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {esElimLogica ? <Trash2 size={16} /> : <FileJson size={16} />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Detalle de la Operación</h4>
              <p className="text-xs text-gray-500">{config.descripcion}</p>
            </div>
          </div>
          <span className="text-xs font-mono text-gray-400">#{d.id}</span>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex gap-3 items-start">
            <span className="font-semibold text-gray-700 min-w-[120px] flex items-center gap-1.5">
              <Info size={12} className="text-indigo-500" />
              Acción:
            </span>
            <span className={`font-medium ${esElimLogica ? 'text-red-600' : 'text-gray-900'}`}>
              {getMensajeAccion()}
            </span>
          </div>

          <div className="flex gap-3 items-start">
            <span className="font-semibold text-gray-700 min-w-[120px] flex items-center gap-1.5">
              <Database size={12} className="text-indigo-500" />
              Módulo afectado:
            </span>
            <span className="text-gray-900 font-medium">{nombreTabla}</span>
          </div>

          <div className="flex gap-3 items-start">
            <span className="font-semibold text-gray-700 min-w-[120px] flex items-center gap-1.5">
              <FileJson size={12} className="text-indigo-500" />
              Registro:
            </span>
            <span className="text-gray-900 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {d.identificador}
            </span>
          </div>

          <div className="flex gap-3 items-start">
            <span className="font-semibold text-gray-700 min-w-[120px] flex items-center gap-1.5">
              <User size={12} className="text-indigo-500" />
              Realizado por:
            </span>
            <span className="text-gray-900">{d.usuario}</span>
          </div>

          <div className="flex gap-3 items-start">
            <span className="font-semibold text-gray-700 min-w-[120px] flex items-center gap-1.5">
              <Clock size={12} className="text-indigo-500" />
              Fecha y hora:
            </span>
            <span className="text-gray-900">{formatearFecha(d.fecha)}</span>
          </div>

          {d.ip && d.ip !== 'N/A' && (
            <div className="flex gap-3 items-start">
              <span className="font-semibold text-gray-700 min-w-[120px] flex items-center gap-1.5">
                <Globe size={12} className="text-indigo-500" />
                Dirección IP:
              </span>
              <span className="text-gray-900 font-mono text-xs">{d.ip}</span>
            </div>
          )}

          {resumenEsUtil && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Edit size={14} className="text-indigo-600" />
                <span className="text-xs font-bold text-indigo-700 uppercase">
                  Detalle del cambio
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-indigo-50 p-3 rounded border border-indigo-100">
                {d.resumen}
              </p>
            </div>
          )}

          {d.accion === 'UPDATE' && !resumenEsUtil && !esElimLogica && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Detalle de columnas no disponible</p>
                  <p className="text-amber-800">
                    El sistema registró que se modificó un registro, pero los campos específicos
                    modificados no están disponibles en el reporte actual. Para ver el detalle
                    completo de las columnas alteradas (antes/después), se requiere una actualización
                    del backend.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-800">Error al cargar auditoría</h2>
        <p className="text-gray-600 mt-2">El endpoint no está disponible. Verifica con el backend.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="bg-indigo-100 p-3 rounded-xl">
          <Shield className="text-indigo-600" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bitácora de Auditoría</h1>
          <p className="text-gray-600 mt-1">
            Registro histórico de todas las operaciones realizadas en el sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Movimientos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Creaciones</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.insert}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Actualizaciones</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.update}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Eliminaciones (lógicas)</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.delete}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar usuario, tabla, IP..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filtroTabla}
            onChange={(e) => setFiltroTabla(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las tablas</option>
            {tablasDisponibles.map(t => <option key={t} value={t}>{formatNombreTabla(t)}</option>)}
          </select>
          <select
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las acciones</option>
            <option value="INSERT">INSERT (Creación)</option>
            <option value="UPDATE">UPDATE (Actualización)</option>
            <option value="DELETE">DELETE (Eliminación)</option>
          </select>
          <button
            onClick={() => { setBusqueda(''); setFiltroTabla(''); setFiltroAccion(''); }}
            className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <X size={14} /> Limpiar filtros
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando bitácora...</p>
          </div>
        ) : datosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Database className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No hay movimientos que coincidan con los filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Módulo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Acción</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Identificador</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">IP</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {datosFiltrados.map((d) => {
                  const esElimLogica = esEliminacionLogica(d.resumen);
                  const accionReal = esElimLogica ? 'DELETE' : d.accion;
                  const config = ACCION_CONFIG[accionReal] || {
                    color: 'bg-gray-100 text-gray-700 border-gray-300',
                    icon: Clock,
                    label: d.accion,
                    descripcion: 'Operación registrada'
                  };
                  const Icono = config.icon;
                  const expandida = filaExpandida === d.id;
                  return (
                    <div key={d.id} className="contents">
                      <tr className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">#{d.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {formatearFecha(d.fecha)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-gray-400" />
                            {d.usuario}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                          {formatNombreTabla(d.tabla)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold border ${config.color}`}>
                            <Icono size={12} />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate font-mono" title={d.identificador}>
                          {d.identificador}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Globe size={12} className="text-gray-400" />
                            {d.ip}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setFilaExpandida(expandida ? null : d.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {expandida ? 'Ocultar' : 'Ver detalle'}
                            {expandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                      {expandida && (
                        <tr className="bg-gray-50">
                          <td colSpan={8} className="px-6 py-4">
                            {renderDetalle(d)}
                          </td>
                        </tr>
                      )}
                    </div>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        Mostrando {datosFiltrados.length} de {datosNormalizados.length} movimientos registrados
      </p>
    </div>
  );
};