import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { espacioFisicoService } from '../services/espacioFisicoService';
import type { EspacioFisicoCreate, EspacioFisicoUpdate } from '../types/models';

export const useEspaciosFisicos = () => {
  const queryClient = useQueryClient();

  const { data: espacios, isLoading } = useQuery({
    queryKey: ['espacios_fisicos'],
    queryFn: espacioFisicoService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: EspacioFisicoCreate) => espacioFisicoService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['espacios_fisicos'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EspacioFisicoUpdate }) =>
      espacioFisicoService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['espacios_fisicos'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => espacioFisicoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['espacios_fisicos'] });
    },
  });

  return {
    espacios,
    isLoading,
    createEspacio: createMutation.mutate,
    updateEspacio: updateMutation.mutate,
    deleteEspacio: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};