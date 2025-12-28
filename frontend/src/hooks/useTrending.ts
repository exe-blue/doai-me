import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useTrending(limit = 20) {
  return useQuery({
    queryKey: ['trending', limit],
    queryFn: () => api.getTrending(limit),
    refetchInterval: 60000, // 1분마다 갱신
  });
}

export function useIdeas(status?: string) {
  return useQuery({
    queryKey: ['ideas', status],
    queryFn: () => api.getIdeas(status),
    refetchInterval: 60000,
  });
}

export function useUpdateIdeaStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ ideaId, status }: { ideaId: string; status: string }) =>
      api.updateIdeaStatus(ideaId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });
}

