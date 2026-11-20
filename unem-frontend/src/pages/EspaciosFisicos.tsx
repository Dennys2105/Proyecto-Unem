import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import type { EspacioFisico } from '../types/models';
import { MapPin, Search, Filter, Users, Clock, CheckCircle, XCircle, Info, Plus, X, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

type Municipio = { id_mun: number; nombre: string };

const FORM_INICIAL = {
  nombre_centro: 'Escuela Bustamante',
  ubicacion: '',
  tipo_espacio: 'Aula',
  capacidad: '30',
  equipamiento: '',
  id_mun: '',
  disponibilidad: true,
};

export const EspaciosFisicos = () => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<EspacioFisico | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);

  // Cargar espacios
  const { data: espacios, isLoading, refetch } = useQuery<EspacioFisico[]>({
    queryKey: ['espacios'],
    queryFn: async () => {
      const res = await api.get('/espacios_fisicos/');
      return res.data;
    },
  });

  // Catálogo de municipios para el formulario
  const { data: municipios } = useQuery<Municipio[]>({
    queryKey: ['municipios', 'catalogo'],
    queryFn: async () => {
      const res = await api.get('/Municipio/');
      return res.data;
    },
  });

  const abrirCrear = () => {
    setEditando(null);
    setForm(FORM_INICIAL);
    setModalAbierto(true);
  };

  const abrirEditar = (esp: EspacioFisico) => {
    const mun = municipios?.find((m: Municipio) => m.nombre === esp.municipio);
    setEditando(esp);
    setForm({
      nombre_centro: esp.nombre_centro,
      ubicacion: esp.ubicacion,
      tipo_espacio: esp.tipo_espacio,
      capacidad: String(esp.capacidad ?? 30),
      equipamiento: esp.equipamiento ?? '',
      id_mun: mun ? String(mun.id_mun) : '',
      disponibilidad: esp.disponibilidad,
    });
    setModalAbierto(true);
  };

  const guardar = async () => {
    const cap = Number(form.capacidad);
    if (!form.nombre_centro.trim() || !form.ubicacion.trim()) {
      toast.error('Indica el centro y la ubicación (ej: Aula 16).');
      return;
    }
    if (!Number.isInteger(cap) || cap < 1 || cap > 500) {
      toast.error('La capacidad debe ser un número entero entre 1 y 500.');
      return;
    }
    if (!form.id_mun) {
      toast.error('Selecciona el municipio del espacio.');
      return;
    }
    const payload = {
      nombre_centro: form.nombre_centro.trim(),
      ubicacion: form.ubicacion.trim(),
      tipo_espacio: form.tipo_espacio,
      capacidad: cap,
      equipamiento: form.equipamiento.trim() || null,
      id_mun: Number(form.id_mun),
      disponibilidad: form.disponibilidad,
    };
    setGuardando(true);
    try {
      if (editando) {
        await api.patch(`/espacios_fisicos/${editando.id_esp}`, payload);
        toast.success('Espacio actualizado correctamente', { icon: '✅' });
      } else {
        await api.post('/espacios_fisicos/', payload);
        toast.success(`Espacio "${payload.ubicacion}" creado`, { icon: '🏫' });
      }
      setModalAbierto(false);
      setEditando(null);
      await refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo guardar el espacio', { duration: 5000 });
    } finally {
      setGuardando(false);
    }
  };

  // Filtrar espacios
  const espaciosFiltrados = useMemo(() => {
    if (!espacios) return [];

    return espacios.filter(esp => {
      if (busqueda) {
        const texto = `${esp.nombre_centro} ${esp.ubicacion}`.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      if (filtroTipo && esp.tipo_espacio !== filtroTipo) return false;
      if (filtroEstado !== '' && esp.disponibilidad.toString() !== filtroEstado) return false;
      return true;
    });
  }, [espacios, busqueda, filtroTipo, filtroEstado]);

  // Agrupar por centro educativo
  const espaciosAgrupados = useMemo(() => {
    return espaciosFiltrados.reduce((acc, esp) => {
      if (!acc[esp.nombre_centro]) acc[esp.nombre_centro] = [];
      acc[esp.nombre_centro].push(esp);
      return acc;
    }, {} as Record<string, EspacioFisico[]>);
  }, [espaciosFiltrados]);

  const TIPO_CONFIG: Record<string, { color: string; icon: string }> = {
    'Aula': { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '📚' },
    'Laboratorio': { color: 'bg-purple-100 text-purple-700 border-purple-300', icon: '🔬' },
    'Auditorio': { color: 'bg-amber-100 text-amber-700 border-amber-300', icon: '🎤' },
    'Cancha': { color: 'bg-green-100 text-green-700 border-green-300', icon: '⚽' },
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="bg-indigo-100 p-3 rounded-xl">
            <MapPin className="text-indigo-600" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Espacios Físicos</h1>
            <p className="text-gray-600 mt-1">
              Gestión de aulas, laboratorios y espacios de la universidad
            </p>
          </div>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium shadow-sm"
        >
          <Plus size={16} /> Nuevo Espacio
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre o ubicación..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los tipos</option>
            <option value="Aula">Aula</option>
            <option value="Laboratorio">Laboratorio</option>
            <option value="Auditorio">Auditorio</option>
            <option value="Cancha">Cancha</option>
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Disponibilidad</option>
            <option value="true">Disponibles</option>
            <option value="false">No disponibles</option>
          </select>
          <div className="flex items-center text-sm text-gray-500 gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <Filter size={16} />
            <span>{espaciosFiltrados.length} espacios</span>
          </div>
        </div>
      </div>

      {/* Contenido agrupado por centro */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Cargando espacios...</p>
        </div>
      ) : Object.keys(espaciosAgrupados).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MapPin className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No se encontraron espacios con los filtros actuales</p>
        </div>
      ) : (
        Object.entries(espaciosAgrupados).map(([centro, espaciosCentro]) => (
          <div key={centro} className="space-y-4">
            {/* Título del centro */}
            <div className="bg-indigo-600 text-white rounded-lg px-5 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <MapPin size={20} />
                {centro}
              </h2>
              <span className="text-sm bg-indigo-500 px-3 py-1 rounded-full">
                {espaciosCentro.length} espacios
              </span>
            </div>

            {/* Grid de tarjetas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {espaciosCentro
                .sort((a: EspacioFisico, b: EspacioFisico) =>
                  a.ubicacion.localeCompare(b.ubicacion, 'es', { numeric: true, sensitivity: 'base' })
                )
                .map((esp: EspacioFisico) => {
                  const tipoConfig = TIPO_CONFIG[esp.tipo_espacio] || TIPO_CONFIG['Aula'];
                  const ocupacionPorcentaje = esp.horas_ocupadas > 0
                    ? Math.min((esp.horas_ocupadas / 40) * 100, 100)
                    : 0;

                  return (
                    <div
                      key={esp.id_esp}
                      className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition hover:shadow-md ${
                        esp.disponibilidad ? 'border-green-200' : 'border-red-200'
                      }`}
                    >
                      {/* Header de la tarjeta */}
                      <div className={`px-4 py-3 flex items-center justify-between ${
                        esp.disponibilidad ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{tipoConfig.icon}</span>
                          <h3 className="font-bold text-gray-900">{esp.ubicacion}</h3>
                        </div>
                        {esp.disponibilidad ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded-full">
                            <CheckCircle size={12} /> Disponible
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-200 px-2 py-1 rounded-full">
                            <XCircle size={12} /> Ocupado
                          </span>
                        )}
                      </div>

                      {/* Contenido */}
                      <div className="p-4 space-y-3">
                        {/* Tipo y capacidad */}
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${tipoConfig.color}`}>
                            {esp.tipo_espacio}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <Users size={14} />
                            <span className="font-semibold">{esp.capacidad}</span> personas
                          </span>
                        </div>

                        {/* Municipio */}
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin size={12} />
                          {esp.municipio}
                        </div>

                        {/* Equipamiento (tooltip) */}
                        {esp.equipamiento && (
                          <div className="relative group">
                            <div className="flex items-center gap-1 text-xs text-indigo-600 cursor-help">
                              <Info size={12} />
                              <span className="underline">Ver equipamiento</span>
                            </div>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 w-64">
                              <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 shadow-lg">
                                {esp.equipamiento}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Métricas de uso */}
                        <div className="pt-2 border-t border-gray-100 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 flex items-center gap-1">
                              <Clock size={12} />
                              Horas ocupadas (semana)
                            </span>
                            <span className="font-bold text-gray-900">
                              {esp.horas_ocupadas.toFixed(1)}h / 40h
                            </span>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                ocupacionPorcentaje > 80 ? 'bg-red-500' :
                                ocupacionPorcentaje > 50 ? 'bg-amber-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${ocupacionPorcentaje}%` }}
                            ></div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{esp.total_asignaciones} asignaciones activas</span>
                            <span>{ocupacionPorcentaje.toFixed(0)}% ocupado</span>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="pt-2 border-t border-gray-100">
                          <button
                            onClick={() => abrirEditar(esp)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                          >
                            <Edit size={14} /> Editar espacio
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))
      )}

      {/* MODAL CREAR / EDITAR */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editando ? 'Editar Espacio' : 'Nuevo Espacio'}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>
                  Puedes registrar aulas, laboratorios, auditorios o canchas de cualquier centro.
                  La ubicación debe ser única dentro del centro (ej: <strong>Aula 16</strong>).
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Centro educativo *</label>
                <input
                  type="text"
                  value={form.nombre_centro}
                  onChange={(e) => setForm({ ...form, nombre_centro: e.target.value })}
                  placeholder="Ej: Escuela Bustamante"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Ubicación *</label>
                  <input
                    type="text"
                    value={form.ubicacion}
                    onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                    placeholder="Ej: Aula 16"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Tipo *</label>
                  <select
                    value={form.tipo_espacio}
                    onChange={(e) => setForm({ ...form, tipo_espacio: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Aula">Aula</option>
                    <option value="Laboratorio">Laboratorio</option>
                    <option value="Auditorio">Auditorio</option>
                    <option value="Cancha">Cancha</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Capacidad *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.capacidad}
                    onChange={(e) => setForm({ ...form, capacidad: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                    placeholder="Ej: 30"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Municipio *</label>
                  <select
                    value={form.id_mun}
                    onChange={(e) => setForm({ ...form, id_mun: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Selecciona</option>
                    {municipios?.map((m: Municipio) => (
                      <option key={m.id_mun} value={m.id_mun}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Equipamiento</label>
                <textarea
                  rows={2}
                  value={form.equipamiento}
                  onChange={(e) => setForm({ ...form, equipamiento: e.target.value })}
                  placeholder="Ej: 30 pupitres, pizarra acrílica, ventilador"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.disponibilidad}
                  onChange={(e) => setForm({ ...form, disponibilidad: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Disponible para asignaciones
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={guardando}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium"
                >
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear espacio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};