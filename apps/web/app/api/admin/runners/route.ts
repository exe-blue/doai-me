import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // v_runner_status_bar 뷰 사용
    const { data, error } = await supabase
      .from('v_runner_status_bar')
      .select('*')
      .order('status', { ascending: false }) // online first
      .order('hostname');

    if (error) {
      // 뷰가 없으면 nodes 테이블 직접 조회
      if (error.code === '42P01') {
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000);

        const { data: nodesData, error: nodesError } = await supabase
          .from('nodes')
          .select('*')
          .order('name');

        if (nodesError) throw nodesError;

        // 모든 디바이스를 한번에 조회하여 N+1 쿼리 방지
        const { data: allDevices, error: devicesError } = await supabase
          .from('devices')
          .select('node_id, status');

        if (devicesError) {
          processLogger.error(`Failed to fetch devices: ${devicesError.message}`);
          return NextResponse.json(
            { error: 'Failed to fetch devices for runner stats' },
            { status: 500 }
          );
        }

        // 노드별 디바이스 통계 집계
        const devicesByNode: Record<string, { connected: number; busy: number; error: number }> = {};
        
        (allDevices ?? []).forEach((device: { node_id: string; status: string }) => {
          if (!devicesByNode[device.node_id]) {
            devicesByNode[device.node_id] = { connected: 0, busy: 0, error: 0 };
          }
          
          if (device.status === 'online') {
            devicesByNode[device.node_id].connected++;
          } else if (device.status === 'busy') {
            devicesByNode[device.node_id].busy++;
          } else if (['error', 'missing'].includes(device.status)) {
            devicesByNode[device.node_id].error++;
          }
        });

        // 노드 데이터와 통계 결합
        const runnersWithStats = (nodesData || []).map((node: Record<string, unknown>) => {
          const nodeId = node.node_id as string;
          const stats = devicesByNode[nodeId] || { connected: 0, busy: 0, error: 0 };
          
          const lastHeartbeat = node.last_heartbeat 
            ? new Date(node.last_heartbeat as string) 
            : null;
          const isOnline = lastHeartbeat && lastHeartbeat > oneMinuteAgo;

          return {
            runner_id: nodeId,
            hostname: node.name || nodeId,
            ip_address: node.ip_address,
            status: isOnline ? 'online' : 'offline',
            detailed_status: node.status_v2 || node.status,
            connected_devices: stats.connected,
            busy_devices: stats.busy,
            error_devices: stats.error,
            capacity: node.capacity || 120,
            last_heartbeat: node.last_heartbeat,
            seconds_since_heartbeat: lastHeartbeat 
              ? (now.getTime() - lastHeartbeat.getTime()) / 1000 
              : null,
          };
        });

        return NextResponse.json(runnersWithStats);
      }
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Runners API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch runners' },
      { status: 500 }
    );
  }
}


