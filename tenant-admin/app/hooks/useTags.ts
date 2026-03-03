import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsService } from '@/services/tags.service';
import type { CreateTagRequest } from '@/types/tag';
import { QUERY_KEYS } from '@/lib/constants';

export function useTags() {
  return useQuery({
    queryKey: [QUERY_KEYS.TAGS],
    queryFn: () => tagsService.getAll(),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTagRequest) => tagsService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.TAGS] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tagsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.TAGS] }),
  });
}
