import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BookOpen, Users, ClipboardList, CalendarDays, Download, FileSpreadsheet,
  CheckCircle2, AlertCircle, Clock, RefreshCw, Save,
} from 'lucide-react';
import { PageHero } from '../components/PageHero';
import {
  miDocenciaService, type MiAsignacion, type MiAlumno,
  type MiFilaNota, type MiResumen,
} from '../services/miDocenciaService';

export type VistaDocente = 'resumen' | 'materias' | 'estudiantes' | 'notas' | 'asistencia' | 'horario';
const EVALUACIONES = ['Final', 'Recuperación', 'Parcial 1', 'Parcial 2', 'Parcial 3', 'Trabajo'];
const TITULOS: Record<VistaDocente, string> = {
  resumen: 'Mi Dashboard', materias: 'Mis Materias y Secciones',
  estudiantes: 'Mis Estudiantes', notas: 'Cargar Notas',
  asistencia: 'Lista de Asistencia', horario: 'Mi Horario',
};
const DESCRIPCIONES: Record<VistaDocente, string> = {
  resumen: 'Resumen personal de tu actividad académica.',
  materias: 'Materias y grupos asignados por el Vicerrectorado.',
  estudiantes: 'Solo alumnos activos de las secciones a tu cargo.',
  notas: 'Registra calificaciones y revisa las decisiones de Coordinación.',
  asistencia: 'Descarga un listado institucional de tus estudiantes.',
  horario: 'Consulta tus bloques de trabajo y descarga tu horario personal.',
};
const ICONOS = {
  resumen: BookOpen, materias: BookOpen, estudiantes: Users,
  notas: ClipboardList, asistencia: FileSpreadsheet, horario: CalendarDays,
};
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function mensajeError(error: unknown): string {
  const e = error as { response?: { data?: { detail?: string } }; message?: string };
  return e?.response?.data?.detail || e?.message || 'No fue posible completar la operación.';
}

const EstadoNota = ({ fila }: { fila: MiFilaNota }): ReactNode => {
  if (fila.id_nota === null) return <span className="unem-chip unem-chip-soft">Sin registrar</span>;
  if (fila.estado_revision === 'A') return <span className="unem-chip unem-chip-ins">Validada</span>;
  if (fila.estado_revision === 'R') return <span className="unem-chip unem-chip-del">Rechazada</span>;
  return <span className="unem-chip unem-chip-soft">Pendiente</span>;
};

