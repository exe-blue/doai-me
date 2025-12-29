import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: () => api.getActivities(),
    refetchInterval: 30000, // 30초마다 갱신
  });
}

export function useAssignDevices() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ activityId, deviceIds }: { activityId: string; deviceIds: number[] }) =>
      api.assignDevicesToActivity(activityId, deviceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

export function useStartActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (activityId: string) => api.startActivity(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

