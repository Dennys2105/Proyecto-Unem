/**
 * Ordenador natural (human-friendly).
 * Compara strings tratando los números dentro de ellos como valores numéricos.
 * Ej: "Aula 2" < "Aula 10" (a diferencia del orden lexicográfico).
 */
export const compararNatural = (a: string, b: string): number => {
  return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
};

/**
 * Ordena una lista de objetos por una propiedad de tipo string usando orden natural.
 */
export function ordenarNaturalPor<T>(lista: T[], key: (item: T) => string): T[] {
  return [...lista].sort((a, b) => compararNatural(key(a), key(b)));
}