import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import { useMallas } from '../hooks/useMallas';
import { useProgramas } from '../hooks/useProgramas';
import type { Materia, EjeFormativo } from '../types/models';
import { BookOpen, Search, Layers } from 'lucide-react';
import { PageHero } from '../components/PageHero';

export const Materias = () => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEje, setFiltroEje] = useState<number | ''>('');
  const [filtroPnf, setFiltroPnf] = useState<number | ''>('');

  const { mallas } = useMallas();
  const { programas } = useProgramas();

  const { data: ejes } = useQuery<EjeFormativo[]>({
    queryKey: ['ejes'],
    queryFn: async () => (await api.get('/EjesFormativos/')).data,
  });

  const { data: materias, isLoading } = useQuery<Materia[]>({
    queryKey: ['materias', busqueda, filtroEje],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (busqueda) params.busqueda = busqueda;
      if (filtroEje) params.id_eje = filtroEje;
      return (await api.get('/materias', { params })).data;
    },
  });

  // Filtro por PNF en cliente: una materia pertenece a un PNF si está en su malla
  const materiasVisibles = useMemo(() => {
    const lista = materias ?? [];
    if (filtroPnf === '') return lista;
    const ids = new Set((mallas ?? []).filter((m) => m.id_pro === filtroPnf).map((m) => m.id_mat));
    return lista.filter((m) => ids.has(m.id_mat));
  }, [materias, mallas, filtroPnf]);

  return (
    <div className="unem-page">
      <PageHero
        icon={BookOpen}
        titulo="Catálogo de Materias"
        descripcion="Registro maestro de unidades curriculares y su asignación en los programas. Filtra por PNF o por eje formativo."
      />

      <section className="unem-card unem-card-pad">
        <div className="unem-toolbar">
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-3)' }} />
            <input
              type="text"
              className="unem-input"
              style={{ paddingLeft: 34 }}
              placeholder="Buscar por código o nombre…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <select
            className="unem-select"
            value={filtroPnf}
            onChange={(e) => setFiltroPnf(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todos los PNF</option>
            {programas?.map((p) => <option key={p.id_pro} value={p.id_pro}>{p.codigo}</option>)}
          </select>
          <select
            className="unem-select"
            value={filtroEje}
            onChange={(e) => setFiltroEje(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todos los ejes formativos</option>
            {ejes?.map((e) => <option key={e.id_eje} value={e.id_eje}>{e.codigo} — {e.nombre}</option>)}
          </select>
          <span className="unem-chip unem-chip-mut"><Layers size={13} /> {materiasVisibles.length} materia(s)</span>
        </div>
      </section>

      {isLoading ? (
        <section className="unem-card unem-card-pad">
          {[0, 1, 2, 3, 4].map((i: number) => (
            <div key={i} className="unem-skel" style={{ height: 42, marginBottom: 10 }} />
          ))}
        </section>
      ) : materiasVisibles.length === 0 ? (
        <div className="unem-empty">
          <span className="unem-empty-i"><BookOpen size={34} /></span>
          <p>No se encontraron materias con los filtros actuales.</p>
        </div>
      ) : (
        <div className="unem-table-wrap unem-scroll">
          <table className="unem-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Unidad Curricular</th>
                <th>UC</th>
                <th>Eje Formativo</th>
                <th>Se imparte en</th>
              </tr>
            </thead>
            <tbody>
              {materiasVisibles.map((m: Materia) => (
                <tr key={m.id_mat}>
                  <td className="unem-mono unem-strong">{m.codigo}</td>
                  <td>
                    <div className="unem-strong">{m.nombre}</div>
                    {m.descripcion && (
                      <div className="unem-ell" style={{ maxWidth: 430, fontSize: 11.5, color: 'var(--tx-3)' }} title={m.descripcion}>
                        {m.descripcion}
                      </div>
                    )}
                  </td>
                  <td><span className="unem-chip unem-chip-upd">{m.unidades_creditos} UC</span></td>
                  <td>
                    {m.eje_nombre
                      ? <span className="unem-chip unem-chip-res">{m.eje_nombre}</span>
                      : <span className="unem-chip unem-chip-mut">Sin asignar</span>}
                  </td>
                  <td>
                    {m.programas_count > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span className="unem-chip unem-chip-ins">{m.programas_count}</span>
                        <span className="unem-ell" style={{ maxWidth: 220 }} title={m.programas_nombres ?? ''}>
                          {m.programas_nombres}
                        </span>
                      </span>
                    ) : (
                      <span className="unem-chip unem-chip-mut">Aún no asignada</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--tx-3)', textAlign: 'center' }}>
        Mostrando {materiasVisibles.length} de {materias?.length ?? 0} unidades curriculares registradas
      </p>
    </div>
  );
};