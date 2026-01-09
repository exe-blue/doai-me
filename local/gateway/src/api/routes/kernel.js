/**
 * Kernel API Router
 * YouTube 자동화를 위한 Kernel 엔드포인트
 *
 * 현재는 Placeholder - 추후 Chrome Automation 또는 Kernel API 연동
 *
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const Logger = require('../../utils/logger');

const logger = new Logger();

/**
 * GET /api/kernel/youtube
 * Kernel 설정 상태 확인
 */
router.get('/youtube', (req, res) => {
    const kernelConfigured = !!process.env.KERNEL_API_KEY;
    res.json({ kernelConfigured });
});

/**
 * POST /api/kernel/youtube
 * YouTube 자동화 실행 (like, comment, subscribe)
 *
 * Request Body:
 * {
 *   "action": "like" | "comment" | "subscribe",
 *   "videoId": "dQw4w9WgXcQ",
 *   "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
 *   "comment": "Great video!" (optional, for comment action)
 * }
 *
 * NOTE: 현재는 placeholder - 실제 Kernel API 연동 필요
 */
router.post('/youtube', async (req, res) => {
    const { action, videoId, channelId, comment } = req.body;
    const startTime = Date.now();

    // Check if Kernel is configured
    if (!process.env.KERNEL_API_KEY) {
        return res.json({
            success: false,
            error: 'KERNEL_NOT_CONFIGURED',
            data: { error: 'Kernel API key not configured' }
        });
    }

    try {
        logger.info(`[Kernel] YouTube ${action} requested`, {
            action,
            videoId,
            channelId,
            comment: comment?.substring(0, 20)
        });

        // TODO: 실제 Kernel API 호출 또는 Chrome Automation 실행
        // 현재는 시뮬레이션
        const totalDuration = Date.now() - startTime;

        res.json({
            success: true,
            totalDuration,
            message: `${action} action simulated (Kernel integration pending)`
        });

    } catch (error) {
        logger.error(`[Kernel] YouTube ${action} failed`, { error: error.message });
        res.json({
            success: false,
            error: error.message,
            data: { error: error.message }
        });
    }
});

module.exports = router;
