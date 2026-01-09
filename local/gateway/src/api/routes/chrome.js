/**
 * Chrome Automation API Routes
 *
 * Puppeteer 기반 Chrome 자동화 API
 *
 * 엔드포인트:
 * - GET  /api/chrome/status         - Chrome 서비스 상태
 * - GET  /api/chrome/connections    - 연결 목록
 * - POST /api/chrome/connect        - 디바이스 연결
 * - POST /api/chrome/disconnect     - 디바이스 연결 해제
 * - POST /api/chrome/task           - 작업 제출
 * - GET  /api/chrome/task/:id       - 작업 상태 조회
 * - POST /api/chrome/youtube/watch  - YouTube 시청
 * - POST /api/chrome/youtube/search - YouTube 검색
 * - POST /api/chrome/navigate       - URL 이동
 * - POST /api/chrome/screenshot     - 스크린샷
 *
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

/**
 * Chrome 서비스 초기화
 * index.js에서 호출
 */
let chromeService = null;
let chromeTaskHandler = null;
let logger = console;

function initializeChromeRoutes(options = {}) {
    chromeService = options.chromeService;
    chromeTaskHandler = options.chromeTaskHandler;
    logger = options.logger || console;

    logger.info('[ChromeRouter] Initialized');
}

/**
 * GET /api/chrome/status
 * 서비스 상태 조회
 */
router.get('/status', (req, res) => {
    if (!chromeService) {
        return res.status(503).json({
            error: 'Chrome service not initialized',
            enabled: false
        });
    }

    const status = chromeService.getStatus();
    res.json({
        enabled: true,
        ...status,
        taskStats: chromeTaskHandler?.getStats() || {}
    });
});

/**
 * GET /api/chrome/connections
 * 연결 목록 조회
 */
router.get('/connections', (req, res) => {
    if (!chromeService) {
        return res.status(503).json({ error: 'Chrome service not initialized' });
    }

    const connections = chromeService.connectionManager.listConnections();
    res.json({ connections });
});

/**
 * POST /api/chrome/connect
 * 디바이스에 Chrome 연결
 * Body: { serial: string }
 */
