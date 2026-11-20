import { useState, useMemo } from 'react';
import { useMallas } from '../hooks/useMallas';
import { useProgramas } from '../hooks/useProgramas';
import { Layers, ChevronRight, ChevronDown, BookOpen, Clock, Link as LinkIcon, Search, Filter } from 'lucide-react';
import type { MallaCurricular } from '../types/models';

const aRomano = (n: number): string => {
  const r = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  return r[n - 1] || String(n);
};

export const MallaCurricularPage = () => {
  const { mallas, isLoading } = useMallas();
  const { programas } = useProgramas();

  const [busqueda, setBusqueda] = useState('');
  const [filtroPrograma, setFiltroPrograma] = useState<number | ''>('');
  
  // Estado para controlar qué acordeones están abiertos
  const [openPrograms, setOpenPrograms] = useState<Set<string>>(new Set());
  const [openTrayectos, setOpenTrayectos] = useState<Set<string>>(new Set());

  const toggleProgram = (key: string) => {
    const next = new Set(openPrograms);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpenPrograms(next);
  };

  const toggleTrayecto = (key: string) => {
    const next = new Set(openTrayectos);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpenTrayectos(next);
  };

  // 1. Filtrar datos
  const mallasFiltradas = useMemo(() => {
    return (mallas || []).filter(m => {
      if (filtroPrograma !== '' && m.id_pro !== filtroPrograma) return false;
      if (busqueda) {
        const texto = `${m.materia?.codigo || ''} ${m.materia?.nombre || ''} ${m.materia?.eje_nombre || ''}`.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
  }, [mallas, filtroPrograma, busqueda]);

  // 2. Agrupar en estructura de árbol: Programa -> Trayecto -> Periodo -> [Materias]
  const arbolCurricular = useMemo(() => {
    const arbol: Record<string, Record<string, Record<string, MallaCurricular[]>>> = {};
    
    mallasFiltradas.forEach(m => {
      const progKey = `${m.id_pro}_${m.programa?.nombre || 'Desconocido'}`;
      const trayKey = `T${m.trayecto}`;
      const perKey = `P${m.periodo}`;

      if (!arbol[progKey]) arbol[progKey] = {};
      if (!arbol[progKey][trayKey]) arbol[progKey][trayKey] = {};
      if (!arbol[progKey][trayKey][perKey]) arbol[progKey][trayKey][perKey] = [];
      
      arbol[progKey][trayKey][perKey].push(m);
    });

    // Ordenar periodos dentro de cada trayecto
    Object.values(arbol).forEach(trayectos => {
      Object.values(trayectos).forEach(periodos => {
        Object.keys(periodos).sort().forEach(key => {
          periodos[key].sort((a, b) => (a.orden || 0) - (b.orden || 0));
        });
      });
    });

    return arbol;
  }, [mallasFiltradas]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500 mt-4">Cargando malla curricular...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start gap-4">
        <div className="bg-indigo-100 p-3 rounded-xl">
          <Layers className="text-indigo-600" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Malla Curricular</h1>
          <p className="text-gray-600 mt-1">Pensum académico organizado jerárquicamente</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por código o nombre de materia..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filtroPrograma}
            onChange={(e) => setFiltroPrograma(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los programas</option>
            {programas?.map(p => (
              <option key={p.id_pro} value={p.id_pro}>{p.codigo} - {p.nombre}</option>
            ))}
          </select>
          <div className="flex items-center text-sm text-gray-500 gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <Filter size={16} />
            <span>{mallasFiltradas.length} materias encontradas</span>
          </div>
        </div>
      </div>

      {/* Vista de Árbol (Acordeón) */}
      <div className="space-y-4">
        {Object.keys(arbolCurricular).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No se encontraron materias con los filtros actuales</p>
          </div>
        ) : (
          Object.entries(arbolCurricular).map(([progKey, trayectos]) => {
            const progNombre = progKey.split('_').slice(1).join('_');
            const isOpen = openPrograms.has(progKey);
            const prog = programas?.find((p) => p.id_pro === Number(progKey.split('_')[0]));
            const esSemestral = prog?.tipo_sistema === 'Semestral';

            return (
              <div key={progKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Nivel 1: Programa */}
                <button
                  onClick={() => toggleProgram(progKey)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-indigo-50 hover:bg-indigo-100 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown size={20} className="text-indigo-600" /> : <ChevronRight size={20} className="text-indigo-600" />}
                    <h2 className="text-lg font-bold text-indigo-900">{progNombre}</h2>
                  </div>
                  <span className="text-xs font-semibold bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full">
                    {Object.values(trayectos).reduce((sum, periodos) =>
                      sum + Object.values(periodos).reduce((s, materias) => s + materias.length, 0), 0
                    )} materias
                  </span>
                </button>

                {/* Contenido del Programa */}
                {isOpen && (
                  <div className="divide-y divide-gray-100">
                    {Object.entries(trayectos).map(([trayKey, periodos]) => {
                      const trayOpen = openTrayectos.has(`${progKey}_${trayKey}`);
                      
                      return (
                        <div key={trayKey}>
                          {/* Nivel 2: Trayecto */}
                          <button
                            onClick={() => toggleTrayecto(`${progKey}_${trayKey}`)}
                            className="w-full flex items-center gap-3 px-6 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
                          >
                            {trayOpen ? <ChevronDown size={16} className="text-gray-600" /> : <ChevronRight size={16} className="text-gray-600" />}
                            <span className="font-semibold text-gray-800">Trayecto {aRomano(Number(trayKey.slice(1)))}</span>
                          </button>

                          {/* Contenido del Trayecto */}
                          {trayOpen && (
                            <div className="px-6 py-4 space-y-6 bg-white">
                              {Object.entries(periodos).map(([perKey, materias]) => (
                                <div key={perKey} className="space-y-2">
                                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Clock size={14} /> {esSemestral ? 'Semestre' : 'Trimestre'} {aRomano(Number(perKey.slice(1)))}
                                  </h4>
                                  
                                  {/* Nivel 4: Tabla de Materias */}
                                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                          <th className="px-4 py-2 text-left font-semibold">Código</th>
                                          <th className="px-4 py-2 text-left font-semibold">Unidad Curricular</th>
                                          <th className="px-4 py-2 text-center font-semibold">UC</th>
                                          <th className="px-4 py-2 text-left font-semibold">Eje Formativo</th>
                                          <th className="px-4 py-2 text-left font-semibold">Prerrequisito</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {materias.map((m) => (
                                          <tr key={m.id_malla} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-mono text-indigo-700 font-medium">
                                              {m.materia?.codigo || `MAT-${m.id_mat}`}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900 font-medium">
                                              {m.materia?.nombre || 'Materia no especificada'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold">
                                                {m.materia?.unidades_creditos ?? 0}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3">
                                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                                                {m.materia?.eje_nombre || 'Sin eje'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3">
                                              {m.prerequisito ? (
                                                <div className="flex items-center gap-1.5 text-amber-700">
                                                  <LinkIcon size={14} />
                                                  <span className="font-medium">{m.prerequisito.codigo}</span>
                                                  <span className="text-gray-500 text-xs">({m.prerequisito.nombre})</span>
                                                </div>
                                              ) : (
                                                <span className="text-gray-400 text-xs italic">Ninguno</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};