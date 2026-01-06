/**
 * Scheduler Service
 *
 * Laixi 그룹 기능을 활용한 배치 태스크 스케줄러
 * - 30초 주기 하트비트
 * - deviceIds: "all" 배치 실행
 * - 타임아웃 및 정리 로직
 */

const path = require('path');
const fs = require('fs');
const laixi = require('../lib/laixi');
const db = require('../lib/supabase');
const { state, startTask, cleanupTimedOut, getSnapshot, updateDevice } = require('../lib/state');

// 설정
const HEARTBEAT_INTERVAL = 30000; // 30초
const TASK_TIMEOUT = 300000; // 5분
const SCRIPT_PATH = process.env.SCRIPT_PATH || path.join(__dirname, '..', 'scripts', 'youtube-task.js');

let heartbeatTimer = null;

/**
 * 하트비트 - 30초마다 실행
 */
async function heartbeat() {
    const startTime = Date.now();
    console.log('─────────────────────────────────────────');
    console.log(`[Heartbeat] ${new Date().toISOString()}`);

    try {
        // 1. 타임아웃된 태스크 정리
        const cleaned = cleanupTimedOut(TASK_TIMEOUT);
        if (cleaned.length > 0) {
            console.log(`[Heartbeat] ${cleaned.length}개 타임아웃 태스크 정리`);
            // 실패 처리
            for (const { taskId } of cleaned) {
                await db.updateTaskStatus([taskId], 'failed', {
                    error_message: 'Task timeout (5 minutes)'
                });
            }
        }

        // 2. Laixi에서 디바이스 목록 조회
        const devices = await laixi.getDevices({ online: true, timeout: 5000 });
        console.log(`[Heartbeat] 연결된 디바이스: ${devices.length}대`);

        if (devices.length === 0) {
            console.log('[Heartbeat] 연결된 디바이스 없음, 스킵');
            return;
        }

        // 3. 디바이스 상태 업데이트 (배치)
        const deviceInfos = devices.map(d => ({
            serial: d.serial || d.id,
            battery: d.battery || 100,
            status: 'online'
        }));

        await db.batchHeartbeat(state.nodeId, deviceInfos);

        // 로컬 상태 업데이트
        for (const d of deviceInfos) {
            updateDevice(d.serial, d);
        }

        // 4. 유휴 디바이스 필터링 (현재 태스크 없는 디바이스)
        const idleDevices = deviceInfos.filter(d => !state.running.has(d.serial));
        console.log(`[Heartbeat] 유휴 디바이스: ${idleDevices.length}대`);

        if (idleDevices.length === 0) {
            console.log('[Heartbeat] 유휴 디바이스 없음, 스킵');
            return;
        }

        // 5. 대기 중인 태스크 조회
        const pendingTasks = await db.getPendingTasks(idleDevices.length);
        console.log(`[Heartbeat] 대기 태스크: ${pendingTasks.length}개`);

        if (pendingTasks.length === 0) {
            console.log('[Heartbeat] 대기 태스크 없음');
            return;
        }

        // 6. 태스크 할당 및 실행
        await assignAndExecuteTasks(idleDevices, pendingTasks);

        const elapsed = Date.now() - startTime;
        console.log(`[Heartbeat] 완료 (${elapsed}ms)`);

    } catch (err) {
        console.error('[Heartbeat] 오류:', err.message);
    }
}

/**
 * 태스크 할당 및 배치 실행
 *
 * @param {Array} idleDevices - 유휴 디바이스 목록
 * @param {Array} tasks - 대기 태스크 목록
 */
