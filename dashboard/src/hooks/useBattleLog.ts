import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useBattleLog(limit = 50) {
  return useQuery({
    queryKey: ['battle-log', limit],
    queryFn: () => api.getBattleLog(limit),
    refetchInterval: 30000, // 30초마다 갱신
  });
}

export function useCreateBattleLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      event_type: string;
      description: string;
      our_channel_id?: string;
      our_channel_name?: string;
      impact_score?: number;
    }) => api.createBattleLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battle-log'] });
    },
  });
}

