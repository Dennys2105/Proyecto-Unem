import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';

const REFRESH_MS = 60_000; 

export const useAnalytics = () => {
  const resumen = useQuery({
    queryKey: ['analytics', 'resumen'],
    queryFn: analyticsService.getResumen,
    refetchInterval: REFRESH_MS,
  });

  const cargaPorDia = useQuery({
    queryKey: ['analytics', 'carga-por-dia'],
    queryFn: analyticsService.getCargaPorDia,
    refetchInterval: REFRESH_MS,
  });

  const porContrato = useQuery({
    queryKey: ['analytics', 'docentes-por-contrato'],
    queryFn: analyticsService.getDocentesPorContrato,
    refetchInterval: REFRESH_MS,
  });

  const ocupacion = useQuery({
    queryKey: ['analytics', 'ocupacion-espacios'],
    queryFn: () => analyticsService.getOcupacionEspacios(8),
    refetchInterval: REFRESH_MS,
  });

  const porPrograma = useQuery({
    queryKey: ['analytics', 'estudiantes-por-programa'],
    queryFn: analyticsService.getEstudiantesPorPrograma,
    refetchInterval: REFRESH_MS,
  });

  const periodosVigentes = useQuery({
    queryKey: ['analytics', 'periodos-vigentes'],
    queryFn: analyticsService.getPeriodosVigentes,
    refetchInterval: REFRESH_MS,
  });

  const coberturaSecciones = useQuery({
    queryKey: ['analytics', 'cobertura-secciones'],
    queryFn: analyticsService.getCoberturaSecciones,
    refetchInterval: REFRESH_MS,
  });

  const coberturaNotas = useQuery({
    queryKey: ['analytics', 'cobertura-notas'],
    queryFn: analyticsService.getCoberturaNotas,
    refetchInterval: REFRESH_MS,
  });

  
  const isLoading =
    resumen.isLoading || cargaPorDia.isLoading || porContrato.isLoading ||
    ocupacion.isLoading || porPrograma.isLoading || coberturaSecciones.isLoading;

  const isFetching =
    resumen.isFetching || cargaPorDia.isFetching || porContrato.isFetching ||
    ocupacion.isFetching || porPrograma.isFetching ||
    periodosVigentes.isFetching || coberturaNotas.isFetching || coberturaSecciones.isFetching;

  
  const refetchAll = async () => {
    const resultados = await Promise.all([
      resumen.refetch(),
      cargaPorDia.refetch(),
      porContrato.refetch(),
      ocupacion.refetch(),
      porPrograma.refetch(),
      periodosVigentes.refetch(),
      coberturaNotas.refetch(),
      coberturaSecciones.refetch(),
    ]);
    const huboError = resultados.some((r) => r.isError);
    if (huboError) throw new Error('Algunas métricas no pudieron actualizarse');
    return resultados;
  };

  return {
    resumen: resumen.data,
    cargaPorDia: cargaPorDia.data ?? [],
    porContrato: porContrato.data ?? [],
    ocupacion: ocupacion.data ?? [],
    porPrograma: porPrograma.data ?? [],
    periodosVigentes: periodosVigentes.data ?? [],
    coberturaNotas: coberturaNotas.data,
    coberturaSecciones: coberturaSecciones.data ?? [],
    isLoading,
    isFetching,                                        
    dataUpdatedAt: resumen.dataUpdatedAt,              
    isError: resumen.isError,
    refetchAll,
  };
};