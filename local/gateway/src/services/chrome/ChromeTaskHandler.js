/**
 * Chrome Task Handler
 *
 * Chrome 자동화 작업 처리 핸들러
 *
 * 지원 작업:
 * 1. CHROME_YOUTUBE_WATCH - YouTube 동영상 시청
 * 2. CHROME_YOUTUBE_SEARCH - YouTube 검색
 * 3. CHROME_NAVIGATE - URL 이동
 * 4. CHROME_SCREENSHOT - 스크린샷
 *
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

const EventEmitter = require('events');

/**
 * 작업 타입
 */
const TASK_TYPES = {
    YOUTUBE_WATCH: 'CHROME_YOUTUBE_WATCH',
    YOUTUBE_SEARCH: 'CHROME_YOUTUBE_SEARCH',
    NAVIGATE: 'CHROME_NAVIGATE',
    SCREENSHOT: 'CHROME_SCREENSHOT',
    EXECUTE_SCRIPT: 'CHROME_EXECUTE_SCRIPT'
};

/**
 * 작업 상태
 */
const TASK_STATUS = {
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

/**
 * 작업 정의
 * @typedef {Object} ChromeTask
 * @property {string} id - 작업 ID
 * @property {string} type - 작업 타입
 * @property {string} serial - 디바이스 시리얼
 * @property {Object} payload - 작업 데이터
 * @property {string} status - 작업 상태
 * @property {Date} createdAt - 생성 시간
 * @property {Date} startedAt - 시작 시간
 * @property {Date} completedAt - 완료 시간
 * @property {Object} result - 결과 데이터
 * @property {string} error - 에러 메시지
 */

class ChromeTaskHandler extends EventEmitter {
    /**
     * @param {Object} options
     * @param {Object} options.chromeService - Chrome 서비스 인스턴스
     * @param {Object} options.logger - Logger 인스턴스
     * @param {number} options.maxConcurrent - 최대 동시 작업 수
     */
    constructor(options = {}) {
        super();

        this.chromeService = options.chromeService;
        this.logger = options.logger || console;
        this.maxConcurrent = options.maxConcurrent || 10;

        /** @type {Map<string, ChromeTask>} */
        this._tasks = new Map();

        /** @type {Set<string>} */
        this._runningTasks = new Set();

        // 통계
        this._stats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            averageDuration: 0
        };
    }

    /**
     * 작업 제출
     * @param {ChromeTask} task
     * @returns {Promise<string>} 작업 ID
     */
    async submit(task) {
        const taskId = task.id || this._generateId();

        const fullTask = {
            id: taskId,
            type: task.type,
            serial: task.serial,
            payload: task.payload || {},
            status: TASK_STATUS.PENDING,
            createdAt: new Date(),
            startedAt: null,
            completedAt: null,
            result: null,
            error: null
        };

        this._tasks.set(taskId, fullTask);
        this._stats.totalTasks++;

        this.logger.info('[ChromeTaskHandler] Task submitted', {
            taskId,
            type: task.type,
            serial: task.serial
        });

        this.emit('taskSubmitted', fullTask);

        // 바로 실행
        this._executeTask(taskId);

        return taskId;
    }

    /**
     * 작업 상태 조회
     * @param {string} taskId
     * @returns {ChromeTask|null}
     */
    getTask(taskId) {
        return this._tasks.get(taskId) || null;
    }

    /**
     * 모든 작업 목록
     * @returns {Array<ChromeTask>}
     */
    listTasks() {
        return Array.from(this._tasks.values());
    }

    /**
     * 통계 조회
     * @returns {Object}
     */
    getStats() {
        return { ...this._stats };
    }

    /**
     * 작업 실행
     * @param {string} taskId
     */
    async _executeTask(taskId) {
        const task = this._tasks.get(taskId);
        if (!task) return;

        // 동시 실행 제한
        if (this._runningTasks.size >= this.maxConcurrent) {
            this.logger.info('[ChromeTaskHandler] Max concurrent reached, waiting', { taskId });
            setTimeout(() => this._executeTask(taskId), 1000);
            return;
        }

        task.status = TASK_STATUS.RUNNING;
        task.startedAt = new Date();
        this._runningTasks.add(taskId);

        this.emit('taskStarted', task);

        try {
            let result;

            switch (task.type) {
                case TASK_TYPES.YOUTUBE_WATCH:
                    result = await this._handleYouTubeWatch(task);
                    break;

                case TASK_TYPES.YOUTUBE_SEARCH:
                    result = await this._handleYouTubeSearch(task);
                    break;

                case TASK_TYPES.NAVIGATE:
                    result = await this._handleNavigate(task);
                    break;

                case TASK_TYPES.SCREENSHOT:
                    result = await this._handleScreenshot(task);
                    break;

                case TASK_TYPES.EXECUTE_SCRIPT:
                    result = await this._handleExecuteScript(task);
                    break;

                default:
                    throw new Error(`Unknown task type: ${task.type}`);
            }

            task.status = TASK_STATUS.COMPLETED;
            task.result = result;
            task.completedAt = new Date();
            this._stats.completedTasks++;

            this.logger.info('[ChromeTaskHandler] Task completed', {
                taskId,
                type: task.type,
                duration: task.completedAt - task.startedAt
            });

            this.emit('taskCompleted', task);

        } catch (e) {
            task.status = TASK_STATUS.FAILED;
            task.error = e.message;
            task.completedAt = new Date();
            this._stats.failedTasks++;

            this.logger.error('[ChromeTaskHandler] Task failed', {
                taskId,
                type: task.type,
                error: e.message
            });

            this.emit('taskFailed', task);

        } finally {
            this._runningTasks.delete(taskId);
        }
    }

    /**
     * YouTube 시청 작업 처리
     */
    async _handleYouTubeWatch(task) {
        const { serial, payload } = task;
        const {
            videoId,
            searchKeyword,
            searchRank = 0,
            targetSeconds = 60,
            targetPercent = 0.7,
            shouldLike = false,
            shouldComment = false,
            commentText = '',
            shouldSubscribe = false
        } = payload;

        const { youtubeWeb } = this.chromeService;

        // 동영상으로 이동
        if (videoId) {
            await youtubeWeb.goToVideo(serial, videoId);
        } else if (searchKeyword) {
            await youtubeWeb.search(serial, searchKeyword);
            const videoInfo = await youtubeWeb.selectVideoByRank(serial, searchRank);
            if (!videoInfo) {
                throw new Error('Video not found in search results');
            }
        } else {
            throw new Error('Either videoId or searchKeyword is required');
        }

        // 시청
        const result = await youtubeWeb.watchVideo(serial, {
            targetSeconds,
            targetPercent,
            shouldLike,
            shouldComment,
            commentText,
            shouldSubscribe
        });

        return result;
    }

    /**
     * YouTube 검색 작업 처리
     */
    async _handleYouTubeSearch(task) {
        const { serial, payload } = task;
        const { keyword, maxResults = 10 } = payload;

        const { youtubeWeb, chromeDriver } = this.chromeService;

        // 검색
        const count = await youtubeWeb.search(serial, keyword);

        // 검색 결과 수집
        const results = await chromeDriver.evaluate(serial, (selector, max) => {
            const videos = document.querySelectorAll(selector);
            const data = [];

            for (let i = 0; i < Math.min(videos.length, max); i++) {
                const video = videos[i];
                const titleEl = video.querySelector('#video-title');
                const channelEl = video.querySelector('#channel-name');
                const viewsEl = video.querySelector('#metadata-line span:first-child');
                const linkEl = video.querySelector('a#video-title, a#thumbnail');

                const href = linkEl?.href || '';
                const videoIdMatch = href.match(/[?&]v=([^&]+)/);

                data.push({
                    rank: i + 1,
                    videoId: videoIdMatch ? videoIdMatch[1] : null,
                    title: titleEl?.textContent?.trim() || '',
                    channel: channelEl?.textContent?.trim() || '',
                    views: viewsEl?.textContent?.trim() || ''
                });
            }

            return data;
        }, 'ytd-video-renderer', maxResults);

        return {
            keyword,
            totalResults: count,
            results
        };
    }

    /**
     * 네비게이션 작업 처리
     */
    async _handleNavigate(task) {
        const { serial, payload } = task;
        const { url, waitUntil = 'domcontentloaded' } = payload;

        const { chromeDriver } = this.chromeService;

        await chromeDriver.navigate(serial, url, { waitUntil });

        const currentUrl = await chromeDriver.getCurrentUrl(serial);
        const title = await chromeDriver.getTitle(serial);

        return { url: currentUrl, title };
    }

    /**
     * 스크린샷 작업 처리
     */
    async _handleScreenshot(task) {
        const { serial, payload } = task;
        const { fullPage = false, type = 'png' } = payload;

        const { chromeDriver } = this.chromeService;

        const screenshot = await chromeDriver.screenshot(serial, {
            fullPage,
            type
        });

        // Base64로 반환
        return {
            image: screenshot.toString('base64'),
            type,
            size: screenshot.length
        };
    }

    /**
     * JavaScript 실행 작업 처리
     */
    async _handleExecuteScript(task) {
        const { serial, payload } = task;
        const { script, args = [] } = payload;

        const { chromeDriver } = this.chromeService;

        const result = await chromeDriver.evaluate(serial, script, ...args);

        return { result };
    }

    /**
     * ID 생성
     */
    _generateId() {
        return `chrome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = ChromeTaskHandler;
module.exports.TASK_TYPES = TASK_TYPES;
module.exports.TASK_STATUS = TASK_STATUS;
