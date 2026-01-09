/**
 * CDP Connection Manager for Multiple Android Devices
 *
 * Puppeteer 인스턴스를 여러 디바이스에 대해 관리
 *
 * 주요 기능:
 * 1. 디바이스별 Browser 인스턴스 풀링
 * 2. 연결 상태 모니터링 및 자동 재연결
 * 3. 리소스 정리 (메모리 관리)
 *
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

const puppeteer = require('puppeteer-core');
const EventEmitter = require('events');
const AdbForwarder = require('./AdbForwarder');

/**
 * 연결 상태
 */
const CONNECTION_STATE = {
    DISCONNECTED: 'DISCONNECTED',
    CONNECTING: 'CONNECTING',
    CONNECTED: 'CONNECTED',
    ERROR: 'ERROR'
};

/**
 * 브라우저 연결 정보
 * @typedef {Object} BrowserConnection
 * @property {string} serial - 디바이스 시리얼
 * @property {number} localPort - 로컬 포트
 * @property {import('puppeteer-core').Browser} browser - Puppeteer Browser 인스턴스
 * @property {string} state - 연결 상태
 * @property {Date} connectedAt - 연결 시간
 * @property {Date} lastActivity - 마지막 활동 시간
 */

class ConnectionManager extends EventEmitter {
    /**
     * @param {Object} options
     * @param {Object} options.logger - Logger 인스턴스
     * @param {AdbForwarder} options.forwarder - ADB 포워더 인스턴스
     * @param {number} options.connectionTimeout - 연결 타임아웃 (ms)
     * @param {number} options.idleTimeout - 유휴 타임아웃 (ms)
     * @param {number} options.healthCheckInterval - 상태 체크 간격 (ms)
     * @param {number} options.maxConnections - 최대 동시 연결 수
     */
    constructor(options = {}) {
        super();

        this.logger = options.logger || console;
        this.forwarder = options.forwarder || new AdbForwarder({ logger: this.logger });
        this.connectionTimeout = options.connectionTimeout || 30000;
        this.idleTimeout = options.idleTimeout || 300000; // 5분
        this.healthCheckInterval = options.healthCheckInterval || 30000;
        this.maxConnections = options.maxConnections || 50;

        /** @type {Map<string, BrowserConnection>} */
        this._connections = new Map();

        /** @type {Map<string, NodeJS.Timeout>} */
        this._idleTimers = new Map();

        this._healthCheckTimer = null;
        this._isShuttingDown = false;

        // 통계
        this._stats = {
            totalConnections: 0,
            activeConnections: 0,
            failedConnections: 0,
            reconnections: 0
        };
    }

    /**
     * 서비스 시작
     */
    start() {
        this._healthCheckTimer = setInterval(
            () => this._healthCheck(),
            this.healthCheckInterval
        );
        this.logger.info('[ConnectionManager] Started');
    }

    /**
     * 서비스 중지
     */
    async stop() {
        this._isShuttingDown = true;

        if (this._healthCheckTimer) {
            clearInterval(this._healthCheckTimer);
        }

        // 모든 연결 종료
        await this.disconnectAll();

        this.logger.info('[ConnectionManager] Stopped');
    }

    /**
     * 디바이스에 연결
     * @param {string} serial - 디바이스 시리얼
     * @param {Object} [options] - 연결 옵션
     * @returns {Promise<import('puppeteer-core').Browser>}
     */
    async connect(serial, options = {}) {
        // 이미 연결된 경우
        if (this._connections.has(serial)) {
            const conn = this._connections.get(serial);
            if (conn.state === CONNECTION_STATE.CONNECTED && conn.browser.isConnected()) {
                this._refreshIdleTimer(serial);
                return conn.browser;
            }
            // 연결이 끊어진 경우 재연결
            await this.disconnect(serial);
        }

        // 최대 연결 수 확인
        if (this._connections.size >= this.maxConnections) {
            // LRU 방식으로 가장 오래된 유휴 연결 제거
            await this._evictOldestIdle();
        }

        this._setConnectionState(serial, CONNECTION_STATE.CONNECTING);

        try {
            // 1. ADB 포트 포워딩
            const { localPort, success } = await this.forwarder.forward(serial);
            if (!success) {
                throw new Error('ADB forward failed');
            }

            // 2. Chrome이 실행 중인지 확인
            const isReady = await this.forwarder.testConnection(localPort);
            if (!isReady) {
                // Chrome 실행 시도
                this.logger.info('[ConnectionManager] Launching Chrome...', { serial });
                await this.forwarder.launchChromeWithDebugging(serial);
                await this._sleep(3000);

                // 재시도
                const retryReady = await this.forwarder.testConnection(localPort);
                if (!retryReady) {
                    throw new Error('Chrome not responding on debugging port');
                }
            }

            // 3. Puppeteer 연결
            const browserURL = `http://127.0.0.1:${localPort}`;

            this.logger.info('[ConnectionManager] Connecting to Chrome...', {
                serial,
                browserURL
            });

            const browser = await puppeteer.connect({
                browserURL,
                defaultViewport: options.viewport || null, // 디바이스 기본 뷰포트 사용
                timeout: this.connectionTimeout
            });

            // 연결 정보 저장
            const connection = {
                serial,
                localPort,
                browser,
                state: CONNECTION_STATE.CONNECTED,
                connectedAt: new Date(),
                lastActivity: new Date()
            };

            this._connections.set(serial, connection);
            this._stats.totalConnections++;
            this._stats.activeConnections = this._connections.size;

            // 유휴 타이머 시작
            this._startIdleTimer(serial);

            // 연결 해제 이벤트 핸들링
            browser.on('disconnected', () => {
                this.logger.warn('[ConnectionManager] Browser disconnected', { serial });
                this._handleDisconnect(serial);
            });

            this.logger.info('[ConnectionManager] Connected successfully', {
                serial,
                localPort,
                activeConnections: this._connections.size
            });

            this.emit('connect', { serial, localPort });

            return browser;

        } catch (e) {
            this._setConnectionState(serial, CONNECTION_STATE.ERROR);
            this._stats.failedConnections++;

            this.logger.error('[ConnectionManager] Connection failed', {
                serial,
                error: e.message
            });

            this.emit('error', { serial, error: e });
            throw e;
        }
    }

