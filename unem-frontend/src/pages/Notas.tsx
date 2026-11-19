import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNotas } from '../hooks/useNotas';
import { useMallas } from '../hooks/useMallas';
import { usePeriodos } from '../hooks/usePeriodos';
import { useProgramas } from '../hooks/useProgramas';
import { useSecciones } from '../hooks/useSecciones';
import { notaService } from '../services/notaService';
import { descargarActaNotas } from '../utils/descargas';
import type { Nota, NotaUpdate, FilaActa } from '../types/models';
import {
  ClipboardList, Search, X, AlertCircle, Info, Edit, Save,
  ArrowUp, ArrowDown, ArrowUpDown, UserX, UserCheck,
  FileSpreadsheet, List, CheckCircle2, XCircle, MinusCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const TIPOS_EVALUACION = ['Parcial 1', 'Parcial 2', 'Parcial 3', 'Final', 'Recuperación', 'Trabajo'];


const aRomano = (n: number): string => {
  const r = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  return r[n - 1] || String(n);
};

interface ColumnDef {
  key: string;
  label: string;
  render?: (value: any, row: Nota) => ReactNode;
  sortable?: boolean;
}

type SortKey = 'id_nota' | 'estudiante' | 'nota';
type SortDir = 'asc' | 'desc';
type Tab = 'acta' | 'listado';

export const NotasPage = () => {
  const {
    notas, isLoading, updateNota, guardarActa,
    isUpdating, isSavingActa, refetch
  } = useNotas();
  const { mallas } = useMallas();
  const { periodos } = usePeriodos();
  const { programas } = useProgramas();
  const { secciones } = useSecciones();

  const [tab, setTab] = useState<Tab>('acta');

  // ---------- Estado del ACTA ----------
  const [actaPrograma, setActaPrograma] = useState('');
  const [actaSeccion, setActaSeccion] = useState('');
  const [actaMalla, setActaMalla] = useState('');
  const [actaPeriodo, setActaPeriodo] = useState('');
  const [actaTipo, setActaTipo] = useState('Final');
  const [filas, setFilas] = useState<FilaActa[]>([]);
  const [cargandoActa, setCargandoActa] = useState(false);
  const [actaCargada, setActaCargada] = useState(false);
  const [verTodasMaterias, setVerTodasMaterias] = useState(false);
  const [notasTexto, setNotasTexto] = useState<Record<number, string>>({});

  // ---------- Estado del LISTADO ----------
  const [filtroPrograma, setFiltroPrograma] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('A');
  const [busqueda, setBusqueda] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id_nota');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingNota, setEditingNota] = useState<Nota | null>(null);
  const [notaEdit, setNotaEdit] = useState('');
  const [obsEdit, setObsEdit] = useState('');

  const listaMallas: any[] = Array.isArray(mallas) ? mallas : [];
  const listaPeriodos: any[] = Array.isArray(periodos) ? periodos : [];
  const listaProgramas: any[] = Array.isArray(programas) ? programas : [];
  const listaSecciones: any[] = Array.isArray(secciones) ? secciones : [];

  // ---------- Cascada del acta ----------
  const seccionesDelPrograma = useMemo(
    () => listaSecciones.filter((s) => s.estatus === 'A' && (!actaPrograma || String(s.id_pro) === actaPrograma)),
    [listaSecciones, actaPrograma]
  );

  const seccionSel = listaSecciones.find((s) => String(s.id_sec) === actaSeccion);

  const periodoSeccion = seccionSel?.periodo ?? null;
  // ✅ El sistema del programa determina el tipo de período académico
  const programaDeSeccion = listaProgramas.find((p) => p.id_pro === seccionSel?.id_pro);
  const tipoPeriodoRequerido = programaDeSeccion?.tipo_sistema === 'Semestral' ? 'Semestre' : 'Trimestre';

  const periodosCompatibles = useMemo(
    () => listaPeriodos.filter((p) => (p.estatus ?? 'A') === 'A' && p.tipo === tipoPeriodoRequerido),
    [listaPeriodos, tipoPeriodoRequerido]
  );

  // ✅ Autoselecciona el período vigente al elegir la sección
  useEffect(() => {
    if (!seccionSel) { setActaPeriodo(''); return; }
    const vigente = periodosCompatibles.find((p) => p.activo === true);
    const elegido = vigente ?? (periodosCompatibles.length === 1 ? periodosCompatibles[0] : null);
    setActaPeriodo(elegido ? String(elegido.id_per) : '');
    setActaCargada(false);
  }, [actaSeccion, tipoPeriodoRequerido, periodosCompatibles]);


  const mallasDelPrograma = useMemo(() => {
    if (!seccionSel) return [];
    return listaMallas
      .filter((m) => m.id_pro === seccionSel.id_pro)
      .sort((a, b) =>
        (a.trayecto - b.trayecto) || (a.periodo - b.periodo) || ((a.orden ?? 0) - (b.orden ?? 0))
      );
  }, [listaMallas, seccionSel]);


  const { mallasDisponibles, ambitoMaterias } = useMemo(() => {
    if (!seccionSel) {
      return { mallasDisponibles: [] as any[], ambitoMaterias: 'ninguno' as const };
    }
    if (verTodasMaterias) {
      return { mallasDisponibles: mallasDelPrograma, ambitoMaterias: 'programa' as const };
    }


    const exactas = mallasDelPrograma.filter(
      (m) => m.trayecto === seccionSel.trayecto && m.periodo === periodoSeccion
    );
    if (exactas.length > 0) {
      return { mallasDisponibles: exactas, ambitoMaterias: 'exacto' as const };
    }


    const delTrayecto = mallasDelPrograma.filter((m) => m.trayecto === seccionSel.trayecto);
    if (delTrayecto.length > 0) {
      return { mallasDisponibles: delTrayecto, ambitoMaterias: 'trayecto' as const };
    }


    return { mallasDisponibles: mallasDelPrograma, ambitoMaterias: 'programa' as const };
  }, [mallasDelPrograma, seccionSel, periodoSeccion, verTodasMaterias]);

  const nombreMalla = (m: any): string => {
    const mat = m.materia?.nombre ?? m.materia?.codigo ?? `Materia ${m.id_mat}`;
    const uc = m.materia?.unidades_creditos ? ` · ${m.materia.unidades_creditos} UC` : '';
    return `T${aRomano(m.trayecto)}·P${m.periodo} — ${mat}${uc}`;
  };

  const cargarActa = async () => {
    if (!actaSeccion || !actaMalla || !actaPeriodo) {
      toast.error('Selecciona sección, materia y período académico');
      return;
    }
    setCargandoActa(true);
    try {
      const data = await notaService.getActa({
        id_sec: parseInt(actaSeccion, 10),
        id_malla: parseInt(actaMalla, 10),
        id_per: parseInt(actaPeriodo, 10),
        tipo_evaluacion: actaTipo,
      });
      setFilas(data);
      const textos: Record<number, string> = {};
      data.forEach((f) => { textos[f.id_est] = f.nota === null ? '' : String(f.nota); });
      setNotasTexto(textos);

      setActaCargada(true);
      toast.success(`${data.length} estudiante(s) cargado(s) en el acta`);
    } catch (error: any) {
      setFilas([]);
      setActaCargada(false);
      toast.error(error?.response?.data?.detail || 'No se pudo cargar el acta');
    } finally {
      setCargandoActa(false);
    }
  };

  const cambiarNotaFila = (id_est: number, valor: string) => {
    // 1. Acepta coma O punto como separador decimal (Venezuela usa coma)
    let texto = valor.replace(/,/g, '.').replace(/[^0-9.]/g, '');

    // 2. Permitir un solo punto decimal
    const primera = texto.indexOf('.');
    if (primera !== -1) {
      texto = texto.slice(0, primera + 1) + texto.slice(primera + 1).replace(/\./g, '');
    }

    // 3. Máximo 2 decimales (la columna es numeric(4,2))
    const [entero, decimal] = texto.split('.');
    if (decimal !== undefined && decimal.length > 2) {
      texto = `${entero}.${decimal.slice(0, 2)}`;
    }

    // 4. ✅ Guardar el TEXTO tal cual: conserva "15." mientras escribes
    setNotasTexto((prev) => ({ ...prev, [id_est]: texto }));

    // 5. Guardar el NÚMERO para validar y enviar al backend
    const numero = texto === '' || texto === '.' ? null : Number(texto);
    setFilas((prev) => prev.map((f) =>
      f.id_est === id_est ? { ...f, nota: numero } : f
    ));
  };

  const statsActa = useMemo(() => {
    const conNota = filas.filter((f) => f.nota !== null && !Number.isNaN(f.nota as number));
    const validas = conNota.filter((f) => (f.nota as number) >= 0 && (f.nota as number) <= 20);
    const invalidas = conNota.length - validas.length;
    const suma = validas.reduce((a, f) => a + (f.nota as number), 0);
    const aprobados = validas.filter((f) => (f.nota as number) >= 10).length;
    return {
      total: filas.length,
      cargadas: conNota.length,
      invalidas,
      promedio: validas.length > 0 ? (suma / validas.length).toFixed(2) : '—',
      aprobados,
      reprobados: validas.length - aprobados,
    };
  }, [filas]);

  const guardarActaHandler = async () => {
    if (statsActa.invalidas > 0) {
      toast.error(`Hay ${statsActa.invalidas} nota(s) fuera del rango 0-20. Corrígelas antes de guardar.`);
      return;
    }
    if (statsActa.cargadas === 0) {
      toast.error('No has ingresado ninguna calificación');
      return;
    }
    try {
      const resumen = await guardarActa({
        id_malla: parseInt(actaMalla, 10),
        id_per: parseInt(actaPeriodo, 10),
        tipo_evaluacion: actaTipo,
        filas: filas.map((f) => ({ id_est: f.id_est, nota: f.nota })),
      });
      toast.success(resumen.mensaje, { icon: '✅', duration: 4000 });
      await cargarActa();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al guardar el acta');
    }
  };

  // ---------- Listado ----------
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((p) => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const notasFiltradas = useMemo(() => {
    if (!notas) return [];
    const filtradas = notas.filter((n: Nota) => {
      const est = n.estatus ?? 'A';
      if (filtroPrograma && n.cod_programa !== filtroPrograma) return false;
      if (filtroPeriodo && String(n.id_per) !== filtroPeriodo) return false;
      if (filtroTipo && n.tipo_evaluacion !== filtroTipo) return false;
      if (filtroEstado && est !== filtroEstado) return false;
      if (busqueda) {
        const texto = `${n.cedula ?? ''} ${n.estudiante ?? ''} ${n.materia ?? ''}`.toLowerCase();
        if (!texto.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
    return [...filtradas].sort((a: Nota, b: Nota) => {
      let cmp = 0;
      if (sortKey === 'id_nota') cmp = (a.id_nota ?? 0) - (b.id_nota ?? 0);
      else if (sortKey === 'nota') cmp = (a.nota ?? 0) - (b.nota ?? 0);
      else cmp = (a.estudiante ?? '').localeCompare(b.estudiante ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [notas, filtroPrograma, filtroPeriodo, filtroTipo, filtroEstado, busqueda, sortKey, sortDir]);

  const abrirEdicion = (n: Nota) => {
    setEditingNota(n);
    setNotaEdit(String(n.nota ?? ''));
    setObsEdit(n.observaciones ?? '');
  };

  const guardarEdicion = async () => {
    if (!editingNota) return;
    const valor = Number(notaEdit);
    if (Number.isNaN(valor) || valor < 0 || valor > 20) {
      toast.error('La nota debe estar entre 0 y 20');
      return;
    }
    try {
      await updateNota({
        id: editingNota.id_nota,
        data: { nota: valor, observaciones: obsEdit } as NotaUpdate,
      });
      await refetch();
      toast.success('Calificación actualizada correctamente');
      setEditingNota(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'No se pudo actualizar la nota');
    }
  };

  const toggleAnulacion = async (n: Nota) => {
    const actual = n.estatus ?? 'A';
    const nuevo = actual === 'A' ? 'I' : 'A';
    const accion = nuevo === 'A' ? 'restaurada' : 'anulada';
    try {
      await updateNota({ id: n.id_nota, data: { estatus: nuevo } as NotaUpdate });
      await refetch();
      toast.success(`Calificación ${accion} correctamente`, { icon: nuevo === 'A' ? '✅' : '📋' });
    } catch {
      toast.error(`No se pudo ${accion === 'anulada' ? 'anular' : 'restaurar'} la calificación`);
    }
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="text-gray-400" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />;
  };

  const badgeNota = (valor: number, anulada: boolean) => {
    if (anulada) return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">{valor.toFixed(2)}</span>;
    const aprobado = valor >= 10;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
        aprobado ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
      }`}>
        {aprobado ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
        {valor.toFixed(2)}
      </span>
    );
  };

  const columns: ColumnDef[] = [
    { key: 'id_nota', label: 'ID', sortable: true },
    {
      key: 'estudiante', label: 'Estudiante', sortable: true,
      render: (v: any, row: Nota) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{v ?? `ID ${row.id_est}`}</p>
          <p className="text-xs font-mono text-gray-400">{row.cedula ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'materia', label: 'Materia',
      render: (v: any, row: Nota) => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-700 truncate" title={v ?? ''}>{v ?? `Malla ${row.id_malla}`}</p>
          <p className="text-xs text-gray-400">
            {row.cod_programa} · T{aRomano(row.trayecto ?? 1)}-P{aRomano(row.periodo ?? 1)}
          </p>
        </div>
      ),
    },
    { key: 'periodo_academico', label: 'Período', render: (v: any) => <span className="text-xs text-gray-600">{v ?? '—'}</span> },
    {
      key: 'tipo_evaluacion', label: 'Evaluación',
      render: (v: any) => <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">{v}</span>,
    },
    {
      key: 'nota', label: 'Nota', sortable: true,
      render: (v: any, row: Nota) => badgeNota(Number(v ?? 0), (row.estatus ?? 'A') !== 'A'),
    },
    {
      key: 'estatus', label: 'Estado',
      render: (value: any) => {
        const est = value ?? 'A';
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
            est === 'A' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}>
            {est === 'A' ? <><UserCheck size={12} /> Vigente</> : <><UserX size={12} /> Anulada</>}
          </span>
        );
      },
    },
    {
      key: 'acciones', label: 'Acciones',
      render: (_: any, row: Nota) => {
        const activa = (row.estatus ?? 'A') === 'A';
        return (
          <div className="flex gap-2">
            <button onClick={() => abrirEdicion(row)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
              <Edit size={14} /> Editar
            </button>
            <button onClick={() => toggleAnulacion(row)} disabled={isUpdating} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
              activa ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}>
              {activa ? <UserX size={14} /> : <UserCheck size={14} />}
              {activa ? 'Anular' : 'Restaurar'}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex items-start gap-4">
        <div className="bg-indigo-100 p-3 rounded-xl"><ClipboardList className="text-indigo-600" size={32} /></div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Registro de Calificaciones</h1>
          <p className="text-gray-600 mt-1 max-w-3xl">
            Carga masiva por acta (sección + materia + período) o gestión individual.
            Escala venezolana <strong>0-20</strong>; se aprueba con <strong>10</strong> o más.
            Las notas anuladas se conservan para auditoría.
          </p>
        </div>
      </div>

      {/* PESTAÑAS */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('acta')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            tab === 'acta' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileSpreadsheet size={16} /> Acta de Calificaciones
        </button>
        <button
          onClick={() => setTab('listado')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            tab === 'listado' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <List size={16} /> Listado ({notas?.length ?? 0})
        </button>
      </div>

      {/* ================= PESTAÑA ACTA ================= */}
      {tab === 'acta' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <Info size={18} className="shrink-0 mt-0.5" />
              <p>
               Selecciona la sección y la materia: el sistema traerá <strong>todos sus estudiantes activos</strong>.
                Las casillas vacías se omiten (no borran notas existentes). Guardar dos veces <strong>actualiza</strong>, no duplica.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase">1. Programa</label>
                <select
                  value={actaPrograma}
                  onChange={(e) => { setActaPrograma(e.target.value); setActaSeccion(''); setActaMalla(''); setActaCargada(false); }}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Todos</option>
                  {listaProgramas.filter((p) => p.estatus === 'A').map((p) => (
                    <option key={p.id_pro} value={p.id_pro}>{p.codigo}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase">2. Sección *</label>
                <select
                  value={actaSeccion}
                  onChange={(e) => {
                    setActaSeccion(e.target.value);
                    setActaMalla('');
                    setActaCargada(false);
                    setVerTodasMaterias(false);   
                  }}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Selecciona</option>
                  {seccionesDelPrograma.map((s) => (
                    <option key={s.id_sec} value={s.id_sec}>
                      {s.codigo} (T{aRomano(s.trayecto)}-P{aRomano(s.periodo)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase">3. Materia *</label>
                  {seccionSel && (
                    <button
                      type="button"
                      onClick={() => { setVerTodasMaterias((v) => !v); setActaMalla(''); setActaCargada(false); }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                    >
                      {verTodasMaterias ? 'Filtrar' : 'Ver todas'}
                    </button>
                  )}
                </div>
                <select
                  value={actaMalla}
                  onChange={(e) => { setActaMalla(e.target.value); setActaCargada(false); }}
                  disabled={!seccionSel}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
                >
                  <option value="">
                    {!seccionSel
                      ? 'Elige sección primero'
                      : mallasDisponibles.length === 0
                        ? 'Sin materias en la malla'
                        : `Selecciona (${mallasDisponibles.length})`}
                  </option>
                  {mallasDisponibles.map((m) => (
                    <option key={m.id_malla} value={m.id_malla}>{nombreMalla(m)}</option>
                  ))}
                </select>

                {/* ✅ Indicadores de ámbito */}
                                {seccionSel && ambitoMaterias === 'exacto' && (
                  <p className="text-xs text-green-600">
                    {mallasDisponibles.length} materia(s) de T{aRomano(seccionSel.trayecto)}·P{periodoSeccion}
                  </p>
                )}
                {seccionSel && ambitoMaterias === 'trayecto' && (
                  <p className="text-xs text-amber-600">
                    Sin coincidencia exacta de período. Mostrando las {mallasDisponibles.length} del trayecto {aRomano(seccionSel.trayecto)}.
                  </p>
                )}
                {seccionSel && ambitoMaterias === 'programa' && (
                  <p className="text-xs text-gray-500">
                    Mostrando las {mallasDisponibles.length} materias del programa.
                  </p>
                )}
                {seccionSel && mallasDisponibles.length === 0 && (
                  <p className="text-xs text-red-600">
                    Este programa no tiene materias registradas en la malla curricular.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase">
                  4. Período {seccionSel ? '(auto)' : '*'}
                </label>
                <select
                  value={actaPeriodo}
                  onChange={(e) => { setActaPeriodo(e.target.value); setActaCargada(false); }}
                  disabled={!seccionSel}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
                >
                  <option value="">
                    {!seccionSel ? 'Elige sección primero' : periodosCompatibles.length === 0 ? 'Sin períodos compatibles' : 'Selecciona'}
                  </option>
                  {periodosCompatibles.map((p) => (
                    <option key={p.id_per} value={p.id_per}>
                      {p.nombre}{p.activo ? ' ★' : ''}
                    </option>
                  ))}
                </select>
                {seccionSel && actaPeriodo && (
                  <p className="text-xs text-green-600">
                    {tipoPeriodoRequerido} · sistema de {programaDeSeccion?.codigo}
                  </p>
                )}
                {seccionSel && periodosCompatibles.length === 0 && (
                  <p className="text-xs text-red-600">
                    No hay períodos de tipo {tipoPeriodoRequerido} activos.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase">5. Evaluación *</label>
                <select
                  value={actaTipo}
                  onChange={(e) => { setActaTipo(e.target.value); setActaCargada(false); }}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {TIPOS_EVALUACION.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={cargarActa}
                disabled={cargandoActa}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium"
              >
                <RefreshCw size={16} className={cargandoActa ? 'animate-spin' : ''} />
                {cargandoActa ? 'Cargando acta...' : 'Cargar acta'}
              </button>
              <button
                onClick={() => descargarActaNotas(parseInt(actaMalla, 10), parseInt(actaPeriodo, 10), actaTipo, actaSeccion ? parseInt(actaSeccion, 10) : undefined)}
                disabled={!actaMalla || !actaPeriodo}
                title={!actaMalla || !actaPeriodo ? 'Selecciona materia y período para exportar' : 'Descargar el acta guardada en Excel'}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium"
              >
                <FileSpreadsheet size={16} /> Excel
              </button>
            </div>
          </div>

          {actaCargada && filas.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Resumen en vivo */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-5 bg-gray-50 border-b border-gray-200">
                <MiniStat label="Estudiantes" valor={statsActa.total} />
                <MiniStat label="Cargadas" valor={`${statsActa.cargadas} / ${statsActa.total}`} />
                <MiniStat label="Promedio" valor={statsActa.promedio} />
                <MiniStat label="Aprobados" valor={statsActa.aprobados} color="text-green-600" />
                <MiniStat label="Reprobados" valor={statsActa.reprobados} color="text-red-600" />
              </div>

              {statsActa.invalidas > 0 && (
                <div className="flex gap-2 p-3 bg-red-50 border-b border-red-200 text-sm text-red-800">
                  <AlertCircle size={18} className="shrink-0" />
                  <p><strong>{statsActa.invalidas}</strong> calificación(es) fuera del rango 0-20. Corrígelas para poder guardar.</p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-12">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Cédula</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Estudiante</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Nota (0-20)</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase w-32">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filas.map((f, i) => {
                      const tiene = f.nota !== null && !Number.isNaN(f.nota as number);
                      const valida = tiene && (f.nota as number) >= 0 && (f.nota as number) <= 20;
                      const aprob = valida && (f.nota as number) >= 10;
                      return (
                        <tr key={f.id_est} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-2 text-xs text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2 font-mono text-sm text-gray-700">{f.cedula}</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{f.apellido}, {f.nombre}</td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={notasTexto[f.id_est] ?? ''}
                              onChange={(e) => cambiarNotaFila(f.id_est, e.target.value)}
                              placeholder="—"
                              className={`w-24 rounded-md border px-3 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-1 ${
                                tiene && !valida
                                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50'
                                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                              }`}
                            />
                          </td>
                          <td className="px-4 py-2">
                            {!tiene ? (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400"><MinusCircle size={12} /> Sin cargar</span>
                            ) : !valida ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600"><AlertCircle size={12} /> Inválida</span>
                            ) : aprob ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle2 size={12} /> Aprobado</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600"><XCircle size={12} /> Reprobado</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-4 p-5 border-t border-gray-200 flex-wrap">
                <p className="text-xs text-gray-500">
                  {statsActa.cargadas} de {statsActa.total} casillas llenas · {statsActa.total - statsActa.cargadas} se omitirán al guardar
                </p>
                <button
                  onClick={guardarActaHandler}
                  disabled={isSavingActa || statsActa.invalidas > 0 || statsActa.cargadas === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-semibold shadow-sm"
                >
                  <Save size={16} />
                  {isSavingActa ? 'Guardando acta...' : `Guardar ${statsActa.cargadas} calificación(es)`}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= PESTAÑA LISTADO ================= */}
      {tab === 'listado' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por cédula, estudiante o materia..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select value={filtroPrograma} onChange={(e) => setFiltroPrograma(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Todos los programas</option>
                {listaProgramas.map((p) => <option key={p.id_pro} value={p.codigo}>{p.codigo}</option>)}
              </select>
              <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Todos los períodos</option>
                {listaPeriodos.map((p) => <option key={p.id_per} value={p.id_per}>{p.nombre}</option>)}
              </select>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Toda evaluación</option>
                {TIPOS_EVALUACION.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="A">Solo vigentes</option>
                <option value="I">Solo anuladas</option>
                <option value="">Todos los estados</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Cargando calificaciones...</p>
              </div>
            ) : notasFiltradas.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500 font-medium">No se encontraron calificaciones</p>
                <p className="text-gray-400 text-sm mt-1">Usa la pestaña "Acta de Calificaciones" para cargar notas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {columns.map((col) => (
                        <th key={col.key} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          {col.sortable ? (
                            <button onClick={() => toggleSort(col.key as SortKey)} className="inline-flex items-center gap-1 hover:text-indigo-700 transition uppercase">
                              {col.label}<SortIcon colKey={col.key as SortKey} />
                            </button>
                          ) : col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {notasFiltradas.map((n: Nota) => (
                      <tr key={n.id_nota} className="hover:bg-gray-50 transition">
                        {columns.map((col) => (
                          <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                            {col.render ? col.render((n as any)[col.key], n) : String((n as any)[col.key] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center">
            Mostrando {notasFiltradas.length} de {notas?.length ?? 0} calificaciones registradas
            {' · '}Ordenado por <span className="font-semibold">{sortKey === 'id_nota' ? 'ID' : sortKey === 'nota' ? 'Nota' : 'Estudiante'}</span> ({sortDir === 'asc' ? 'ascendente' : 'descendente'})
          </p>
        </>
      )}

      {/* MODAL EDICIÓN INDIVIDUAL */}
      {editingNota && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Editar Calificación</h2>
              <button onClick={() => setEditingNota(null)} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                <p className="font-semibold text-gray-900">{editingNota.estudiante}</p>
                <p className="text-xs text-gray-500 font-mono">{editingNota.cedula}</p>
                <p className="text-xs text-gray-600 mt-1">{editingNota.materia}</p>
                <p className="text-xs text-gray-400">{editingNota.periodo_academico} · {editingNota.tipo_evaluacion}</p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Nota (0-20) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={notaEdit}
                  onChange={(e) => setNotaEdit(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-center text-lg shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {notaEdit !== '' && Number(notaEdit) >= 0 && Number(notaEdit) <= 20 && (
                  <p className={`text-xs font-bold mt-1 ${Number(notaEdit) >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(notaEdit) >= 10 ? '✓ Aprobado' : '✗ Reprobado'}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                <textarea
                  rows={2}
                  value={obsEdit}
                  onChange={(e) => setObsEdit(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={() => setEditingNota(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium">Cancelar</button>
                <button onClick={guardarEdicion} disabled={isUpdating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium">
                  {isUpdating ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MiniStat = ({ label, valor, color = 'text-gray-900' }: { label: string; valor: number | string; color?: string }): ReactNode => (
  <div>
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${color}`}>{valor}</p>
  </div>
);