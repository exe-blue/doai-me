import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => api.getNotifications(unreadOnly),
    refetchInterval: 30000, // 30초마다 갱신
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => api.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUnreadNotificationCount() {
  const { data } = useNotifications(true);
  return data?.notifications?.length ?? 0;
}

