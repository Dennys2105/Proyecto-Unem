import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seccionService } from '../services/seccionService';

export const useSecciones = () => {
  const queryClient = useQueryClient();

  const { data: secciones, isLoading } = useQuery({
    queryKey: ['secciones'],
    queryFn: seccionService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => seccionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secciones'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      seccionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secciones'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => seccionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secciones'] });
    },
  });

  return {
    secciones,
    isLoading,
    createSeccion: createMutation.mutate,
    updateSeccion: updateMutation.mutate,
    deleteSeccion: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};