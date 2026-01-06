/**
 * Heartbeat Service
 *
 * 30초 주기로 Supabase에 상태 보고 + 태스크 할당 수신
 * EventEmitter 기반 루프 방지 아키텍처
 *
 * @fires new-task - 새 태스크 할당 시 발행
 * @fires device-update - 디바이스 상태 변경 시 발행
 */

const { EventEmitter } = require('events');
const laixi = require('../lib/laixi');
const db = require('../lib/supabase');
const { state, updateDevice, cleanupTimedOut, getSnapshot } = require('../lib/state');

const HEARTBEAT_INTERVAL = 30000; // 30초
const TASK_TIMEOUT = 300000; // 5분

class HeartbeatService extends EventEmitter {
    constructor() {
        super();
        this.timer = null;
        this.running = false;
    }

    /**
     * 서비스 시작
     */
    start() {
        if (this.running) {
            console.warn('[Heartbeat] 이미 실행 중');
            return;
        }

        console.log('═══════════════════════════════════════════');
        console.log('[Heartbeat] 서비스 시작');
        console.log(`  Node ID: ${state.nodeId}`);
        console.log(`  주기: ${HEARTBEAT_INTERVAL}ms`);
        console.log('═══════════════════════════════════════════');

        this.running = true;

        // 즉시 1회 실행
        this.tick();

        // 주기적 실행
        this.timer = setInterval(() => this.tick(), HEARTBEAT_INTERVAL);
    }

    /**
     * 서비스 중지
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.running = false;
        console.log('[Heartbeat] 서비스 중지됨');
    }

    /**
     * 하트비트 틱 - 상태 보고만 담당
     * 태스크 실행은 이벤트로 위임 (루프 방지)
     */
    async tick() {
        const startTime = Date.now();
        console.log('─────────────────────────────────────────');
        console.log(`[Heartbeat] ${new Date().toISOString()}`);

        try {
            // 1. 타임아웃된 태스크 정리
            const cleaned = cleanupTimedOut(TASK_TIMEOUT);
            if (cleaned.length > 0) {
                console.log(`[Heartbeat] ${cleaned.length}개 타임아웃 태스크 정리`);
                this.emit('tasks-timeout', cleaned);
            }

            // 2. Laixi에서 디바이스 목록 조회
            const devices = await laixi.getDevices({ online: true, timeout: 5000 });
            console.log(`[Heartbeat] 연결된 디바이스: ${devices.length}대`);

            if (devices.length === 0) {
                console.log('[Heartbeat] 연결된 디바이스 없음');
                return;
            }

            // 3. 각 디바이스 하트비트 보고 (Promise.allSettled로 병렬 처리)
            const results = await Promise.allSettled(
                devices.map(d => this.reportDevice(d))
            );

            // 4. 결과 처리 - 태스크가 할당된 경우 이벤트 발행
            results.forEach((result, i) => {
                const device = devices[i];
                const serial = device.serial || device.id;

                if (result.status === 'fulfilled' && result.value) {
                    const response = result.value;

                    // 디바이스 상태 업데이트
                    updateDevice(serial, {
                        battery: device.battery || 100,
                        status: 'online'
                    });

                    // 새 태스크가 있으면 이벤트 발행 (실행은 TaskRunner가 담당)
                    if (response.task) {
                        this.emit('new-task', {
                            serial,
                            task: response.task,
                            personaId: response.persona_id
                        });
                    }
                } else if (result.status === 'rejected') {
                    console.error(`[Heartbeat] ${serial} 보고 실패:`, result.reason?.message);
                }
            });

            const elapsed = Date.now() - startTime;
            console.log(`[Heartbeat] 완료 (${elapsed}ms)`);

        } catch (err) {
            console.error('[Heartbeat] 오류:', err.message);
            this.emit('error', err);
        }
    }

    /**
     * 단일 디바이스 하트비트 보고
     * @param {Object} device - { serial, battery, ... }
     * @returns {Promise<Object>} - Supabase 응답
     */
    async reportDevice(device) {
        const serial = device.serial || device.id;
        const battery = device.battery || 100;

        // device_heartbeat RPC 호출
        const response = await db.deviceHeartbeat(
            state.nodeId,
            serial,
            { battery, status: 'online' }
        );

        return response;
    }

    /**
     * 상태 조회
     */
    getStatus() {
        return {
            running: this.running,
            ...getSnapshot()
        };
    }
}

// 싱글톤 인스턴스
const heartbeatService = new HeartbeatService();

module.exports = heartbeatService;
