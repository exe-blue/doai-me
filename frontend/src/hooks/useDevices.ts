import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDevices(params?: { phoneboard_id?: number; status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: () => api.getDevices(params),
    refetchInterval: 10000, // 10초마다 갱신
  });
}

export function useDeviceCommand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ deviceId, command, params }: { deviceId: number; command: string; params?: Record<string, unknown> }) =>
      api.sendDeviceCommand(deviceId, command, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

export function useDeviceHeartbeat() {
  return useMutation({
    mutationFn: (deviceIds: number[]) => api.deviceHeartbeat(deviceIds),
  });
}