    /**
     * 디바이스 연결 해제
     * @param {string} serial - 디바이스 시리얼
     */
    async disconnect(serial) {
        const conn = this._connections.get(serial);
        if (!conn) return;

        this._clearIdleTimer(serial);

        try {
            if (conn.browser && conn.browser.isConnected()) {
                await conn.browser.disconnect();
            }
        } catch (e) {
            this.logger.warn('[ConnectionManager] Disconnect error', { serial, error: e.message });
        }

        // ADB 포워딩 해제
        await this.forwarder.unforward(serial);

        this._connections.delete(serial);
        this._stats.activeConnections = this._connections.size;

        this.logger.info('[ConnectionManager] Disconnected', { serial });
        this.emit('disconnect', { serial });
    }

    /**
     * 모든 연결 해제
     */
    async disconnectAll() {
        const serials = Array.from(this._connections.keys());
        await Promise.all(serials.map(serial => this.disconnect(serial)));
    }

    /**
     * 연결된 브라우저 가져오기
     * @param {string} serial - 디바이스 시리얼
     * @returns {import('puppeteer-core').Browser|null}
     */
    getBrowser(serial) {
        const conn = this._connections.get(serial);
        if (conn && conn.state === CONNECTION_STATE.CONNECTED) {
            this._refreshIdleTimer(serial);
            conn.lastActivity = new Date();
            return conn.browser;
        }
        return null;
    }

    /**
     * 새 페이지 생성
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<import('puppeteer-core').Page>}
     */
    async newPage(serial) {
        let browser = this.getBrowser(serial);
        if (!browser) {
            browser = await this.connect(serial);
        }

        const pages = await browser.pages();
        // 기존 빈 페이지가 있으면 재사용
        if (pages.length > 0 && pages[0].url() === 'about:blank') {
            return pages[0];
        }

        return browser.newPage();
    }

    /**
     * 연결 상태 조회
     * @param {string} serial - 디바이스 시리얼
     * @returns {string}
     */
    getState(serial) {
        const conn = this._connections.get(serial);
        return conn?.state || CONNECTION_STATE.DISCONNECTED;
    }

    /**
     * 연결 목록
     * @returns {Array<Object>}
     */
    listConnections() {
        return Array.from(this._connections.values()).map(conn => ({
            serial: conn.serial,
            localPort: conn.localPort,
            state: conn.state,
            connectedAt: conn.connectedAt,
            lastActivity: conn.lastActivity,
            isConnected: conn.browser?.isConnected() || false
        }));
    }

    /**
     * 통계 조회
     * @returns {Object}
     */
    getStats() {
        return { ...this._stats };
    }

    // ==================== Private Methods ====================

    /**
     * 연결 상태 설정
     */
    _setConnectionState(serial, state) {
        const conn = this._connections.get(serial);
        if (conn) {
            conn.state = state;
        }
    }

    /**
     * 연결 해제 처리
     */
    _handleDisconnect(serial) {
        const conn = this._connections.get(serial);
        if (conn) {
            conn.state = CONNECTION_STATE.DISCONNECTED;
        }

        this._clearIdleTimer(serial);
        this._connections.delete(serial);
        this._stats.activeConnections = this._connections.size;

        this.emit('disconnect', { serial, unexpected: true });
    }

    /**
     * 유휴 타이머 시작
     */
    _startIdleTimer(serial) {
        this._clearIdleTimer(serial);

        const timer = setTimeout(() => {
            this.logger.info('[ConnectionManager] Idle timeout, disconnecting', { serial });
            this.disconnect(serial);
        }, this.idleTimeout);

        this._idleTimers.set(serial, timer);
    }

    /**
     * 유휴 타이머 갱신
     */
    _refreshIdleTimer(serial) {
        const conn = this._connections.get(serial);
        if (conn) {
            conn.lastActivity = new Date();
        }
        this._startIdleTimer(serial);
    }

    /**
     * 유휴 타이머 제거
     */
    _clearIdleTimer(serial) {
        const timer = this._idleTimers.get(serial);
        if (timer) {
            clearTimeout(timer);
            this._idleTimers.delete(serial);
        }
    }

    /**
     * 가장 오래된 유휴 연결 제거
     */
    async _evictOldestIdle() {
        let oldest = null;
        let oldestTime = Date.now();

        for (const [serial, conn] of this._connections) {
            if (conn.lastActivity.getTime() < oldestTime) {
                oldestTime = conn.lastActivity.getTime();
                oldest = serial;
            }
        }

        if (oldest) {
            this.logger.info('[ConnectionManager] Evicting idle connection', { serial: oldest });
            await this.disconnect(oldest);
        }
    }

    /**
     * 상태 체크
     */
    async _healthCheck() {
        if (this._isShuttingDown) return;

        for (const [serial, conn] of this._connections) {
            try {
                if (!conn.browser.isConnected()) {
                    this.logger.warn('[ConnectionManager] Stale connection detected', { serial });
                    await this.disconnect(serial);
                }
            } catch (e) {
                this.logger.error('[ConnectionManager] Health check error', {
                    serial,
                    error: e.message
                });
            }
        }
    }

    /**
     * Sleep 유틸리티
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ConnectionManager;
module.exports.CONNECTION_STATE = CONNECTION_STATE;
