import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { municipioService } from '../services/municipioService';
import type { MunicipioCreate, MunicipioUpdate } from '../types/models';

export const useMunicipios = () => {
  const queryClient = useQueryClient();

  const { data: municipios, isLoading } = useQuery({
    queryKey: ['municipios'],
    queryFn: municipioService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: MunicipioCreate) => municipioService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipios'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MunicipioUpdate }) => 
      municipioService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipios'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => municipioService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipios'] });
    },
  });

  return {
    municipios,
    isLoading,
    createMunicipio: createMutation.mutate,
    updateMunicipio: updateMutation.mutate,
    deleteMunicipio: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};