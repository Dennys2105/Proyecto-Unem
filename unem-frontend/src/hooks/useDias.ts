import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { diaService } from '../services/diaService';
import type { DiaCreate, DiaUpdate } from '../types/models';

export const useDias = () => {
  const queryClient = useQueryClient();

  const { data: dias, isLoading } = useQuery({
    queryKey: ['dias'],
    queryFn: diaService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: DiaCreate) => diaService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dias'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DiaUpdate }) =>
      diaService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dias'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => diaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dias'] });
    },
  });

  return {
    dias,
    isLoading,
    createDia: createMutation.mutate,
    updateDia: updateMutation.mutate,
    deleteDia: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};