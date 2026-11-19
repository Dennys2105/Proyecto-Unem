/**
 * UNEM · Descargas de reportes generados por el backend (Opción 3).
 * Los endpoints /exportar/* usan sesión neutra (sin Authorization),
 * por eso se abren con window.open y no con el cliente axios.
 */
const API_BASE: string = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const abrir = (ruta: string): void => {
  window.open(`${API_BASE}${ruta}`, '_blank', 'noopener');
};

/** Acta de notas en Excel (malla + período académico). */
export const descargarActaNotas = (idMalla: number, idPer: number): void => {
  abrir(`/exportar/exportar-notas?id_malla=${idMalla}&id_per=${idPer}`);
};

/** Listado de estudiantes de una sección en Excel. */
export const descargarEstudiantesSeccion = (codigoSeccion: string): void => {
  abrir(`/exportar/estudiantes/seccion/exel?codigo_seccion=${encodeURIComponent(codigoSeccion)}`);
};

/** Horario semanal del docente en PDF (cédula exacta, ej: V-14567890). */
export const descargarHorarioDocente = (cedula: string): void => {
  abrir(`/exportar/Horario_docente/pdf?cedula=${encodeURIComponent(cedula)}`);
};

/** Ficha de organización académica del docente en PDF. */
export const descargarFichaDocente = (cedula: string): void => {
  abrir(`/exportar/ficha-docente-pdf/${encodeURIComponent(cedula)}`);
};