export const notaMinimaAprobatoria = (ejeFormativo?: string | null): number =>
  ejeFormativo?.trim().toLowerCase() === 'proyecto' ? 16 : 12;
