import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import { useMallas } from '../hooks/useMallas';
import { useProgramas } from '../hooks/useProgramas';
import { useAuth } from '../hooks/useAuth';
import { materiaService } from '../services/materiaService';
import type { Materia, MateriaCreate, EjeFormativo } from '../types/models';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { BookOpen, Search, Layers, Plus, Edit, X, AlertCircle, Info } from 'lucide-react';
import { PageHero } from '../components/PageHero';

const materiaSchema = z.object({
  codigo: z.string()
    .min(1, 'El código es obligatorio')
    .max(20, 'Máximo 20 caracteres')
    .regex(/^[A-Z0-9._-]+$/, 'Usa letras mayúsculas, números, puntos, guiones o guiones bajos'),
  nombre: z.string().trim()
    .min(1, 'El nombre es obligatorio')
    .max(250, 'Máximo 250 caracteres'),
  id_eje: z.string().min(1, 'Selecciona un eje formativo'),
  unidades_creditos: z.string()
    .regex(/^[1-9]\d*$/, 'Debe ser un entero positivo')
    .refine((value) => Number(value) <= 32767, 'Máximo 32767 unidades de crédito'),
  descripcion: z.string(),
});

type MateriaFormData = z.infer<typeof materiaSchema>;

export const Materias = () => {
  const { idRol, puede } = useAuth();
  const queryClient = useQueryClient();
  const esRolGestor = idRol === 1 || idRol === 2;
  const puedeCrear = esRolGestor && puede('materias', 'CRE', 'LIM');
  const puedeEditar = esRolGestor && puede('materias', 'ACT', 'LIM');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEje, setFiltroEje] = useState<number | ''>('');
  const [filtroPnf, setFiltroPnf] = useState<number | ''>('');

  const { mallas } = useMallas();
  const { programas } = useProgramas();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<MateriaFormData>({
    resolver: zodResolver(materiaSchema),
    mode: 'onChange',
    defaultValues: { codigo: '', nombre: '', id_eje: '', unidades_creditos: '1', descripcion: '' },
  });
  const codigoWatch = watch('codigo');
  useEffect(() => {
    if (codigoWatch && codigoWatch !== codigoWatch.toUpperCase()) {
      setValue('codigo', codigoWatch.toUpperCase(), { shouldValidate: true });
    }
  }, [codigoWatch, setValue]);

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
      return (await api.get('/materias/', { params })).data;
    },
  });

  const abrirCrear = () => {
    setEditingMateria(null);
    reset({ codigo: '', nombre: '', id_eje: '', unidades_creditos: '1', descripcion: '' });
    setIsModalOpen(true);
  };

  const abrirEditar = (materia: Materia) => {
    setEditingMateria(materia);
    reset({
      codigo: materia.codigo,
      nombre: materia.nombre,
      id_eje: materia.id_eje?.toString() ?? '',
      unidades_creditos: materia.unidades_creditos.toString(),
      descripcion: materia.descripcion ?? '',
    });
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setEditingMateria(null);
    reset();
  };

  const guardarMateria = async (data: MateriaFormData) => {
    const payload: MateriaCreate = {
      codigo: data.codigo.trim().toUpperCase(),
      nombre: data.nombre.trim(),
      id_eje: Number(data.id_eje),
      unidades_creditos: Number(data.unidades_creditos),
      descripcion: data.descripcion.trim(),
    };

    setIsSaving(true);
    try {
      if (editingMateria) {
        await materiaService.update(editingMateria.id_mat, payload);
        toast.success(`Materia "${payload.nombre}" actualizada correctamente`);
      } else {
        await materiaService.create(payload);
        toast.success(`Materia "${payload.nombre}" creada correctamente`);
      }
      await queryClient.invalidateQueries({ queryKey: ['materias'] });
      cerrarModal();
    } catch (error: unknown) {
      const detail = isAxiosError<{ detail?: unknown }>(error) ? error.response?.data?.detail : undefined;
      toast.error(typeof detail === 'string' ? detail : 'No se pudo guardar la materia');
    } finally {
      setIsSaving(false);
    }
  };

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
        descripcion="Registro maestro de unidades curriculares. Admin y Vicerrector pueden crear o editar; los demás roles tienen acceso de consulta."
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
          {puedeCrear && (
            <button className="unem-btn unem-btn-primary" onClick={abrirCrear}>
              <Plus size={15} /> Nueva materia
            </button>
          )}
          {!puedeCrear && !puedeEditar && <span className="unem-chip unem-chip-mut">Solo consulta</span>}
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
                {puedeEditar && <th>Acciones</th>}
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
                  {puedeEditar && (
                    <td>
                      <button className="unem-btn unem-btn-sm" onClick={() => abrirEditar(m)}>
                        <Edit size={14} /> Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--tx-3)', textAlign: 'center' }}>
        Mostrando {materiasVisibles.length} de {materias?.length ?? 0} unidades curriculares registradas
      </p>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingMateria ? 'Editar materia' : 'Nueva materia'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(guardarMateria)} className="p-6 space-y-4">
              <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>El código debe ser único y tener hasta 20 caracteres. Las unidades de crédito deben ser un entero positivo.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Código *</label>
                <input
                  type="text"
                  {...register('codigo')}
                  maxLength={20}
                  placeholder="Ej: MAT-LPRI-101"
                  className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 font-mono uppercase ${errors.codigo ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
                />
                {errors.codigo && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.codigo.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Nombre de la materia *</label>
                <input
                  type="text"
                  {...register('nombre')}
                  maxLength={250}
                  placeholder="Nombre completo"
                  className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${errors.nombre ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
                />
                {errors.nombre && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.nombre.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Eje formativo *</label>
                  <select
                    {...register('id_eje')}
                    className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${errors.id_eje ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
                  >
                    <option value="">Selecciona un eje</option>
                    {ejes?.map((eje) => (
                      <option key={eje.id_eje} value={eje.id_eje}>{eje.codigo} — {eje.nombre}</option>
                    ))}
                  </select>
                  {errors.id_eje && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.id_eje.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Unidades de crédito *</label>
                  <input
                    type="number"
                    min={1}
                    max={32767}
                    step={1}
                    {...register('unidades_creditos')}
                    className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${errors.unidades_creditos ? 'border-red-400' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
                  />
                  {errors.unidades_creditos && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {errors.unidades_creditos.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  {...register('descripcion')}
                  rows={3}
                  placeholder="Descripción breve o sinopsis de la materia"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={cerrarModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium">
                  {isSaving ? 'Guardando...' : editingMateria ? 'Guardar cambios' : 'Crear materia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};