import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estudianteService } from '../services/estudianteService';
import type { EstudianteCreate, EstudianteUpdate } from '../types/models';

export const useEstudiantes = () => {
  const queryClient = useQueryClient();

  const { data: estudiantes, isLoading } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: estudianteService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: EstudianteCreate) => estudianteService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estudiantes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EstudianteUpdate }) =>
      estudianteService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estudiantes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => estudianteService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estudiantes'] });
    },
  });

  return {
    estudiantes,
    isLoading,
    createEstudiante: createMutation.mutate,
    updateEstudiante: updateMutation.mutate,
    deleteEstudiante: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};