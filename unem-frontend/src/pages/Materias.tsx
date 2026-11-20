import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import { useMallas } from '../hooks/useMallas';
import { useProgramas } from '../hooks/useProgramas';
import type { Materia, EjeFormativo } from '../types/models';
import { BookOpen, Search, Layers } from 'lucide-react';

export const Materias = () => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEje, setFiltroEje] = useState<number | ''>('');
  const [filtroPnf, setFiltroPnf] = useState<number | ''>('');

  const { mallas } = useMallas();
  const { programas } = useProgramas();

  // 1. Cargar ejes formativos para el dropdown
  const { data: ejes } = useQuery<EjeFormativo[]>({
    queryKey: ['ejes'],
    queryFn: async () => {
      const res = await api.get('/EjesFormativos/');
      return res.data;
    },
  });

  // 2. Cargar materias PASANDO los filtros directamente al backend
  const { data: materias, isLoading } = useQuery<Materia[]>({
    queryKey: ['materias', busqueda, filtroEje],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (busqueda) params.busqueda = busqueda;
      if (filtroEje) params.id_eje = filtroEje;

      const res = await api.get('/materias', { params });
      return res.data;
    },
  });

  // 3. Filtro por PNF (en cliente): una materia es de un PNF si está en su malla
  const materiasVisibles = useMemo(() => {
    const lista = materias ?? [];
    if (filtroPnf === '') return lista;
    const ids = new Set((mallas ?? []).filter((m) => m.id_pro === filtroPnf).map((m) => m.id_mat));
    return lista.filter((m) => ids.has(m.id_mat));
  }, [materias, mallas, filtroPnf]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start gap-4">
        <div className="bg-indigo-100 p-3 rounded-xl">
          <BookOpen className="text-indigo-600" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Catálogo de Materias</h1>
          <p className="text-gray-600 mt-1">
            Registro maestro de unidades curriculares y su asignación en los programas
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filtroPnf}
            onChange={(e) => setFiltroPnf(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los PNF</option>
            {programas?.map((p) => (
              <option key={p.id_pro} value={p.id_pro}>{p.codigo}</option>
            ))}
          </select>
          <select
            value={filtroEje}
            onChange={(e) => setFiltroEje(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los ejes formativos</option>
            {ejes?.map((e) => (
              <option key={e.id_eje} value={e.id_eje}>{e.codigo} - {e.nombre}</option>
            ))}
          </select>
          <div className="flex items-center text-sm text-gray-500 gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <Layers size={16} />
            <span>{materiasVisibles.length} materias encontradas</span>
          </div>
        </div>
      </div>

      {/* Tabla de Materias */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando catálogo...</p>
          </div>
        ) : materiasVisibles.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No se encontraron materias con los filtros actuales</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Unidad Curricular</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">UC</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Eje Formativo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Se imparte en</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materiasVisibles.map((m) => (
                  <tr key={m.id_mat} className="hover:bg-gray-50 transition group">
                    <td className="px-6 py-4 text-sm font-mono text-indigo-700 font-medium">
                      {m.codigo}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{m.nombre}</div>
                      {m.descripcion && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1" title={m.descripcion}>
                          {m.descripcion}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                        {m.unidades_creditos}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {m.eje_nombre ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                          {m.eje_nombre}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {m.programas_count > 0 ? (
                        <div className="flex items-center gap-2 group/tooltip relative">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            {m.programas_count}
                          </span>
                          <span className="text-sm text-gray-600 truncate max-w-[200px]">
                            {m.programas_nombres}
                          </span>
                          {/* Tooltip al pasar el mouse */}
                          <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block z-10">
                            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                              {m.programas_nombres}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 italic">
                          Aún no asignada a ningún PNF
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};