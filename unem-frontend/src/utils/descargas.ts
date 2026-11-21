import api from '../lib/axios';
import toast from 'react-hot-toast';

const guardar = (blob: Blob, nombre: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
};

const descargar = async (ruta: string, nombre: string): Promise<void> => {
  try {
    const res = await api.get(ruta, { responseType: 'blob' });
    guardar(res.data as Blob, nombre);
    toast.success('Descarga lista', { icon: '📄' });
  } catch {
    toast.error('No se pudo generar el archivo (sesión o permisos).');
  }
};

export const descargarActaNotas = (
  idMalla: number, idPer: number, tipoEvaluacion?: string, idSeccion?: number,
): Promise<void> => {
  let ruta = `/exportar/exportar-notas?id_malla=${idMalla}&id_per=${idPer}`;
  if (tipoEvaluacion) ruta += `&tipo_evaluacion=${encodeURIComponent(tipoEvaluacion)}`;
  if (idSeccion !== undefined) ruta += `&id_sec=${idSeccion}`;
  return descargar(ruta, `acta_notas_${idMalla}_${idPer}.xlsx`);
};

export const descargarEstudiantesSeccion = (codigoSeccion: string): Promise<void> =>
  descargar(`/exportar/estudiantes/seccion/exel?codigo_seccion=${encodeURIComponent(codigoSeccion)}`, `seccion_${codigoSeccion}.xlsx`);

export const descargarHorarioDocente = (cedula: string): Promise<void> =>
  descargar(`/exportar/Horario_docente/pdf?cedula=${encodeURIComponent(cedula)}`, `horario_${cedula}.pdf`);

export const descargarFichaDocente = (cedula: string): Promise<void> =>
  descargar(`/exportar/ficha-docente-pdf/${encodeURIComponent(cedula)}`, `ficha_docente_${cedula}.pdf`);