router.post('/connect', async (req, res) => {
    if (!chromeService) {
        return res.status(503).json({ error: 'Chrome service not initialized' });
    }

    const { serial } = req.body;
    if (!serial) {
        return res.status(400).json({ error: 'serial is required' });
    }

    try {
        await chromeService.connectionManager.connect(serial);
        const state = chromeService.connectionManager.getState(serial);

        res.json({
            success: true,
            serial,
            state
        });
    } catch (e) {
        logger.error('[ChromeRouter] Connect failed', { serial, error: e.message });
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

/**
 * POST /api/chrome/disconnect
 * 디바이스 연결 해제
 * Body: { serial: string }
 */
router.post('/disconnect', async (req, res) => {
    if (!chromeService) {
        return res.status(503).json({ error: 'Chrome service not initialized' });
    }

    const { serial } = req.body;
    if (!serial) {
        return res.status(400).json({ error: 'serial is required' });
    }

    try {
        await chromeService.connectionManager.disconnect(serial);

        res.json({
            success: true,
            serial
        });
    } catch (e) {
        logger.error('[ChromeRouter] Disconnect failed', { serial, error: e.message });
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

/**
 * POST /api/chrome/task
 * 일반 Chrome 작업 제출
 * Body: { type: string, serial: string, payload: object }
 */
router.post('/task', async (req, res) => {
    if (!chromeTaskHandler) {
        return res.status(503).json({ error: 'Chrome task handler not initialized' });
    }

    const { type, serial, payload } = req.body;

    if (!type || !serial) {
        return res.status(400).json({ error: 'type and serial are required' });
    }

    try {
        const taskId = await chromeTaskHandler.submit({
            type,
            serial,
            payload: payload || {}
        });

        res.json({
            success: true,
            taskId
        });
    } catch (e) {
        logger.error('[ChromeRouter] Task submit failed', { type, serial, error: e.message });
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

/**
 * GET /api/chrome/task/:id
 * 작업 상태 조회
 */
router.get('/task/:id', (req, res) => {
    if (!chromeTaskHandler) {
        return res.status(503).json({ error: 'Chrome task handler not initialized' });
    }

    const task = chromeTaskHandler.getTask(req.params.id);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
});

/**
 * POST /api/chrome/youtube/watch
 * YouTube 동영상 시청
 * Body: {
 *   serial: string,
 *   videoId?: string,
 *   searchKeyword?: string,
 *   searchRank?: number,
 *   targetSeconds?: number,
 *   targetPercent?: number,
 *   shouldLike?: boolean,
 *   shouldComment?: boolean,
 *   commentText?: string,
 *   shouldSubscribe?: boolean
 * }
 */
router.post('/youtube/watch', async (req, res) => {
    if (!chromeTaskHandler) {
        return res.status(503).json({ error: 'Chrome task handler not initialized' });
    }

    const { serial, ...payload } = req.body;

    if (!serial) {
        return res.status(400).json({ error: 'serial is required' });
    }

    if (!payload.videoId && !payload.searchKeyword) {
        return res.status(400).json({ error: 'Either videoId or searchKeyword is required' });
    }

    try {
        const taskId = await chromeTaskHandler.submit({
            type: 'CHROME_YOUTUBE_WATCH',
            serial,
            payload
        });

        res.json({
            success: true,
            taskId,
            message: 'YouTube watch task submitted'
        });
    } catch (e) {
        logger.error('[ChromeRouter] YouTube watch failed', { serial, error: e.message });
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

/**
 * POST /api/chrome/youtube/search
 * YouTube 검색
 * Body: { serial: string, keyword: string, maxResults?: number }
 */
router.post('/youtube/search', async (req, res) => {
    if (!chromeTaskHandler) {
        return res.status(503).json({ error: 'Chrome task handler not initialized' });
    }

    const { serial, keyword, maxResults = 10 } = req.body;

    if (!serial || !keyword) {
        return res.status(400).json({ error: 'serial and keyword are required' });
    }

    try {
        const taskId = await chromeTaskHandler.submit({
            type: 'CHROME_YOUTUBE_SEARCH',
            serial,
            payload: { keyword, maxResults }
        });

        res.json({
            success: true,
            taskId,
            message: 'YouTube search task submitted'
        });
    } catch (e) {
        logger.error('[ChromeRouter] YouTube search failed', { serial, error: e.message });
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

/**
 * POST /api/chrome/navigate
 * URL 이동
 * Body: { serial: string, url: string, waitUntil?: string }
 */
router.post('/navigate', async (req, res) => {
    if (!chromeTaskHandler) {
        return res.status(503).json({ error: 'Chrome task handler not initialized' });
    }

    const { serial, url, waitUntil } = req.body;

    if (!serial || !url) {
        return res.status(400).json({ error: 'serial and url are required' });
    }

    try {
        const taskId = await chromeTaskHandler.submit({
            type: 'CHROME_NAVIGATE',
            serial,
            payload: { url, waitUntil }
        });

        res.json({
            success: true,
            taskId
        });
    } catch (e) {
        logger.error('[ChromeRouter] Navigate failed', { serial, error: e.message });
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

/**
 * POST /api/chrome/screenshot
 * 스크린샷 캡처
 * Body: { serial: string, fullPage?: boolean, type?: string }
 */
router.post('/screenshot', async (req, res) => {
    if (!chromeTaskHandler) {
        return res.status(503).json({ error: 'Chrome task handler not initialized' });
    }

    const { serial, fullPage = false, type = 'png' } = req.body;

    if (!serial) {
        return res.status(400).json({ error: 'serial is required' });
    }

    try {
        const taskId = await chromeTaskHandler.submit({
            type: 'CHROME_SCREENSHOT',
            serial,
            payload: { fullPage, type }
        });

        res.json({
            success: true,
            taskId
        });
    } catch (e) {
        logger.error('[ChromeRouter] Screenshot failed', { serial, error: e.message });
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

/**
 * POST /api/chrome/execute
 * JavaScript 실행
 * Body: { serial: string, script: string, args?: array }
 */
router.post('/execute', async (req, res) => {
    if (!chromeTaskHandler) {
        return res.status(503).json({ error: 'Chrome task handler not initialized' });
    }

    const { serial, script, args } = req.body;

    if (!serial || !script) {
        return res.status(400).json({ error: 'serial and script are required' });
    }

    try {
        const taskId = await chromeTaskHandler.submit({
            type: 'CHROME_EXECUTE_SCRIPT',
            serial,
            payload: { script, args: args || [] }
        });

        res.json({
            success: true,
            taskId
        });
    } catch (e) {
        logger.error('[ChromeRouter] Execute failed', { serial, error: e.message });
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

module.exports = router;
module.exports.initializeChromeRoutes = initializeChromeRoutes;
