/**
 * Video Queue API Router
 * Work 페이지를 위한 영상 등록 및 디스패치
 *
 * Endpoints:
 * - POST /api/v1/video/register - 영상 등록 및 전체 디바이스에 디스패치
 * - GET /api/v1/video/queue - 대기열 조회
 * - POST /api/v1/dispatch/trigger - 특정 큐 아이템 디스패치 트리거
 *
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Logger = require('../../utils/logger');

const logger = new Logger();

// MESSAGE_TYPE for WATCH_VIDEO_BY_TITLE
const WATCH_VIDEO_BY_TITLE = 'WATCH_VIDEO_BY_TITLE';

/**
 * POST /api/v1/video/register
 * 영상 등록 및 모든 디바이스에 디스패치
 *
 * Request Body:
 * {
 *   "videoId": "dQw4w9WgXcQ",
 *   "title": "Video Title",
 *   "thumbnail": "https://...",
 *   "searchMethod": "title", // 'title' or 'url'
 *   "targetDevicePercent": 1.0
 * }
 */
router.post('/register', async (req, res) => {
    const { discoveryManager, deviceTracker, commander } = req.context;
    const { videoId, title, thumbnail, channelTitle, duration, searchMethod = 'title', targetDevicePercent = 1.0 } = req.body;

    try {
        // 요청 검증
        if (!videoId) {
            return res.status(400).json({
                success: false,
                error: 'videoId is required'
            });
        }

        if (!title && searchMethod === 'title') {
            return res.status(400).json({
                success: false,
                error: 'title is required for title search method'
            });
        }

        // 큐 아이템 ID 생성
        const queueItemId = `video_${uuidv4().substring(0, 8)}`;
        const registeredAt = new Date().toISOString();

        // 대상 디바이스 목록 가져오기
        let allDevices = [];

        // DiscoveryManager 우선 사용
        if (discoveryManager) {
            allDevices = discoveryManager.getOnlineDevices().map(d => ({
                id: d.serial,
                serial: d.serial,
                status: 'ONLINE'
            }));
        }

        // DeviceTracker 폴백
        if (allDevices.length === 0 && deviceTracker) {
            allDevices = deviceTracker.getHealthyDevices();
        }

        if (allDevices.length === 0) {
            logger.warn('[VideoAPI] 가용 디바이스 없음');
            return res.status(503).json({
                success: false,
                error: 'No available devices',
                queueItemId
            });
        }

        // 디바이스 비율에 따라 선택
        const targetCount = Math.ceil(allDevices.length * targetDevicePercent);
        const targetDevices = allDevices.slice(0, targetCount);

        logger.info('[VideoAPI] 영상 등록', {
            queueItemId,
            videoId,
            title: title?.substring(0, 30),
            searchMethod,
            targetDevices: targetDevices.length,
            totalDevices: allDevices.length
        });

        // 메시지 구성
        const message = {
            type: WATCH_VIDEO_BY_TITLE,
            priority: 3, // 높은 우선순위
            dispatch_id: queueItemId,
            dispatched_at: registeredAt,
            payload: {
                queue_item_id: queueItemId,
                video_id: videoId,
                title: title,
                thumbnail: thumbnail,
                channel_title: channelTitle,
                duration: duration,
                search_method: searchMethod,
                min_watch_seconds: 30,
                max_watch_seconds: 180,
                like_probability: 0.1,
                comment_probability: 0.02
            }
        };

        // 비동기 디스패치 (즉시 응답 후 백그라운드에서 전송)
        const sentTo = [];
        const failed = [];

        // 동시 전송 (배치로 처리)
        const BATCH_SIZE = 50;

        for (let i = 0; i < targetDevices.length; i += BATCH_SIZE) {
            const batch = targetDevices.slice(i, i + BATCH_SIZE);

            const batchPromises = batch.map(async (device) => {
                try {
                    await sendVideoCommand(device, message, commander, logger);
                    sentTo.push(device.id || device.serial);
                } catch (e) {
                    logger.warn('[VideoAPI] 디바이스 전송 실패', {
                        device: device.id || device.serial,
                        error: e.message
                    });
                    failed.push({
                        device_id: device.id || device.serial,
                        error: e.message
                    });
                }
            });

            await Promise.all(batchPromises);

            // 배치 간 짧은 딜레이 (부하 분산)
            if (i + BATCH_SIZE < targetDevices.length) {
                await sleep(100);
            }
        }

        logger.info('[VideoAPI] 디스패치 완료', {
            queueItemId,
            sentCount: sentTo.length,
            failedCount: failed.length
        });

        res.json({
            success: true,
            data: {
                queue_item_id: queueItemId,
                video_id: videoId,
                title,
                search_method: searchMethod,
                sent_to: sentTo.length,
                failed: failed.length,
                total_target: targetDevices.length,
                registered_at: registeredAt
            }
        });

    } catch (e) {
        logger.error('[VideoAPI] 등록 실패', {
            error: e.message,
            stack: e.stack
        });
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            message: e.message
        });
    }
});

/**
 * POST /api/v1/dispatch/trigger
 * 특정 큐 아이템에 대해 디스패치 트리거 (웹앱에서 호출)
 */
router.post('/dispatch/trigger', async (req, res) => {
    const { queueItemId } = req.body;

    // 이 엔드포인트는 웹앱에서 호출되지만,
    // 실제로는 /register가 즉시 디스패치하므로
    // 여기서는 확인용 응답만 반환

    logger.info('[VideoAPI] 디스패치 트리거 요청', { queueItemId });

    res.json({
        success: true,
        message: 'Dispatch triggered (already handled by registration)',
        queueItemId
    });
});

/**
 * GET /api/v1/video/status/:queueItemId
 * 특정 큐 아이템의 진행 상태 조회
 */
router.get('/status/:queueItemId', async (req, res) => {
    const { queueItemId } = req.params;

    // TODO: 실제 DB 연동 시 execution_logs에서 조회
    // 현재는 기본 응답만 반환

    res.json({
        success: true,
        data: {
            queue_item_id: queueItemId,
            status: 'processing',
            message: 'Status tracking requires database integration'
        }
    });
});

/**
 * 디바이스에 영상 시청 명령 전송
 */
async function sendVideoCommand(device, message, commander, logger) {
    const serial = device.id || device.serial;

    // JSON 직렬화
    const messageJson = JSON.stringify(message);

    // 파일 경로
    const messagePath = `/sdcard/doai/inbox/${message.dispatch_id}.json`;

    // 디렉토리 생성
    await commander.shell(serial, 'mkdir -p /sdcard/doai/inbox');

    // 메시지 파일 저장
    await commander.writeFile(serial, messagePath, messageJson);

    // 브로드캐스트로 알림 (AutoX.js 수신)
    const broadcastCmd = [
        'am broadcast',
        '-a com.doai.intent.action.WATCH_VIDEO',
        `--es message_path "${messagePath}"`,
        `--es video_id "${message.payload.video_id}"`,
        `--es title "${encodeURIComponent(message.payload.title || '')}"`,
        `--es search_method "${message.payload.search_method}"`,
        `--ei priority ${message.priority}`
    ].join(' ');

    await commander.shell(serial, broadcastCmd);

    logger.debug('[VideoAPI] 명령 전송 완료', {
        serial,
        messageType: message.type,
        path: messagePath
    });
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = router;
