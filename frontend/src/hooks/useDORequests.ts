import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDORequests(params?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['do-requests', params],
    queryFn: () => api.getDORequests(params),
    refetchInterval: 10000, // 10초마다 갱신
  });
}

export function useCreateDORequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      title: string;
      keyword: string;
      video_title?: string;
      agent_start?: number;
      agent_end?: number;
      like_probability?: number;
      comment_probability?: number;
      subscribe_probability?: number;
      execute_immediately?: boolean;
      priority?: number;
      memo?: string;
    }) => api.createDORequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['do-requests'] });
      queryClient.invalidateQueries({ queryKey: ['unified-logs'] });
    },
  });
}

export function useUpdateDORequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: string }) =>
      api.updateDORequest(requestId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['do-requests'] });
      queryClient.invalidateQueries({ queryKey: ['unified-logs'] });
    },
  });
}

export function useUnifiedLogs(params?: { source?: string; limit?: number }) {
  return useQuery({
    queryKey: ['unified-logs', params],
    queryFn: () => api.getUnifiedLogs(params),
    refetchInterval: 15000, // 15초마다 갱신
  });
}

