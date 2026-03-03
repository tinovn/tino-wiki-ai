import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types/api';
import type { AiQueryRequest, AiQueryResponse, AiStreamChunk, AiJobStatus } from '@/types/ai';
import { getAccessToken, getTenantId } from '@/lib/auth';

export const aiService = {
  async query(data: AiQueryRequest): Promise<AiQueryResponse> {
    const res = await apiClient.post<ApiResponse<AiQueryResponse>>('/ai/query', data);
    return res.data.data;
  },

  async *queryStream(data: AiQueryRequest): AsyncGenerator<AiStreamChunk> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/ai/query/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
          'x-tenant-id': getTenantId() || '',
        },
        body: JSON.stringify(data),
      },
    );

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') return;
        try {
          yield JSON.parse(payload) as AiStreamChunk;
        } catch {
          // skip malformed chunks
        }
      }
    }
  },

  async getJobStatus(jobId: string): Promise<AiJobStatus> {
    const res = await apiClient.get<ApiResponse<AiJobStatus>>(`/ai/jobs/${jobId}`);
    return res.data.data;
  },
};
