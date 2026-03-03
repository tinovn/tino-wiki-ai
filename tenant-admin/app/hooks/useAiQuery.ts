import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { aiService } from '@/services/ai.service';
import type { AiQueryRequest, AiStreamChunk } from '@/types/ai';

export function useAiQuery() {
  return useMutation({
    mutationFn: (data: AiQueryRequest) => aiService.query(data),
  });
}

export function useAiStream() {
  const [chunks, setChunks] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  const stream = useCallback(async (data: AiQueryRequest): Promise<string> => {
    setChunks('');
    setIsStreaming(true);
    let fullText = '';
    try {
      for await (const chunk of aiService.queryStream(data)) {
        fullText += chunk.content;
        setChunks((prev) => prev + chunk.content);
      }
    } finally {
      setIsStreaming(false);
    }
    return fullText;
  }, []);

  const reset = useCallback(() => {
    setChunks('');
    setIsStreaming(false);
  }, []);

  return { chunks, isStreaming, stream, reset };
}

export function useAiJobStatus(jobId: string) {
  return useQuery({
    queryKey: ['ai-jobs', jobId],
    queryFn: () => aiService.getJobStatus(jobId),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === 'COMPLETED' || data.status === 'FAILED')) return false;
      return 3000;
    },
  });
}
