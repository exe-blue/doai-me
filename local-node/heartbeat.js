/**
 * DoAi.Me Local Node Heartbeat
 *
 * ╔═══════════════════════════════════════════════════════════╗
 * ║  이 파일은 수정하지 않음 (모든 노드 동일)                    ║
 * ║  설정은 config.json에서 변경                               ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// 설정 로드 (config.json에서 읽어옴 - 수정 불필요)
// ═══════════════════════════════════════════════════════════

const CONFIG_PATH = path.join(__dirname, 'config.json');

if (!fs.existsSync(CONFIG_PATH)) {
  console.error('[FATAL] config.json 파일이 없습니다!');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

// 필수 설정 검증
if (!config.supabase?.url || config.supabase.url.includes('xxxxxxxxxx')) {
  console.error('[FATAL] config.json의 supabase.url을 설정하세요!');
  process.exit(1);
}
if (!config.supabase?.anon_key || config.supabase.anon_key.includes('xxxx')) {
  console.error('[FATAL] config.json의 supabase.anon_key를 설정하세요!');
  process.exit(1);
}

const supabase = createClient(config.supabase.url, config.supabase.anon_key);
const LAIXI_API = config.laixi?.api_base || 'http://127.0.0.1:8080';
const ADB_PATH = config.laixi?.adb_path || 'C:\\Program Files\\Laixi\\tools\\platform-tools\\adb.exe';
const NODE_ID = config.node_id || 'NODE_UNKNOWN';
const NODE_NAME = config.node_name || NODE_ID;

// ═══════════════════════════════════════════════════════════
// 로깅 (수정 불필요)
// ═══════════════════════════════════════════════════════════

const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${NODE_ID}] [${level}] ${message}`;

  if (Object.keys(data).length > 0) {
    console.log(logLine, JSON.stringify(data));
  } else {
    console.log(logLine);
  }

  const logFile = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  const fullLog = `${logLine} ${JSON.stringify(data)}\n`;
  fs.appendFileSync(logFile, fullLog);
}

// ═══════════════════════════════════════════════════════════
// Laixi API 함수 (수정 불필요)
// ═══════════════════════════════════════════════════════════

async function laixiRequest(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${LAIXI_API}${endpoint}`, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    log('ERROR', `Laixi API 오류: ${endpoint}`, { error: error.message });
    return null;
  }
}

// 연결된 디바이스 목록 가져오기
async function getConnectedDevices() {
  const result = await laixiRequest('/api/devices');

  if (result && Array.isArray(result.devices)) {
    return result.devices.map(d => ({
      serial: d.serial || d.id,
      status: d.status || 'unknown',
      model: d.model || d.name || 'Galaxy S9',
      battery: d.battery || null,
    }));
  }

  // Laixi API 실패 시 ADB 직접 조회 시도
  try {
    const { execSync } = require('child_process');
    const output = execSync(`"${ADB_PATH}" devices -l`, { encoding: 'utf-8' });
    const lines = output.split('\n').filter(l => l.includes('device') && !l.startsWith('List'));

    return lines.map(line => {
      const parts = line.split(/\s+/);
      const serial = parts[0];
      const modelMatch = line.match(/model:(\S+)/);
      return {
        serial,
        status: 'device',
        model: modelMatch ? modelMatch[1] : 'Unknown',
        battery: null,
      };
    });
  } catch (e) {
    log('ERROR', 'ADB 조회 실패', { error: e.message });
    return [];
  }
}

// 디바이스에서 스크립트 실행
async function runScript(serial, scriptName, params = {}) {
  const scriptPath = path.join(__dirname, 'scripts', scriptName);

  if (!fs.existsSync(scriptPath)) {
    log('ERROR', `스크립트 없음: ${scriptName}`);
    return { success: false, error: 'Script not found' };
  }

  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

  // Laixi를 통해 AutoX.js 스크립트 실행
  const result = await laixiRequest('/api/script/run', 'POST', {
    serial,
    script: scriptContent,
    params,
  });

  if (!result) {
    return { success: false, error: 'Laixi API failed' };
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// Supabase 연동 (수정 불필요)
// ═══════════════════════════════════════════════════════════

// 디바이스(페르소나) 상태 동기화
async function syncDevicesToSupabase(devices) {
  for (const device of devices) {
    try {
      const { error } = await supabase
        .from('personas')
        .upsert({
          device_serial: device.serial,
          node_id: NODE_ID,
          node_name: NODE_NAME,
          device_model: device.model,
          is_online: device.status === 'device',
          last_seen: new Date().toISOString(),
        }, {
          onConflict: 'device_serial'
        });

      if (error) {
        log('WARN', 'Persona upsert 실패', { serial: device.serial, error: error.message });
      }
    } catch (e) {
      log('ERROR', 'Supabase 연결 오류', { error: e.message });
    }
  }
}

// 이 노드에 할당된 대기 태스크 가져오기
async function getMyPendingTasks() {
  try {
    const { data, error } = await supabase
      .from('youtube_video_tasks')
      .select('*')
      .eq('status', 'pending')
      .eq('node_id', NODE_ID)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (e) {
    log('ERROR', '태스크 조회 실패', { error: e.message });
    return [];
  }
}

// 미할당 태스크 가져와서 이 노드에 할당
async function claimUnassignedTasks(availableDevices) {
  if (availableDevices.length === 0) return [];

  try {
    // 미할당 태스크 조회
    const { data, error } = await supabase
      .from('youtube_video_tasks')
      .select('*')
      .eq('status', 'pending')
      .is('node_id', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(availableDevices.length);

    if (error || !data || data.length === 0) return [];

    const claimed = [];

    for (let i = 0; i < data.length && i < availableDevices.length; i++) {
      const task = data[i];
      const device = availableDevices[i];

      // 원자적 업데이트 (동시성 방지)
      const { data: updated, error: updateError } = await supabase
        .from('youtube_video_tasks')
        .update({
          node_id: NODE_ID,
          device_serial: device.serial,
        })
        .eq('id', task.id)
        .is('node_id', null)
        .select()
        .single();

      if (!updateError && updated) {
        claimed.push(updated);
        log('INFO', `태스크 할당됨`, {
          task_id: task.id,
          video_id: task.video_id,
          device: device.serial
        });
      }
    }

    return claimed;
  } catch (e) {
    log('ERROR', '태스크 할당 실패', { error: e.message });
    return [];
  }
}

// 태스크 상태 업데이트
async function updateTaskStatus(taskId, status, result = {}) {
  const updateData = { status, ...result };

  if (status === 'running') {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'completed' || status === 'failed') {
    updateData.completed_at = new Date().toISOString();
  }

  try {
    const { error } = await supabase
      .from('youtube_video_tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) throw error;
  } catch (e) {
    log('ERROR', '태스크 상태 업데이트 실패', { taskId, error: e.message });
  }
}

// 활동 로그 기록
async function logActivity(personaId, activityType, details = {}) {
  try {
    await supabase.from('persona_activity_logs').insert({
      persona_id: personaId,
      activity_type: activityType,
      target_url: details.url,
      target_title: details.title,
      points_earned: details.points || 0,
      metadata: {
        node_id: NODE_ID,
        ...details.metadata,
      },
    });
  } catch (e) {
    log('WARN', '활동 로그 기록 실패', { error: e.message });
  }
}

// ═══════════════════════════════════════════════════════════
// 태스크 실행 (수정 불필요)
// ═══════════════════════════════════════════════════════════

async function executeTask(task) {
  const {
    id,
    video_url,
    video_id,
    device_serial,
    persona_id,
    target_duration,
    should_like,
    should_comment,
    comment_template
  } = task;

  log('INFO', `태스크 시작`, { task_id: id, video_id, device: device_serial });

  // 상태: running
  await updateTaskStatus(id, 'running');

  try {
    // YouTube 시청 스크립트 실행
    const result = await runScript(device_serial, 'youtube_watch.js', {
      video_url,
      video_id,
      duration: target_duration || 60,
      should_like: should_like || false,
      should_comment: should_comment || false,
      comment_text: comment_template || '',
    });

    if (result && result.success) {
      // 성공
      await updateTaskStatus(id, 'completed', {
        actual_duration: result.actual_duration || target_duration,
        liked: result.liked || false,
        commented: result.commented || false,
        comment_text: result.comment_text || null,
      });

      log('INFO', `태스크 완료`, { task_id: id, video_id, duration: result.actual_duration });

      // 활동 로그
      if (persona_id) {
        await logActivity(persona_id, 'youtube_watch', {
          url: video_url,
          title: video_id,
          points: Math.floor((target_duration || 60) / 10),
          metadata: { liked: result.liked, commented: result.commented },
        });
      }

    } else {
      throw new Error(result?.error || 'Script execution failed');
    }

  } catch (error) {
    // 실패
    await updateTaskStatus(id, 'failed', {
      error_message: error.message,
    });
    log('ERROR', `태스크 실패`, { task_id: id, video_id, error: error.message });
  }
}

// ═══════════════════════════════════════════════════════════
// 메인 루프 (수정 불필요)
// ═══════════════════════════════════════════════════════════

// 현재 실행 중인 태스크 추적
const runningTasks = new Set();

async function heartbeat() {
  log('INFO', `=== Heartbeat ===`);

  // 1. 연결된 디바이스 확인
  const devices = await getConnectedDevices();
  log('INFO', `디바이스 현황: ${devices.length}대 연결`);

  if (devices.length === 0) {
    log('WARN', '연결된 디바이스 없음');
    return;
  }

  // 2. Supabase에 디바이스 상태 동기화
  await syncDevicesToSupabase(devices);

  // 3. 온라인 디바이스만 필터
  const onlineDevices = devices.filter(d => d.status === 'device');
  log('INFO', `온라인 디바이스: ${onlineDevices.length}대`);

  if (onlineDevices.length === 0) {
    log('WARN', '온라인 디바이스 없음');
    return;
  }

  // 4. 사용 가능한 디바이스 (현재 태스크 실행 중이 아닌)
  const availableDevices = onlineDevices.filter(d => !runningTasks.has(d.serial));

  if (availableDevices.length === 0) {
    log('INFO', '모든 디바이스가 태스크 실행 중');
    return;
  }

  // 5. 내 노드에 할당된 대기 태스크 확인
  let pendingTasks = await getMyPendingTasks();

  // 6. 태스크가 없으면 미할당 태스크 가져오기
  if (pendingTasks.length === 0) {
    pendingTasks = await claimUnassignedTasks(availableDevices);
  }

  if (pendingTasks.length === 0) {
    log('INFO', '실행할 태스크 없음');
    return;
  }

  // 7. 태스크 실행 (병렬)
  for (const task of pendingTasks) {
    const device = availableDevices.find(d => d.serial === task.device_serial);

    if (device && !runningTasks.has(device.serial)) {
      runningTasks.add(device.serial);

      // 비동기 실행 (완료 후 Set에서 제거)
      executeTask(task)
        .finally(() => {
          runningTasks.delete(device.serial);
        });
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 시작 (수정 불필요)
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           DoAi.Me Local Node Heartbeat                    ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Node ID   : ${NODE_ID.padEnd(43)}║`);
  console.log(`║  Node Name : ${NODE_NAME.padEnd(43)}║`);
  console.log(`║  Laixi API : ${LAIXI_API.padEnd(43)}║`);
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  log('INFO', '로컬 노드 시작');

  // 초기 Heartbeat
  await heartbeat();

  // 주기적 Heartbeat
  const heartbeatInterval = config.heartbeat?.interval_ms || 30000;
  setInterval(heartbeat, heartbeatInterval);

  log('INFO', `Heartbeat 주기: ${heartbeatInterval / 1000}초`);
}

// 에러 핸들링
process.on('uncaughtException', (error) => {
  log('FATAL', '예외 발생', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason) => {
  log('FATAL', 'Promise 거부', { reason: String(reason) });
});

// 시작
main().catch(err => {
  log('FATAL', '시작 실패', { error: err.message });
  process.exit(1);
});
