import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import type { PaginationParams } from '@/types/api';
import type { CreateUserRequest, UpdateUserRequest } from '@/types/user';
import { QUERY_KEYS } from '@/lib/constants';

export function useUsers(params?: PaginationParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.USERS, params],
    queryFn: () => usersService.getAll(params),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.USERS, id],
    queryFn: () => usersService.getById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => usersService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] }),
  });
}
