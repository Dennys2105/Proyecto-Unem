import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materiaService } from '../services/materiaService';
import type { MateriaCreate, MateriaUpdate } from '../types/models';

export const useMaterias = () => {
  const queryClient = useQueryClient();

  const { data: materias, isLoading } = useQuery({
    queryKey: ['materias'],
    queryFn: materiaService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: MateriaCreate) => materiaService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materias'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MateriaUpdate }) =>
      materiaService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materias'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => materiaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materias'] });
    },
  });

  return {
    materias,
    isLoading,
    createMateria: createMutation.mutate,
    updateMateria: updateMutation.mutate,
    deleteMateria: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};