export const DocentePortal = ({ vista }: { vista: VistaDocente }): ReactNode => {
  const [asignaciones, setAsignaciones] = useState<MiAsignacion[]>([]);
  const [resumen, setResumen] = useState<MiResumen | null>(null);
  const [alumnos, setAlumnos] = useState<MiAlumno[]>([]);
  const [acta, setActa] = useState<MiFilaNota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [seccionId, setSeccionId] = useState('');
  const [claseId, setClaseId] = useState('');
  const [tipo, setTipo] = useState('Final');
  const [borradores, setBorradores] = useState<Record<number, string>>({});
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});
  const [editados, setEditados] = useState<number[]>([]);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const lista = await miDocenciaService.asignaciones();
      setAsignaciones(lista);
      if (vista === 'resumen') setResumen(await miDocenciaService.resumen());
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }, [vista]);
  useEffect(() => { void recargar(); }, [recargar]);

  const clases = useMemo(() => {
    const unicas = new Map<string, MiAsignacion>();
    asignaciones.filter((a) => a.id_sec && a.id_malla && a.id_per && a.tipo_actividad === 'Carga Académica')
      .forEach((a) => unicas.set(`${a.id_sec}:${a.id_malla}:${a.id_per}`, a));
    return [...unicas.values()];
  }, [asignaciones]);
  const secciones = useMemo(() => {
    const unicas = new Map<number, MiAsignacion>();
    asignaciones.filter((a) => a.id_sec).forEach((a) => unicas.set(a.id_sec!, a));
    return [...unicas.values()].sort((a, b) => (a.seccion || '').localeCompare(b.seccion || ''));
  }, [asignaciones]);
  const clase = clases.find((a) => `${a.id_sec}:${a.id_malla}:${a.id_per}` === claseId);

  useEffect(() => {
    if (vista !== 'estudiantes' || cargando) return;
    let vigente = true;
    miDocenciaService.alumnos(seccionId ? Number(seccionId) : undefined)
      .then((rows) => { if (vigente) { setAlumnos(rows); setError(''); } })
      .catch((e) => { if (vigente) { setAlumnos([]); setError(mensajeError(e)); } });
    return () => { vigente = false; };
  }, [vista, seccionId, cargando]);

  const recargarActa = useCallback(async () => {
    if (!clase) { setActa([]); return; }
    const filas = await miDocenciaService.acta({ id_sec: clase.id_sec!, id_malla: clase.id_malla!, id_per: clase.id_per! }, tipo);
    setActa(filas);
    setBorradores(Object.fromEntries(filas.map((f) => [f.id_est, f.nota === null ? '' : String(f.nota)])));
    setObservaciones(Object.fromEntries(filas.map((f) => [f.id_est, f.observaciones || ''])));
    setEditados([]);
  }, [claseId, tipo, asignaciones]);

  useEffect(() => {
    if (vista !== 'notas') return;
    let vigente = true;
    if (!clase) { setActa([]); return; }
    miDocenciaService.acta({ id_sec: clase.id_sec!, id_malla: clase.id_malla!, id_per: clase.id_per! }, tipo)
      .then((filas) => {
        if (!vigente) return;
        setActa(filas);
        setBorradores(Object.fromEntries(filas.map((f) => [f.id_est, f.nota === null ? '' : String(f.nota)])));
        setObservaciones(Object.fromEntries(filas.map((f) => [f.id_est, f.observaciones || ''])));
        setEditados([]);
        setError('');
      }).catch((e) => { if (vigente) { setActa([]); setError(mensajeError(e)); } });
    return () => { vigente = false; };
  }, [vista, claseId, tipo, asignaciones]);

  const marcar = (id: number): void => setEditados((old) => old.includes(id) ? old : [...old, id]);
  const guardar = async (): Promise<void> => {
    if (!clase) return;
    const filas = acta.filter((f) => editados.includes(f.id_est) && f.estado_revision !== 'A')
      .filter((f) => borradores[f.id_est]?.trim() !== '')
      .map((f) => ({ id_est: f.id_est, nota: Number(borradores[f.id_est]), observaciones: observaciones[f.id_est] || null }));
    if (filas.length === 0) { toast.error('Introduce o modifica al menos una calificación.'); return; }
    if (filas.some((f) => !Number.isFinite(f.nota) || f.nota < 0 || f.nota > 20)) {
      toast.error('Las notas deben estar entre 0 y 20.'); return;
    }
    setProcesando(true);
    try {
      const resultado = await miDocenciaService.guardarActa(
        { id_sec: clase.id_sec!, id_malla: clase.id_malla!, id_per: clase.id_per! }, tipo, filas,
      );
      toast.success(resultado.mensaje);
      await recargarActa();
    } catch (e) { toast.error(mensajeError(e)); }
    finally { setProcesando(false); }
  };

  const descargar = async (url: string, nombre: string): Promise<void> => {
    setProcesando(true);
    try { await miDocenciaService.descargar(url, nombre); toast.success('Descarga iniciada.'); }
    catch (e) { toast.error(mensajeError(e)); }
    finally { setProcesando(false); }
  };
  const Icono = ICONOS[vista];
  const selector = (valor: string, onChange: (v: string) => void, opciones: { value: string; label: string }[], etiqueta: string): ReactNode => (
    <label style={{ display: 'grid', gap: 6, minWidth: 220, flex: 1 }}>
      <span style={{ color: 'var(--tx-2)', fontWeight: 700, fontSize: 12 }}>{etiqueta}</span>
      <select className="unem-input" value={valor} onChange={(e) => onChange(e.target.value)}>
        {opciones.map((o) => <option value={o.value} key={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
  const opcionesClases = [
    { value: '', label: 'Selecciona tu materia y sección' },
    ...clases.map((a) => ({
      value: `${a.id_sec}:${a.id_malla}:${a.id_per}`,
      label: `${a.materia || 'Materia'} · Sección ${a.seccion || a.id_sec} · ${a.periodo_academico || 'Período'}`,
    })),
  ];

  return <div className="unem-page">
    <PageHero icon={Icono} titulo={TITULOS[vista]} descripcion={DESCRIPCIONES[vista]}
      acciones={<button className="unem-btn" onClick={() => void recargar()}><RefreshCw size={15}/> Actualizar</button>} />
    {error && <div className="unem-card unem-card-pad" role="alert" style={{ marginBottom: 18, color: '#b91c1c' }}>
      <AlertCircle size={16} style={{ display: 'inline', marginRight: 8 }}/>{error}
    </div>}
    {cargando ? <div className="unem-card unem-card-pad">Cargando tus asignaciones…</div> : <>
      {vista === 'resumen' && <>
        <div className="unem-card unem-card-pad">
          <h3>Bienvenido, {resumen?.docente || 'Docente'}</h3>
          <p>Este espacio muestra únicamente los grupos y registros vinculados a tu cuenta.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
            {[
              ['Clases asignadas', resumen?.clases ?? 0], ['Secciones', resumen?.secciones ?? 0],
              ['Alumnos', resumen?.estudiantes ?? 0], ['Notas pendientes', resumen?.notas_pendientes ?? 0],
              ['Notas rechazadas', resumen?.notas_rechazadas ?? 0], ['Notas validadas', resumen?.notas_aprobadas ?? 0],
            ].map(([nombre, valor]) => <div className="unem-chip unem-chip-soft" key={nombre}>{nombre}: <b>{valor}</b></div>)}
          </div>
        </div>
        <div className="unem-card unem-card-pad" style={{ marginTop: 16 }}>
          <h3>Accesos rápidos</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            <Link className="unem-btn unem-btn-primary" to="/mis-materias">Mis materias</Link>
            <Link className="unem-btn" to="/cargar-notas">Cargar notas</Link>
            <Link className="unem-btn" to="/mi-horario">Mi horario</Link>
          </div>
        </div>
      </>}

      {vista === 'materias' && <div className="unem-card unem-card-pad">
        <h3>Materias y secciones asignadas</h3>
        {asignaciones.filter((a) => a.tipo_actividad === 'Carga Académica').length === 0
          ? <p>No tienes clases académicas asignadas todavía.</p> :
          <div style={{ overflowX: 'auto' }}><table className="unem-table"><thead><tr>
            <th>Materia</th><th>Sección</th><th>Programa</th><th>Período</th><th>Acciones</th>
          </tr></thead><tbody>{asignaciones.filter((a) => a.tipo_actividad === 'Carga Académica').map((a) => <tr key={a.id_asig}>
            <td>{a.materia || 'Materia por definir'}</td>
            <td>{a.seccion || <span style={{ color: '#b45309' }}>Sin sección vinculada</span>}</td>
            <td>{a.programa || '—'}</td><td>{a.periodo_academico || '—'}</td>
            <td>{a.id_sec && a.id_malla && a.id_per
              ? <Link className="unem-btn" to="/cargar-notas">Calificaciones</Link>
              : <span style={{ fontSize: 12, color: '#b45309' }}>Solicita al Vicerrector vincular una sección</span>}</td>
          </tr>)}</tbody></table></div>}
      </div>}

      {vista === 'estudiantes' && <div className="unem-card unem-card-pad">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          {selector(seccionId, setSeccionId,
            [{ value: '', label: 'Todas mis secciones' }, ...secciones.map((s) => ({value: String(s.id_sec), label: s.seccion || `Sección ${s.id_sec}`}))],
            'Sección')}
        </div>
        <h3>Alumnos activos ({alumnos.length})</h3>
        {alumnos.length === 0 ? <p>No hay estudiantes activos en las secciones seleccionadas.</p> :
          <div style={{ overflowX: 'auto' }}><table className="unem-table"><thead><tr>
            <th>Cédula</th><th>Apellidos</th><th>Nombres</th><th>Sección</th><th>Trayecto</th>
          </tr></thead><tbody>{alumnos.map((a) => <tr key={a.id_est}>
            <td>{a.cedula}</td><td>{a.apellido}</td><td>{a.nombre}</td><td>{a.seccion}</td><td>{a.trayecto}</td>
          </tr>)}</tbody></table></div>}
      </div>}

      {vista === 'notas' && <div className="unem-card unem-card-pad">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          {selector(claseId, setClaseId, opcionesClases, 'Materia / sección / período')}
          {selector(tipo, setTipo, EVALUACIONES.map((t) => ({value: t, label: t})), 'Evaluación')}
        </div>
        {!clase ? <p>Selecciona una clase para cargar el acta. Solo aparecen tus asignaciones vigentes.</p> : <>
          <p style={{ marginBottom: 14 }}>Las notas nuevas se envían a Coordinación como <b>pendientes</b>. Una nota aprobada no puede alterarse; las rechazadas muestran el motivo para que puedas corregirlas.</p>
          {acta.length === 0 ? <p>No hay estudiantes activos para esta clase o evaluación.</p> : <>
            <div style={{ overflowX: 'auto' }}><table className="unem-table"><thead><tr>
              <th>Estudiante</th><th>Cédula</th><th>Nota (0–20)</th><th>Observaciones</th><th>Revisión</th>
            </tr></thead><tbody>{acta.map((fila) => {
              const aprobada = fila.estado_revision === 'A' && fila.id_nota !== null;
              return <tr key={fila.id_est}>
                <td>{fila.apellido}, {fila.nombre}</td><td>{fila.cedula}</td>
                <td><input className="unem-input" type="number" min="0" max="20" step="0.01"
                  style={{ width: 92 }} disabled={aprobada} value={borradores[fila.id_est] ?? ''}
                  onChange={(e) => { setBorradores((b) => ({...b, [fila.id_est]: e.target.value})); marcar(fila.id_est); }} /></td>
                <td><input className="unem-input" disabled={aprobada} maxLength={400}
                  value={observaciones[fila.id_est] ?? ''} onChange={(e) => {
                    setObservaciones((o) => ({...o, [fila.id_est]: e.target.value})); marcar(fila.id_est);
                  }} /></td>
                <td><EstadoNota fila={fila}/>{fila.estado_revision === 'R' && fila.motivo_rechazo &&
                  <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>Motivo: {fila.motivo_rechazo}</div>}
                  {fila.estado_revision === 'R' && <button className="unem-btn" style={{ marginTop: 6 }}
                    onClick={() => marcar(fila.id_est)}>Reenviar corrección</button>}</td>
              </tr>;
            })}</tbody></table></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="unem-btn unem-btn-primary" disabled={procesando || editados.length === 0}
                onClick={() => void guardar()}><Save size={15}/> {procesando ? 'Guardando…' : 'Guardar y enviar a revisión'}</button>
            </div>
          </>}
        </>}
      </div>}

      {vista === 'asistencia' && <div className="unem-card unem-card-pad">
        <h3>Descargar listado de asistencia</h3>
        <p>Elige una sección propia. El archivo Excel incluye a sus estudiantes activos y columnas para controlar la asistencia.</p>
        {secciones.length === 0 ? <p>No tienes secciones asignadas.</p> :
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {secciones.map((a) => <div key={a.id_sec} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
              <b>Sección {a.seccion}</b>
              <button className="unem-btn" disabled={procesando} onClick={() => void descargar(
                `/mi-docencia/asistencia/${a.id_sec}/excel`, `asistencia_${a.seccion || a.id_sec}.xlsx`)}>
                <Download size={16}/> Descargar Excel
              </button>
            </div>)}
          </div>}
      </div>}

      {vista === 'horario' && <div className="unem-card unem-card-pad">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Mi horario de trabajo</h3>
          <button className="unem-btn unem-btn-primary" disabled={procesando}
            onClick={() => void descargar('/mi-docencia/horario/pdf', 'mi_horario.pdf')}>
            <Download size={15}/> Descargar mi horario PDF
          </button>
        </div>
        {asignaciones.length === 0 ? <p>Todavía no tienes horarios asignados.</p> : <div style={{ overflowX: 'auto' }}>
          <table className="unem-table"><thead><tr><th>Día</th><th>Hora</th><th>Materia / actividad</th><th>Sección</th><th>Espacio</th></tr></thead>
            <tbody>{[...asignaciones].sort((a, b) => (DIAS.indexOf(a.dia || '') - DIAS.indexOf(b.dia || '')) || (a.hora_inicio || '').localeCompare(b.hora_inicio || '')).map((a) => <tr key={a.id_asig}>
              <td>{a.dia || '—'}</td><td>{a.hora_inicio} – {a.hora_fin}</td>
              <td>{a.materia || a.tipo_actividad || '—'}</td><td>{a.seccion || '—'}</td>
              <td>{a.nombre_centro || '—'}{a.aula ? ` · ${a.aula}` : ''}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </div>}
    </>}
    {vista !== 'resumen' && <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 7, color: 'var(--tx-3)', fontSize: 12 }}>
      <Clock size={14}/> La información proviene de tus asignaciones activas.
      <CheckCircle2 size={14}/> Acceso personal de solo lectura, excepto la carga de notas.
    </div>}
  </div>;
};
