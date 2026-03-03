import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsService } from '@/services/documents.service';
import type { DocumentQuery, CreateDocumentRequest, UpdateDocumentRequest } from '@/types/document';
import { QUERY_KEYS } from '@/lib/constants';

export function useDocuments(params?: DocumentQuery) {
  return useQuery({
    queryKey: [QUERY_KEYS.DOCUMENTS, params],
    queryFn: () => documentsService.getAll(params),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.DOCUMENTS, id],
    queryFn: () => documentsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDocumentRequest) => documentsService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] }),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentRequest }) => documentsService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS, id] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] }),
  });
}

export function usePublishDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsService.publish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] }),
  });
}

export function useUnpublishDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsService.unpublish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] }),
  });
}

export function useDocumentVersions(id: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.DOCUMENTS, id, 'versions'],
    queryFn: () => documentsService.getVersions(id),
    enabled: !!id,
  });
}

export function useRollbackDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => documentsService.rollback(id, version),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS, id] });
    },
  });
}
