import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';

export const useResumen = () => {
  const { data: resumen, isLoading, error } = useQuery({
    queryKey: ['resumen'],
    queryFn: analyticsService.getResumen,
    staleTime: 1000 * 60 * 5,
  });
  return { resumen, isLoading, error };
};