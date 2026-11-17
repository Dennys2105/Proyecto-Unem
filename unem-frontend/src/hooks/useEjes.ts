import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ejeService } from '../services/ejeService';
import type { EjeCreate, EjeUpdate } from '../types/models';

export const useEjes = () => {
  const queryClient = useQueryClient();

  const { data: ejes, isLoading, refetch } = useQuery({
    queryKey: ['ejes'],
    queryFn: ejeService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: EjeCreate) => ejeService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ejes'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EjeUpdate }) => ejeService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ejes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ejeService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ejes'] }),
  });

  return {
    ejes,
    isLoading,
    refetch,
    createEje: createMutation.mutateAsync,   // ✅ mutateAsync para reactividad
    updateEje: updateMutation.mutateAsync,   // ✅ mutateAsync para reactividad
    deleteEje: deleteMutation.mutateAsync,   // ✅ mutateAsync para reactividad
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};