async function assignAndExecuteTasks(idleDevices, tasks) {
    const assignments = [];

    // 태스크-디바이스 매칭
    for (let i = 0; i < Math.min(idleDevices.length, tasks.length); i++) {
        const device = idleDevices[i];
        const task = tasks[i];

        assignments.push({
            serial: device.serial,
            task: task
        });

        // 로컬 상태 업데이트
        startTask(device.serial, task.id);

        // DB 상태 업데이트
        await db.assignTaskToDevice(task.id, device.serial);
    }

    if (assignments.length === 0) {
        return;
    }

    console.log(`[Scheduler] ${assignments.length}개 태스크 할당`);

    // 배치 실행 준비
    const deviceIds = assignments.map(a => a.serial).join(',');

    // 스크립트 파일 존재 확인
    if (!fs.existsSync(SCRIPT_PATH)) {
        console.error(`[Scheduler] 스크립트 파일 없음: ${SCRIPT_PATH}`);

        // 할당된 태스크 실패 처리
        for (const { task } of assignments) {
            await db.updateTaskStatus([task.id], 'failed', {
                error_message: 'Script file not found'
            });
        }
        return;
    }

    // Laixi 배치 실행
    const success = await laixi.executeScript(deviceIds, SCRIPT_PATH, {
        timeout: 30000
    });

    if (success) {
        console.log(`[Scheduler] 배치 실행 성공: ${deviceIds}`);

        // 태스크 상태를 running으로 업데이트
        const taskIds = assignments.map(a => a.task.id);
        await db.updateTaskStatus(taskIds, 'running');
    } else {
        console.error('[Scheduler] 배치 실행 실패');

        // 실패한 태스크 상태 복구
        for (const { serial, task } of assignments) {
            state.running.delete(serial);
            await db.updateTaskStatus([task.id], 'pending');
        }
    }
}

/**
 * 단일 디바이스 태스크 실행 (폴백용)
 *
 * @param {string} serial - 디바이스 시리얼
 * @param {Object} task - 태스크 정보
 */
async function runSingleTask(serial, task) {
    console.log(`[Scheduler] 단일 실행: ${serial} -> ${task.id}`);

    // 환경 변수 주입
    const callbackUrl = `http://${getLocalIp()}:${process.env.CALLBACK_PORT || 3000}/callback`;

    const envInjection = `
var $env = {
    TASK_ID: "${task.id}",
    PERSONA_ID: "${task.persona_id || ''}",
    VIDEO_URL: "${task.video_url}",
    VIDEO_TITLE: "${task.video_title || ''}",
    TARGET_DURATION: ${task.target_duration || 60},
    SHOULD_LIKE: ${task.should_like || false},
    SHOULD_COMMENT: ${task.should_comment || false},
    COMMENT_TEXT: "${task.comment_text || ''}",
    CALLBACK_URL: "${callbackUrl}",
    DEVICE_SERIAL: "${serial}"
};
`;

    // 스크립트 읽기 및 주입
    const scriptTemplate = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const finalScript = envInjection + '\n' + scriptTemplate;

    // 개별 실행
    const success = await laixi.runScriptOnDevice(serial, finalScript, {
        name: `task-${task.id}.js`,
        timeout: 30000
    });

    if (success) {
        startTask(serial, task.id);
        await db.updateTaskStatus([task.id], 'running');
    } else {
        await db.updateTaskStatus([task.id], 'failed', {
            error_message: 'Failed to start script'
        });
    }

    return success;
}

/**
 * 로컬 IP 조회
 */
function getLocalIp() {
    const os = require('os');
    const nets = os.networkInterfaces();

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

/**
 * 스케줄러 시작
 */
function start() {
    console.log('═══════════════════════════════════════════');
    console.log('[Scheduler] 시작');
    console.log(`  Node ID: ${state.nodeId}`);
    console.log(`  하트비트 주기: ${HEARTBEAT_INTERVAL}ms`);
    console.log(`  태스크 타임아웃: ${TASK_TIMEOUT}ms`);
    console.log(`  스크립트 경로: ${SCRIPT_PATH}`);
    console.log('═══════════════════════════════════════════');

    // 즉시 1회 실행
    heartbeat();

    // 주기적 실행
    heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL);
}

/**
 * 스케줄러 중지
 */
function stop() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        console.log('[Scheduler] 중지됨');
    }
}

/**
 * 상태 조회
 */
function getStatus() {
    return {
        running: heartbeatTimer !== null,
        ...getSnapshot()
    };
}

module.exports = {
    start,
    stop,
    heartbeat,
    getStatus,
    runSingleTask
};
