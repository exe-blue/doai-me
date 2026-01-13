"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, Eye, Heart, MessageSquare, User, Loader2 } from 'lucide-react';

interface ActivityDetails {
  duration?: number;
  comment?: string;
  points?: number;
  [key: string]: unknown;
}

interface ActivityLog {
  id: string;
  persona_id: string;
  activity_type: string;
  video_id: string | null;
  details: ActivityDetails | null;
  created_at: string;
  persona?: {
    name: string;
    device_serial: string;
  };
}

const activityConfig: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  watch: { icon: Eye, color: 'var(--color-info)', label: '시청' },
  like: { icon: Heart, color: 'var(--color-error)', label: '좋아요' },
  comment: { icon: MessageSquare, color: 'var(--color-success)', label: '댓글' },
  subscribe: { icon: User, color: 'var(--color-primary)', label: '구독' },
  heartbeat: { icon: Activity, color: 'var(--color-warning)', label: '하트비트' },
};

export const ActivityFeed = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from('persona_activity_logs')
        .select(`
          *,
          persona:personas(name, device_serial)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) setActivities(data);
      setLoading(false);
    };

    fetchActivities();

    // 실시간 구독
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'persona_activity_logs' },
        (payload) => {
          setActivities((prev) => [payload.new as ActivityLog, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="theme-surface border theme-border rounded-lg p-6">
        <h2 className="text-lg theme-text font-medium mb-4">활동 피드</h2>
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin theme-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="theme-surface border theme-border rounded-lg p-6">
      <h2 className="text-lg theme-text font-medium mb-4">활동 피드</h2>

      {activities.length === 0 ? (
        <p className="text-sm theme-text-muted text-center py-8">
          활동 기록이 없습니다
        </p>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => {
            const config = activityConfig[activity.activity_type] || activityConfig.heartbeat;
            const ActivityIcon = config.icon;

            return (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-elevated)]"
              >
                <ActivityIcon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: config.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm theme-text">
                    <span className="font-medium">
                      {activity.persona?.name || '알 수 없음'}
                    </span>
                    <span className="theme-text-muted mx-1">-</span>
                    <span className="theme-text-dim">{config.label}</span>
                    {activity.video_id && (
                      <span className="theme-text-muted ml-1">
                        ({activity.video_id})
                      </span>
                    )}
                  </p>
                  <p className="text-xs theme-text-muted">
                    {new Date(activity.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
