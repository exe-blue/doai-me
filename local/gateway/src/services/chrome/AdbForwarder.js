/**
 * ADB Port Forwarder for Chrome DevTools Protocol
 *
 * Android Chrome의 remote debugging port를 로컬로 포워딩
 *
 * 동작 원리:
 * 1. Android에서 Chrome을 --remote-debugging-port=9222로 실행
 * 2. ADB forward로 로컬 포트 → Android 포트 연결
 * 3. Puppeteer가 로컬 포트로 CDP 연결
 *
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const EventEmitter = require('events');

const execAsync = promisify(exec);

/**
 * 포워딩 상태
 */
const FORWARD_STATE = {
    IDLE: 'IDLE',
    FORWARDING: 'FORWARDING',
    ERROR: 'ERROR'
};

/**
 * Chrome 패키지 정보
 */
const CHROME_PACKAGES = {
    CHROME: 'com.android.chrome',
    CHROME_BETA: 'com.chrome.beta',
    CHROME_DEV: 'com.chrome.dev',
    CHROME_CANARY: 'com.chrome.canary',
    CHROMIUM: 'org.chromium.chrome'
};

class AdbForwarder extends EventEmitter {
    /**
     * @param {Object} options
     * @param {Object} options.logger - Logger 인스턴스
     * @param {number} options.basePort - 시작 포트 번호 (기본: 9300)
     * @param {number} options.remotePort - Android Chrome debugging 포트 (기본: 9222)
     * @param {string} options.adbPath - ADB 실행 파일 경로
     */
    constructor(options = {}) {
        super();

        this.logger = options.logger || console;
        this.basePort = options.basePort || 9300;
        this.remotePort = options.remotePort || 9222;
        this.adbPath = options.adbPath || 'adb';

        // 디바이스별 포트 매핑: serial -> localPort
        this._portMap = new Map();

        // 사용 중인 포트 추적
        this._usedPorts = new Set();

        // 상태 추적: serial -> state
        this._states = new Map();
    }

    /**
     * 사용 가능한 다음 포트 번호 반환
     * @returns {number}
     */
    _getNextPort() {
        let port = this.basePort;
        while (this._usedPorts.has(port)) {
            port++;
            // 최대 포트 제한 (65535)
            if (port > 65000) {
                throw new Error('No available ports');
            }
        }
        return port;
    }

    /**
     * 디바이스의 Chrome 패키지 확인
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<string|null>} 설치된 Chrome 패키지명
     */
    async detectChromePackage(serial) {
        for (const [name, pkg] of Object.entries(CHROME_PACKAGES)) {
            try {
                const { stdout } = await execAsync(
                    `${this.adbPath} -s ${serial} shell pm list packages | grep ${pkg}`
                );
                if (stdout.trim()) {
                    this.logger.info(`[AdbForwarder] Chrome detected: ${name} (${pkg})`, { serial });
                    return pkg;
                }
            } catch (e) {
                // 패키지가 없으면 grep이 실패
                continue;
            }
        }
        return null;
    }

    /**
     * Chrome을 디버깅 모드로 실행
     * @param {string} serial - 디바이스 시리얼
     * @param {string} [chromePackage] - Chrome 패키지명 (자동 감지)
     * @returns {Promise<boolean>}
     */
    async launchChromeWithDebugging(serial, chromePackage = null) {
        try {
            // Chrome 패키지 확인
            const pkg = chromePackage || await this.detectChromePackage(serial);
            if (!pkg) {
                throw new Error('Chrome not installed on device');
            }

            // 기존 Chrome 프로세스 종료
            await execAsync(`${this.adbPath} -s ${serial} shell am force-stop ${pkg}`);
            await this._sleep(500);

            // Chrome을 debugging 모드로 실행
            // 방법 1: Command line flag (root 필요)
            // 방법 2: chrome://flags에서 활성화 (수동)
            // 방법 3: devtools_remote 소켓 직접 사용 (가장 호환성 좋음)

            // devtools_remote 소켓 사용 (Android Chrome 기본 지원)
            const launchCmd = `am start -n ${pkg}/com.google.android.apps.chrome.Main`;
            await execAsync(`${this.adbPath} -s ${serial} shell ${launchCmd}`);

            this.logger.info(`[AdbForwarder] Chrome launched`, { serial, package: pkg });

            // Chrome이 완전히 시작될 때까지 대기
            await this._sleep(2000);

            return true;
        } catch (e) {
            this.logger.error(`[AdbForwarder] Failed to launch Chrome`, {
                serial,
                error: e.message
            });
            return false;
        }
    }

    /**
     * Chrome DevTools 소켓 찾기
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<string|null>} 소켓 이름
     */
    async findChromeSocket(serial) {
        try {
            // Chrome의 devtools_remote 소켓 찾기
            const { stdout } = await execAsync(
                `${this.adbPath} -s ${serial} shell cat /proc/net/unix | grep devtools_remote`
            );

            const lines = stdout.trim().split('\n');

            // 우선순위: chrome_devtools_remote > 기타 devtools_remote
            // chrome_devtools_remote를 먼저 찾기
            for (const line of lines) {
                if (line.includes('@chrome_devtools_remote')) {
                    this.logger.info(`[AdbForwarder] Found Chrome socket: @chrome_devtools_remote`, { serial });
                    return '@chrome_devtools_remote';
                }
            }

            // 다른 devtools_remote 소켓 찾기 (fallback)
            for (const line of lines) {
                const match = line.match(/@[\w_]+devtools_remote[\w_]*/);
                if (match) {
                    const socket = match[0];
                    this.logger.info(`[AdbForwarder] Found Chrome socket: ${socket}`, { serial });
                    return socket;
                }
            }

            // 대안: chrome_devtools_remote 소켓
            const { stdout: stdout2 } = await execAsync(
                `${this.adbPath} -s ${serial} shell cat /proc/net/unix | grep chrome`
            );

            const lines2 = stdout2.trim().split('\n');
            for (const line of lines2) {
                const match = line.match(/@chrome_devtools_remote/);
                if (match) {
                    return '@chrome_devtools_remote';
                }
            }

            return null;
        } catch (e) {
            this.logger.warn(`[AdbForwarder] Socket search failed`, { serial, error: e.message });
            return null;
        }
    }

