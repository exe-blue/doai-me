import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
    refetchInterval: 30000, // 30초마다 갱신
  });
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => await api.healthCheck(),
    refetchInterval: 60000, // 1분마다 확인
  });
}

