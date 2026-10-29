import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { programaService } from '../services/programaService';
import type { ProgramaCreate, ProgramaUpdate } from '../types/models';

export const useProgramas = () => {
  const queryClient = useQueryClient();

  const { data: programas, isLoading } = useQuery({
    queryKey: ['programas'],
    queryFn: programaService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: ProgramaCreate) => programaService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programas'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProgramaUpdate }) =>
      programaService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programas'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => programaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programas'] });
    },
  });

  return {
    programas,
    isLoading,
    createPrograma: createMutation.mutate,
    updatePrograma: updateMutation.mutate,
    deletePrograma: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};