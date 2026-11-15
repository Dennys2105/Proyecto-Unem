import { useQuery } from '@tanstack/react-query';
import { auditoriaService } from '../services/auditoriaService';

export const useAuditoria = () => {
  const { data: auditoria, isLoading, error } = useQuery({
    queryKey: ['auditoria'],
    queryFn: auditoriaService.getAll,
    staleTime: 1000 * 60 * 2, // Refresca cada 2 minutos
    retry: 1, // Reintenta solo 1 vez si falla
  });

  return { auditoria, isLoading, error };
};