import { useState, useMemo } from 'react';
import { useMallas } from '../hooks/useMallas';
import { useProgramas } from '../hooks/useProgramas';
import { Layers, ChevronRight, ChevronDown, BookOpen, Clock, Link as LinkIcon, Search, Filter } from 'lucide-react';
import type { MallaCurricular } from '../types/models';
import { PageHero } from '../components/PageHero';

const aRomano = (n: number): string => {
  const r = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return r[n - 1] || String(n);
};

export const MallaCurricularPage = () => {
  const { mallas, isLoading } = useMallas();
  const { programas } = useProgramas();

  const [busqueda, setBusqueda] = useState('');
  const [filtroPrograma, setFiltroPrograma] = useState<number | ''>('');
  const [openPrograms, setOpenPrograms] = useState<Set<string>>(new Set());
  const [openTrayectos, setOpenTrayectos] = useState<Set<string>>(new Set());

  const toggleProgram = (key: string) => {
    const next = new Set(openPrograms);
    if (next.has(key)) next.delete(key); else next.add(key);
    setOpenPrograms(next);
  };

  const toggleTrayecto = (key: string) => {
    const next = new Set(openTrayectos);
    if (next.has(key)) next.delete(key); else next.add(key);
    setOpenTrayectos(next);
  };

  const mallasFiltradas = useMemo(() => {
    return (mallas || []).filter((m) => {
      if (filtroPrograma !== '' && m.id_pro !== filtroPrograma) return false;
      if (busqueda) {
        const texto = `${m.materia?.codigo || ''} ${m.materia?.nombre || ''} ${m.materia?.eje_nombre || ''}`.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
  }, [mallas, filtroPrograma, busqueda]);

  const arbolCurricular = useMemo(() => {
    const arbol: Record<string, Record<string, Record<string, MallaCurricular[]>>> = {};
    mallasFiltradas.forEach((m) => {
      const progKey = `${m.id_pro}_${m.programa?.nombre || 'Desconocido'}`;
      const trayKey = `T${m.trayecto}`;
      const perKey = `P${m.periodo}`;
      if (!arbol[progKey]) arbol[progKey] = {};
      if (!arbol[progKey][trayKey]) arbol[progKey][trayKey] = {};
      if (!arbol[progKey][trayKey][perKey]) arbol[progKey][trayKey][perKey] = [];
      arbol[progKey][trayKey][perKey].push(m);
    });
    Object.values(arbol).forEach((trayectos) => {
      Object.values(trayectos).forEach((periodos) => {
        Object.keys(periodos).sort().forEach((key) => {
          periodos[key].sort((a, b) => (a.orden || 0) - (b.orden || 0));
        });
      });
    });
    return arbol;
  }, [mallasFiltradas]);

  if (isLoading) {
    return (
      <div className="unem-page">
        <section className="unem-card unem-card-pad">
          {[0, 1, 2].map((i: number) => (
            <div key={i} className="unem-skel" style={{ height: 56, marginBottom: 12 }} />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="unem-page">
      <PageHero
        icon={Layers}
        titulo="Malla Curricular"
        descripcion="Pensum académico organizado por programa, trayecto y período. La numeración del período es relativa al trayecto (Trimestre I–III / Semestre I–II)."
      />

      <section className="unem-card unem-card-pad">
        <div className="unem-toolbar">
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-3)' }} />
            <input
              type="text"
              className="unem-input"
              style={{ paddingLeft: 34 }}
              placeholder="Buscar por código o nombre de materia…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <select
            className="unem-select"
            value={filtroPrograma}
            onChange={(e) => setFiltroPrograma(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todos los programas</option>
            {programas?.map((p) => <option key={p.id_pro} value={p.id_pro}>{p.codigo} — {p.nombre}</option>)}
          </select>
          <span className="unem-chip unem-chip-mut"><Filter size={13} /> {mallasFiltradas.length} materia(s)</span>
        </div>
      </section>

      {Object.keys(arbolCurricular).length === 0 ? (
        <div className="unem-empty">
          <span className="unem-empty-i"><BookOpen size={34} /></span>
          <p>No se encontraron materias con los filtros actuales.</p>
        </div>
      ) : (
        Object.entries(arbolCurricular).map(([progKey, trayectos]) => {
          const progNombre = progKey.split('_').slice(1).join('_');
          const isOpen = openPrograms.has(progKey);
          const prog = programas?.find((p) => p.id_pro === Number(progKey.split('_')[0]));
          const esSemestral = prog?.tipo_sistema === 'Semestral';
          const totalMaterias = Object.values(trayectos).reduce(
            (sum, periodos) => sum + Object.values(periodos).reduce((s, ms) => s + ms.length, 0), 0
          );

          return (
            <section key={progKey} className="unem-card" style={{ overflow: 'hidden' }}>
              {/* Nivel 1: Programa */}
              <button
                onClick={() => toggleProgram(progKey)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '14px 18px', border: 0, cursor: 'pointer', textAlign: 'left',
                  background: 'linear-gradient(90deg, rgba(46,49,146,.10), rgba(0,184,212,.05))',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {isOpen
                    ? <ChevronDown size={18} style={{ color: 'var(--indigo)', flex: '0 0 auto' }} />
                    : <ChevronRight size={18} style={{ color: 'var(--indigo)', flex: '0 0 auto' }} />}
                  <b style={{ fontSize: 15, color: 'var(--indigo)' }}>{progNombre}</b>
                </span>
                <span className="unem-chip unem-chip-upd">{totalMaterias} materia(s)</span>
              </button>

              {isOpen && (
                <div>
                  {Object.entries(trayectos).map(([trayKey, periodos]) => {
                    const trayOpen = openTrayectos.has(`${progKey}_${trayKey}`);
                    return (
                      <div key={trayKey}>
                        {/* Nivel 2: Trayecto */}
                        <button
                          onClick={() => toggleTrayecto(`${progKey}_${trayKey}`)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 18px', border: 0, borderTop: '1px solid var(--line-2)',
                            cursor: 'pointer', textAlign: 'left', background: 'var(--paper)',
                          }}
                        >
                          {trayOpen
                            ? <ChevronDown size={15} style={{ color: 'var(--tx-2)' }} />
                            : <ChevronRight size={15} style={{ color: 'var(--tx-2)' }} />}
                          <b style={{ fontSize: 13, color: 'var(--tx-1)' }}>
                            Trayecto {aRomano(Number(trayKey.slice(1)))}
                          </b>
                        </button>

                        {trayOpen && (
                          <div style={{ padding: '14px 18px', display: 'grid', gap: 18, borderTop: '1px solid var(--line-2)' }}>
                            {Object.entries(periodos).map(([perKey, materias]) => (
                              <div key={perKey}>
                                {/* Nivel 3: Período */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                  <Clock size={14} style={{ color: 'var(--violet)' }} />
                                  <b style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--tx-3)' }}>
                                    {esSemestral ? 'Semestre' : 'Trimestre'} {aRomano(Number(perKey.slice(1)))}
                                  </b>
                                </div>

                                {/* Nivel 4: Materias */}
                                <div className="unem-table-wrap unem-scroll">
                                  <table className="unem-table">
                                    <thead>
                                      <tr>
                                        <th>Código</th>
                                        <th>Unidad Curricular</th>
                                        <th>UC</th>
                                        <th>Eje Formativo</th>
                                        <th>Prerrequisito</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {materias.map((m: MallaCurricular) => (
                                        <tr key={m.id_malla}>
                                          <td className="unem-mono unem-strong">{m.materia?.codigo || `MAT-${m.id_mat}`}</td>
                                          <td>{m.materia?.nombre || 'Materia no especificada'}</td>
                                          <td><span className="unem-chip unem-chip-upd">{m.materia?.unidades_creditos ?? 0} UC</span></td>
                                          <td><span className="unem-chip unem-chip-res">{m.materia?.eje_nombre || 'Sin eje'}</span></td>
                                          <td>
                                            {m.prerequisito ? (
                                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--warn)' }}>
                                                <LinkIcon size={13} />
                                                <span className="unem-mono unem-strong">{m.prerequisito.codigo}</span>
                                                <span className="unem-ell" style={{ maxWidth: 240, color: 'var(--tx-3)' }}>
                                                  {m.prerequisito.nombre}
                                                </span>
                                              </span>
                                            ) : (
                                              <span className="unem-chip unem-chip-mut">Ninguno</span>
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
            </section>
          );
        })
      )}
    </div>
  );
};