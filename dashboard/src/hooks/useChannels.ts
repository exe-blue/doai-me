import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: () => api.getChannels(),
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
}

export function useChannel(channelId: string) {
  return useQuery({
    queryKey: ['channels', channelId],
    queryFn: () => api.getChannel(channelId),
    enabled: !!channelId,
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: string; data: { stats?: Record<string, number>; experience_points?: number } }) =>
      api.updateChannel(channelId, data),
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channels', channelId] });
    },
  });
}

