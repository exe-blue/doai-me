/**
 * Chrome Automation Service - Main Export
 *
 * Puppeteer를 이용한 Android Chrome 자동화 서비스
 *
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

const AdbForwarder = require('./AdbForwarder');
const ConnectionManager = require('./ConnectionManager');
const ChromeDriver = require('./ChromeDriver');
const YouTubeWeb = require('./YouTubeWeb');

/**
 * Chrome Automation Service Factory
 *
 * @param {Object} options
 * @param {Object} options.logger - Logger 인스턴스
 * @param {Object} options.humanSimulator - 인간 행동 시뮬레이터
 * @param {number} options.basePort - ADB 포워딩 시작 포트
 * @param {number} options.maxConnections - 최대 동시 연결 수
 * @returns {Object} Chrome 자동화 서비스 객체
 */
function createChromeService(options = {}) {
    const logger = options.logger || console;

    // ADB Port Forwarder
    const forwarder = new AdbForwarder({
        logger,
        basePort: options.basePort || 9300,
        remotePort: options.remotePort || 9222,
        adbPath: options.adbPath || 'adb'
    });

    // Connection Manager
    const connectionManager = new ConnectionManager({
        logger,
        forwarder,
        connectionTimeout: options.connectionTimeout || 30000,
        idleTimeout: options.idleTimeout || 300000,
        healthCheckInterval: options.healthCheckInterval || 30000,
        maxConnections: options.maxConnections || 50
    });

    // Chrome Driver
    const chromeDriver = new ChromeDriver({
        connectionManager,
        logger,
        humanSimulator: options.humanSimulator,
        defaultTimeout: options.defaultTimeout || 30000
    });

    // YouTube Web Automation
    const youtubeWeb = new YouTubeWeb({
        chromeDriver,
        logger,
        humanSimulator: options.humanSimulator,
        useMobileVersion: options.useMobileVersion || false
    });

    return {
        forwarder,
        connectionManager,
        chromeDriver,
        youtubeWeb,

        /**
         * 서비스 시작
         */
        start() {
            connectionManager.start();
            logger.info('[ChromeService] Started');
        },

        /**
         * 서비스 중지
         */
        async stop() {
            await connectionManager.stop();
            await forwarder.unforwardAll();
            logger.info('[ChromeService] Stopped');
        },

        /**
         * 디바이스 연결 상태 조회
         */
        getStatus() {
            return {
                connections: connectionManager.listConnections(),
                forwards: forwarder.listForwards(),
                stats: connectionManager.getStats()
            };
        }
    };
}

module.exports = {
    createChromeService,
    AdbForwarder,
    ConnectionManager,
    ChromeDriver,
    YouTubeWeb
};
