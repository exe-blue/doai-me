import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/monitoring/{deviceId}
// Device Actions: mark-faulty, backup, restore-binding
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const body = await request.json();
    const { action, ...payload } = body;

    switch (action) {
      case 'mark-faulty':
        return await markDeviceFaulty(deviceId, payload.notes);
      
      case 'backup':
        return await createBackup(deviceId);
      
      case 'replace':
        return await replaceDevice(
          deviceId, 
          payload.newSerial, 
          payload.newImei
        );
      
      case 'restore-binding':
        return await restoreBinding(deviceId, payload.agentId);
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Device Action Error:', error);
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}

// GET /api/admin/monitoring/{deviceId}
// Device History
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;

    const { data, error } = await supabase
      .from('device_history')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Device History Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

// ============================================
// Action Handlers
// ============================================

async function markDeviceFaulty(deviceId: string, notes?: string) {
  // RPC 호출 (mark_device_faulty 함수)
  const { data, error } = await supabase.rpc('mark_device_faulty', {
    p_device_id: deviceId,
    p_notes: notes || null,
  });

  if (error) {
    // RPC가 없으면 직접 처리
    if (error.code === '42883') {
      // 직접 업데이트
      const { error: updateError } = await supabase
        .from('devices_v2')
        .update({
          hardware_status: 'faulty',
          work_status: 'error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deviceId);

      if (updateError) throw updateError;

      // 이력 기록
      const { error: historyError } = await supabase.from('device_history').insert({
        device_id: deviceId,
        event_type: 'faulty',
        notes: notes || 'Device marked as faulty',
      });

      if (historyError) {
        console.error('Failed to insert device_history:', historyError, { deviceId, event_type: 'faulty' });
      }

      return NextResponse.json({ success: true, message: 'Device marked as faulty' });
    }
    throw error;
  }

  return NextResponse.json({ success: true, data });
}

async function createBackup(deviceId: string) {
  // 디바이스 정보 조회
  const { data: device, error: deviceError } = await supabase
    .from('devices_v2')
    .select('*, ai_agents(*)')
    .eq('id', deviceId)
    .single();

  if (deviceError) throw deviceError;
  if (!device) throw new Error('Device not found');

  // 백업 URL 생성 (실제로는 S3/GCS에 업로드)
  const backupUrl = `backup://${deviceId}/${Date.now()}.snapshot`;

  // 디바이스 백업 정보 업데이트
  const { error: updateError } = await supabase
    .from('devices_v2')
    .update({
      backup_snapshot_url: backupUrl,
      last_backup_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', deviceId);

  if (updateError) throw updateError;

  // Agent 상태 백업 (있는 경우)
  if (device.agent_id) {
    const { error: agentError } = await supabase
      .from('ai_agents')
      .update({
        last_state_backup: device.ai_agents?.persona_config || {},
        last_state_backup_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', device.agent_id);

    if (agentError) {
      console.error('Failed to update ai_agents backup:', agentError, { 
        deviceId, 
        agentId: device.agent_id 
      });
      throw new Error(`Failed to backup agent state: ${agentError.message}`);
    }
  }

  // 이력 기록
  await supabase.from('device_history').insert({
    device_id: deviceId,
    agent_id: device.agent_id,
    event_type: 'backup_created',
    metadata: { backup_url: backupUrl },
  });

  return NextResponse.json({ 
    success: true, 
    message: 'Backup created',
    backupUrl,
  });
}

async function replaceDevice(
  deviceId: string, 
  newSerial: string, 
  newImei?: string
) {
  // RPC 호출 (replace_device 함수)
  const { data, error } = await supabase.rpc('replace_device', {
    p_device_id: deviceId,
    p_new_serial: newSerial,
    p_new_imei: newImei || null,
  });

  if (error) {
    // RPC가 없으면 직접 처리
    if (error.code === '42883') {
      // 기존 시리얼 조회
      const { data: oldDevice } = await supabase
        .from('devices_v2')
        .select('device_serial, agent_id')
        .eq('id', deviceId)
        .single();

      // 업데이트
      const { error: updateError } = await supabase
        .from('devices_v2')
        .update({
          device_serial: newSerial,
          manufacturer_serial: newImei,
          hardware_status: 'replaced',
          connection_status: 'connected',
          work_status: 'idle',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deviceId);

      if (updateError) throw updateError;

      // 이력 기록
      await supabase.from('device_history').insert({
        device_id: deviceId,
        agent_id: oldDevice?.agent_id,
        event_type: 'replaced',
        old_device_serial: oldDevice?.device_serial,
        new_device_serial: newSerial,
      });

      return NextResponse.json({ success: true, message: 'Device replaced' });
    }
    throw error;
  }

  return NextResponse.json({ success: true, data });
}

async function restoreBinding(deviceId: string, agentId: string) {
  // RPC 호출 (restore_agent_binding 함수)
  const { data, error } = await supabase.rpc('restore_agent_binding', {
    p_device_id: deviceId,
    p_agent_id: agentId,
  });

  if (error) {
    // RPC가 없으면 직접 처리
    if (error.code === '42883') {
      // Agent 상태 확인
      const { data: agent } = await supabase
        .from('ai_agents')
        .select('binding_status')
        .eq('id', agentId)
        .single();

      if (agent?.binding_status !== 'migrating') {
        return NextResponse.json(
          { error: 'Agent is not in migrating status' },
          { status: 400 }
        );
      }

      // 디바이스에 Agent 바인딩
      await supabase
        .from('devices_v2')
        .update({ agent_id: agentId, updated_at: new Date().toISOString() })
        .eq('id', deviceId);

      // Agent 바인딩 상태 업데이트
      await supabase
        .from('ai_agents')
        .update({
          bound_device_id: deviceId,
          binding_status: 'bound',
          bound_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', agentId);

      // 이력 기록
      await supabase.from('device_history').insert({
        device_id: deviceId,
        agent_id: agentId,
        event_type: 'agent_migrated',
        notes: 'Agent binding restored after device replacement',
      });

      return NextResponse.json({ success: true, message: 'Binding restored' });
    }
    throw error;
  }

  return NextResponse.json({ success: true, data });
}


