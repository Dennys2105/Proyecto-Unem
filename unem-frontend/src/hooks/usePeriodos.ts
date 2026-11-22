import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodoService } from '../services/periodoService';
import type { PeriodoCreate, PeriodoUpdate } from '../types/models';

export const usePeriodos = () => {
  const queryClient = useQueryClient();
  const invalidarConsultasPeriodos = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['periodos'] }),
    queryClient.invalidateQueries({ queryKey: ['analytics', 'periodos-vigentes'] }),
  ]);

  const { data: periodos, isLoading, refetch } = useQuery({
    queryKey: ['periodos'],
    queryFn: periodoService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: PeriodoCreate) => periodoService.create(data),
    onSuccess: invalidarConsultasPeriodos,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PeriodoUpdate }) =>
      periodoService.update(id, data),
    onSuccess: invalidarConsultasPeriodos,
  });

  const activarMutation = useMutation({
    mutationFn: (id: number) => periodoService.activar(id),
    onSuccess: invalidarConsultasPeriodos,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => periodoService.delete(id),
    onSuccess: invalidarConsultasPeriodos,
  });

  return {
    periodos,
    isLoading,
    refetch,
    createPeriodo: createMutation.mutateAsync,
    updatePeriodo: updateMutation.mutateAsync,
    activarPeriodo: activarMutation.mutateAsync,
    deletePeriodo: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isActivating: activarMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};