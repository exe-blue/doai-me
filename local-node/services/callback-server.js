/**
 * Callback Server
 *
 * AutoX.js 스크립트에서 태스크 완료 결과를 수신
 * - HTTP POST /callback
 * - 결과 파싱 및 DB 업데이트
 * - 상태 정리
 */

const express = require('express');
const db = require('../lib/supabase');
const { state, endTask, findSerialByTaskId, getSnapshot } = require('../lib/state');

const app = express();
app.use(express.json());

// 요청 로깅 미들웨어
app.use((req, res, next) => {
    if (req.path !== '/health') {
        console.log(`[Callback] ${req.method} ${req.path}`);
    }
    next();
});

/**
 * POST /callback
 * AutoX.js에서 태스크 완료 시 호출
 */
app.post('/callback', async (req, res) => {
    const {
        taskId,
        personaId,
        success,
        watchDuration,
        liked,
        commented,
        commentText,
        videoUrl,
        videoTitle,
        error,
        logs,
        deviceSerial
    } = req.body;

    console.log(`[Callback] 태스크 ${taskId} 결과 수신`);
    console.log(`  - 성공: ${success}`);
    console.log(`  - 시청 시간: ${watchDuration}초`);

    try {
        // 디바이스 시리얼 찾기
        const serial = deviceSerial || findSerialByTaskId(taskId);

        if (success) {
            // RPC로 완료 처리 (보상 계산 포함)
            const result = await db.supabase.rpc('complete_video_task', {
                p_task_id: taskId,
                p_persona_id: personaId,
                p_watch_duration: watchDuration || 0,
                p_liked: liked || false,
                p_commented: commented || false,
                p_comment_text: commentText || null,
                p_video_url: videoUrl || null,
                p_video_title: videoTitle || null
            });

            if (result.error) {
                console.error('[Callback] RPC 오류:', result.error.message);

                // 폴백: 직접 완료 처리
                await db.completeTask(taskId, {
                    success: true,
                    personaId,
                    watchDuration,
                    liked,
                    commented
                });
            } else {
                const data = result.data;
                console.log(`[Callback] 보상 지급: ${data.reward} 포인트`);
                console.log(`  - 새 잔액: ${data.new_balance}`);
                console.log(`  - 새 콘텐츠: ${data.is_new_content}`);
            }
        } else {
            // 실패 처리
            console.log(`[Callback] 태스크 실패: ${error}`);

            await db.completeTask(taskId, {
                success: false,
                error: error || 'Unknown error'
            });
        }

        // 로컬 상태 정리
        if (serial) {
            endTask(serial);
            console.log(`[Callback] 상태 정리: ${serial}`);
        }

        // 로그 저장 (선택적)
        if (logs && logs.length > 0) {
            console.log(`[Callback] 로그: ${logs.slice(0, 200)}...`);
        }

        res.json({
            success: true,
            taskId: taskId,
            message: 'Callback processed'
        });

    } catch (err) {
        console.error('[Callback] 처리 오류:', err.message);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * GET /health
 * 헬스체크
 */
app.get('/health', (req, res) => {
    const snapshot = getSnapshot();

    res.json({
        status: 'ok',
        nodeId: state.nodeId,
        runningTasks: snapshot.runningCount,
        deviceCount: snapshot.deviceCount,
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /status
 * 상세 상태 조회
 */
app.get('/status', (req, res) => {
    const snapshot = getSnapshot();

    res.json({
        nodeId: snapshot.nodeId,
        devices: snapshot.deviceCount,
        running: snapshot.running,
        pending: snapshot.pendingCount,
        locks: snapshot.lockCount,
        batchRunning: snapshot.batchRunning
    });
});

/**
 * POST /force-complete
 * 강제 완료 (디버깅용)
 */
app.post('/force-complete', async (req, res) => {
    const { taskId, serial } = req.body;

    if (!taskId && !serial) {
        return res.status(400).json({
            success: false,
            error: 'taskId or serial required'
        });
    }

    try {
        let targetSerial = serial;

        if (taskId && !serial) {
            targetSerial = findSerialByTaskId(taskId);
        }

        if (targetSerial) {
            endTask(targetSerial);
            console.log(`[Callback] 강제 완료: ${targetSerial}`);
        }

        if (taskId) {
            await db.updateTaskStatus([taskId], 'failed', {
                error_message: 'Force completed'
            });
        }

        res.json({
            success: true,
            serial: targetSerial,
            taskId: taskId
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * 서버 시작
 */
function start(port = 3000) {
    const server = app.listen(port, () => {
        console.log('═══════════════════════════════════════════');
        console.log('[Callback Server] 시작');
        console.log(`  포트: ${port}`);
        console.log(`  엔드포인트:`);
        console.log(`    POST /callback - 태스크 완료 콜백`);
        console.log(`    GET  /health   - 헬스체크`);
        console.log(`    GET  /status   - 상세 상태`);
        console.log(`    POST /force-complete - 강제 완료`);
        console.log('═══════════════════════════════════════════');
    });

    return server;
}

module.exports = { app, start };
