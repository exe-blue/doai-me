import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/monitoring
// 통합 모니터링 데이터 (devices, runners, stats)
export async function GET() {
  try {
    // 병렬로 데이터 조회
    const [devicesResult, runnersResult, statsResult] = await Promise.all([
      // 1. Devices (device_overview 뷰 사용)
      supabase
        .from('device_overview')
        .select('*')
        .order('device_index'),
      
      // 2. Runners (runner_status_summary 뷰 사용)
      supabase
        .from('runner_status_summary')
        .select('*')
        .order('hostname'),
      
      // 3. System Stats (system_stats_summary 뷰 사용)
      supabase
        .from('system_stats_summary')
        .select('*')
        .single(),
    ]);

    // 에러 처리 (뷰가 없는 경우 fallback)
    let devices = devicesResult.data || [];
    let runners = runnersResult.data || [];
    let stats = statsResult.data || getDefaultStats();

    // 뷰가 없으면 기본 테이블에서 조회
    if (devicesResult.error?.code === '42P01') {
      // devices_v2 테이블이 없으면 기존 devices 테이블 시도
      const fallback = await supabase
        .from('devices')
        .select('*')
        .order('device_id');
      
      if (fallback.data) {
        devices = fallback.data.map((d: Record<string, unknown>, idx: number) => ({
          device_id: d.device_id,
          device_serial: d.laixi_id || d.device_id,
          model_name: d.model || 'Galaxy S9',
          manufacturer_serial: null,
          slot_number: d.slot_number || idx + 1,
          connection_type: 'ethernet',
          sim_carrier: null,
          device_ip_address: null,
          connection_status: d.status === 'online' ? 'connected' : 'disconnected',
          work_status: d.work_status || 'idle',
          hardware_status: 'active',
          effective_status: getEffectiveStatus(d),
          device_index: idx + 1,
          runner_id: d.node_id,
          runner_hostname: d.node_id,
          runner_ip: '',
          runner_status: 'offline',
          agent_id: d.assigned_persona_id,
          google_email: null,
          agent_name: null,
          binding_status: d.assigned_persona_id ? 'bound' : null,
          last_command: d.last_command,
          last_command_at: null,
          last_error_log: d.last_error_message,
          last_backup_at: null,
        }));
      }
    }

    if (runnersResult.error?.code === '42P01') {
      // node_runners 테이블이 없으면 기존 nodes 테이블 시도
      const fallback = await supabase
        .from('nodes')
        .select('*')
        .order('name');
      
      if (fallback.data) {
        runners = fallback.data.map((n: Record<string, unknown>) => ({
          runner_id: n.node_id,
          hostname: n.name || n.node_id,
          ip_address: n.ip_address || '',
          status: n.last_heartbeat && 
            new Date(n.last_heartbeat as string) > new Date(Date.now() - 60000) 
            ? 'online' : 'offline',
          total_devices: n.capacity || 20,
          connected_count: n.online_device_count || 0,
          busy_count: 0,
          error_count: 0,
          umbra_count: 0,
          faulty_count: 0,
          seconds_since_heartbeat: n.last_heartbeat 
            ? (Date.now() - new Date(n.last_heartbeat as string).getTime()) / 1000 
            : null,
        }));
      }
    }

    if (statsResult.error?.code === '42P01') {
      // 통계 수동 계산
      stats = calculateStats(devices, runners);
    }

    return NextResponse.json({
      devices,
      runners,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Monitoring API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}

// Helper: 기본 통계
function getDefaultStats() {
  return {
    total_runners: 0,
    online_runners: 0,
    total_devices: 0,
    connected_devices: 0,
    active_devices: 0,
    busy_devices: 0,
    umbra_devices: 0,
    error_devices: 0,
    offline_devices: 0,
    active_hardware: 0,
    faulty_hardware: 0,
    replaced_hardware: 0,
    ethernet_count: 0,
    wifi_count: 0,
    sim_count: 0,
    bound_agents: 0,
    unbound_agents: 0,
    migrating_agents: 0,
    measured_at: new Date().toISOString(),
  };
}

// Helper: Effective Status 계산
function getEffectiveStatus(device: Record<string, unknown>): string {
  if (device.hardware_status === 'faulty') return 'faulty';
  if (device.status === 'offline' || device.connection_status === 'disconnected') return 'offline';
  if (device.status === 'error' || device.work_status === 'error') return 'error';
  if (device.work_status === 'in_umbra') return 'umbra';
  if (device.status === 'busy' || device.work_status === 'busy') return 'busy';
  return 'active';
}

// Helper: 통계 계산
function calculateStats(
  devices: Array<Record<string, unknown>>, 
  runners: Array<Record<string, unknown>>
) {
  return {
    total_runners: runners.length,
    online_runners: runners.filter(r => r.status === 'online').length,
    total_devices: devices.length,
    connected_devices: devices.filter(d => d.connection_status === 'connected').length,
    active_devices: devices.filter(d => d.effective_status === 'active').length,
    busy_devices: devices.filter(d => d.effective_status === 'busy').length,
    umbra_devices: devices.filter(d => d.effective_status === 'umbra').length,
    error_devices: devices.filter(d => d.effective_status === 'error').length,
    offline_devices: devices.filter(d => d.effective_status === 'offline').length,
    active_hardware: devices.filter(d => d.hardware_status === 'active').length,
    faulty_hardware: devices.filter(d => d.hardware_status === 'faulty').length,
    replaced_hardware: devices.filter(d => d.hardware_status === 'replaced').length,
    ethernet_count: devices.filter(d => d.connection_type === 'ethernet').length,
    wifi_count: devices.filter(d => d.connection_type === 'wifi').length,
    sim_count: devices.filter(d => d.connection_type === 'sim').length,
    bound_agents: devices.filter(d => d.agent_id !== null).length,
    unbound_agents: devices.filter(d => d.agent_id === null).length,
    migrating_agents: 0,
    measured_at: new Date().toISOString(),
  };
}


