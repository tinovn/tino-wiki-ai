import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesService } from '@/services/categories.service';
import type { CreateCategoryRequest } from '@/types/category';
import { QUERY_KEYS } from '@/lib/constants';

export function useCategories() {
  return useQuery({
    queryKey: [QUERY_KEYS.CATEGORIES],
    queryFn: () => categoriesService.getAll(),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryRequest) => categoriesService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategoryRequest> }) =>
      categoriesService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] }),
  });
}
