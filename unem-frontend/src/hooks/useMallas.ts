import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mallaService } from '../services/mallaService';
import type { MallaCreate, MallaUpdate } from '../types/models';

export const useMallas = () => {
  const queryClient = useQueryClient();
  const { data: mallas, isLoading } = useQuery({ queryKey: ['mallas'], queryFn: mallaService.getAll });

  const createMutation = useMutation({
    mutationFn: (data: MallaCreate) => mallaService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mallas'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MallaUpdate }) => mallaService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mallas'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mallaService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mallas'] }),
  });

  return {
    mallas, isLoading,
    createMalla: createMutation.mutate,
    updateMalla: updateMutation.mutate,
    deleteMalla: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};