import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ejeService } from '../services/ejeService';
import type { EjeCreate, EjeUpdate } from '../types/models';

export const useEjes = () => {
  const queryClient = useQueryClient();
  const { data: ejes, isLoading } = useQuery({ queryKey: ['ejes'], queryFn: ejeService.getAll });

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
    ejes, isLoading,
    createEje: createMutation.mutate,
    updateEje: updateMutation.mutate,
    deleteEje: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};