    /**
     * ADB 포트 포워딩 설정
     * @param {string} serial - 디바이스 시리얼
     * @param {string} [socket] - 타겟 소켓 (자동 감지)
     * @returns {Promise<{ localPort: number, success: boolean }>}
     */
    async forward(serial, socket = null) {
        try {
            // 이미 포워딩 중인지 확인
            if (this._portMap.has(serial)) {
                const existingPort = this._portMap.get(serial);
                this.logger.info(`[AdbForwarder] Already forwarding`, { serial, port: existingPort });
                return { localPort: existingPort, success: true };
            }

            // Chrome 소켓 찾기
            const targetSocket = socket || await this.findChromeSocket(serial);
            if (!targetSocket) {
                // 소켓을 찾지 못하면 기본 localabstract 사용
                this.logger.warn(`[AdbForwarder] Using default socket`, { serial });
            }

            // 로컬 포트 할당
            const localPort = this._getNextPort();

            // ADB forward 명령 실행
            // 방식 1: localabstract 소켓 (일반적)
            // 방식 2: tcp 포트 (--remote-debugging-port 사용 시)

            let forwardCmd;
            if (targetSocket) {
                // Unix 소켓으로 포워딩
                forwardCmd = `${this.adbPath} -s ${serial} forward tcp:${localPort} localabstract:${targetSocket.replace('@', '')}`;
            } else {
                // TCP 포트로 포워딩 (fallback)
                forwardCmd = `${this.adbPath} -s ${serial} forward tcp:${localPort} tcp:${this.remotePort}`;
            }

            await execAsync(forwardCmd);

            // 상태 업데이트
            this._portMap.set(serial, localPort);
            this._usedPorts.add(localPort);
            this._states.set(serial, FORWARD_STATE.FORWARDING);

            this.logger.info(`[AdbForwarder] Port forwarding established`, {
                serial,
                localPort,
                target: targetSocket || `tcp:${this.remotePort}`
            });

            this.emit('forward', { serial, localPort });

            return { localPort, success: true };

        } catch (e) {
            this._states.set(serial, FORWARD_STATE.ERROR);
            this.logger.error(`[AdbForwarder] Forward failed`, {
                serial,
                error: e.message
            });
            return { localPort: 0, success: false, error: e.message };
        }
    }

    /**
     * 포트 포워딩 해제
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<boolean>}
     */
    async unforward(serial) {
        try {
            const localPort = this._portMap.get(serial);
            if (!localPort) {
                return true; // 이미 해제됨
            }

            await execAsync(`${this.adbPath} -s ${serial} forward --remove tcp:${localPort}`);

            this._portMap.delete(serial);
            this._usedPorts.delete(localPort);
            this._states.set(serial, FORWARD_STATE.IDLE);

            this.logger.info(`[AdbForwarder] Forward removed`, { serial, localPort });
            this.emit('unforward', { serial, localPort });

            return true;
        } catch (e) {
            this.logger.error(`[AdbForwarder] Unforward failed`, { serial, error: e.message });
            return false;
        }
    }

    /**
     * 모든 포워딩 해제
     * @returns {Promise<void>}
     */
    async unforwardAll() {
        const serials = Array.from(this._portMap.keys());
        await Promise.all(serials.map(serial => this.unforward(serial)));
    }

    /**
     * 디바이스의 로컬 포트 조회
     * @param {string} serial - 디바이스 시리얼
     * @returns {number|null}
     */
    getLocalPort(serial) {
        return this._portMap.get(serial) || null;
    }

    /**
     * 포워딩 상태 조회
     * @param {string} serial - 디바이스 시리얼
     * @returns {string}
     */
    getState(serial) {
        return this._states.get(serial) || FORWARD_STATE.IDLE;
    }

    /**
     * 활성 포워딩 목록
     * @returns {Array<{ serial: string, localPort: number }>}
     */
    listForwards() {
        return Array.from(this._portMap.entries()).map(([serial, localPort]) => ({
            serial,
            localPort,
            state: this._states.get(serial)
        }));
    }

    /**
     * 연결 테스트 (Chrome DevTools JSON endpoint)
     * @param {number} localPort - 로컬 포트
     * @returns {Promise<boolean>}
     */
    async testConnection(localPort) {
        try {
            const http = require('http');

            return new Promise((resolve) => {
                const req = http.get(`http://127.0.0.1:${localPort}/json/version`, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const info = JSON.parse(data);
                            this.logger.info(`[AdbForwarder] Connection test passed`, {
                                localPort,
                                browser: info.Browser
                            });
                            resolve(true);
                        } catch {
                            resolve(false);
                        }
                    });
                });

                req.on('error', () => resolve(false));
                req.setTimeout(3000, () => {
                    req.destroy();
                    resolve(false);
                });
            });
        } catch {
            return false;
        }
    }

    /**
     * Sleep 유틸리티
     * @param {number} ms
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = AdbForwarder;
module.exports.FORWARD_STATE = FORWARD_STATE;
module.exports.CHROME_PACKAGES = CHROME_PACKAGES;
