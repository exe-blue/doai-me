/**
 * Device Validator & Reconnection Script
 *
 * 기능:
 * 1. 폰보드 단위 검증 (20/40/60 단위)
 * 2. 불완전 연결 시 재연결 시도
 * 3. 킥오프 명령으로 실제 제어 검증
 *
 * @author DoAi.Me Team
 * @version 1.0.0
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ADB 경로 자동 감지
function findAdbPath() {
    const possiblePaths = [
        process.env.ADB_PATH,
        path.join(process.env.USERPROFILE || '', 'adb.exe'),
        path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
        'C:\\Users\\ChoiJoonho\\adb.exe',
        '/usr/bin/adb',
        '/usr/local/bin/adb'
    ].filter(Boolean);

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return 'adb'; // 기본값
}

// 설정
const CONFIG = {
    // 폰보드당 예상 디바이스 수
    BOARD_UNIT_SIZES: [20, 40, 60],
    // 최대 재연결 시도 횟수
    MAX_RECONNECT_ATTEMPTS: 5,
    // 재연결 대기 시간 (ms)
    RECONNECT_DELAY: 5000,
    // ADB 경로
    ADB_PATH: findAdbPath(),
    // 스크린샷 저장 경로
    SCREENSHOT_DIR: path.join(__dirname, '..', 'logs', 'screenshots'),
    // 킥오프 타임아웃 (ms)
    KICKOFF_TIMEOUT: 30000
};

// 로거
const logger = {
    info: (msg, data) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : ''),
    warn: (msg, data) => console.log(`[WARN] ${msg}`, data ? JSON.stringify(data) : ''),
    error: (msg, data) => console.log(`[ERROR] ${msg}`, data ? JSON.stringify(data) : ''),
    debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data ? JSON.stringify(data) : '')
};

/**
 * ADB 명령 실행
 */
function adb(args, options = {}) {
    const cmd = `${CONFIG.ADB_PATH} ${args}`;
    try {
        return execSync(cmd, {
            encoding: 'utf-8',
            timeout: options.timeout || 10000,
            ...options
        }).trim();
    } catch (e) {
        if (options.ignoreError) return '';
        throw e;
    }
}

/**
 * 연결된 디바이스 목록 조회
 */
function getConnectedDevices() {
    const output = adb('devices -l');
    const lines = output.split('\n').slice(1); // 첫 줄 "List of devices attached" 제외

    const devices = [];
    for (const line of lines) {
        if (!line.trim()) continue;

        const parts = line.split(/\s+/);
        const serial = parts[0];
        const status = parts[1];

        if (status === 'device') {
            const info = {
                serial,
                status,
                model: extractProperty(line, 'model:'),
                product: extractProperty(line, 'product:'),
                device: extractProperty(line, 'device:'),
                transportId: extractProperty(line, 'transport_id:')
            };
            devices.push(info);
        }
    }

    return devices;
}

function extractProperty(line, prefix) {
    const match = line.match(new RegExp(`${prefix}(\\S+)`));
    return match ? match[1] : null;
}

/**
 * 폰보드 단위 검증
 * @param {number} deviceCount - 연결된 디바이스 수
 * @param {number} expectedCount - 예상 디바이스 수 (선택)
 * @returns {{ valid: boolean, nearestUnit: number, missing: number, mode: string }}
 */
function validateBoardUnit(deviceCount, expectedCount = null) {
    // 예상 수가 명시되면 그 기준으로 검증
    if (expectedCount !== null) {
        const missing = expectedCount - deviceCount;
        return {
            valid: deviceCount >= expectedCount,
            nearestUnit: expectedCount,
            missing: missing > 0 ? missing : 0,
            mode: 'explicit'
        };
    }

    // 소규모 테스트 (10대 미만): 항상 허용
    if (deviceCount > 0 && deviceCount < 10) {
        return {
            valid: true,
            nearestUnit: deviceCount,
            missing: 0,
            mode: 'small_test'
        };
    }

    // 가장 가까운 단위 찾기
    let nearestUnit = CONFIG.BOARD_UNIT_SIZES[0];
    let minDiff = Infinity;

    for (const unit of CONFIG.BOARD_UNIT_SIZES) {
        // 현재 수에서 가장 가까운 단위의 배수 찾기
        const multiple = Math.ceil(deviceCount / unit);
        const expected = multiple * unit;
        const diff = expected - deviceCount;

        if (diff >= 0 && diff < minDiff) {
            minDiff = diff;
            nearestUnit = expected;
        }
    }

    // 디바이스가 없으면 첫 번째 단위 사용
    if (deviceCount === 0) {
        nearestUnit = CONFIG.BOARD_UNIT_SIZES[0];
    }

    // 정확히 단위의 배수인지 확인
    const valid = CONFIG.BOARD_UNIT_SIZES.some(unit => deviceCount % unit === 0 && deviceCount > 0);
    const missing = nearestUnit - deviceCount;

    return {
        valid,
        nearestUnit,
        missing: missing > 0 ? missing : 0,
        mode: 'board_unit'
    };
}

/**
 * 디바이스 재연결 시도
 */
async function attemptReconnection(expectedCount) {
    logger.info('디바이스 재연결 시도 시작', { expectedCount });

    for (let attempt = 1; attempt <= CONFIG.MAX_RECONNECT_ATTEMPTS; attempt++) {
        logger.info(`재연결 시도 ${attempt}/${CONFIG.MAX_RECONNECT_ATTEMPTS}`);

        // ADB 서버 재시작
        try {
            adb('kill-server', { ignoreError: true });
            await sleep(1000);
            adb('start-server');
            await sleep(2000);
        } catch (e) {
            logger.warn('ADB 서버 재시작 실패', { error: e.message });
        }

        // USB 재스캔 (Windows)
        if (process.platform === 'win32') {
            try {
                execSync('pnputil /scan-devices', { encoding: 'utf-8', timeout: 10000 });
            } catch (e) {
                // 무시
            }
        }

        await sleep(CONFIG.RECONNECT_DELAY);

        // 디바이스 수 확인
        const devices = getConnectedDevices();
        const validation = validateBoardUnit(devices.length);

        logger.info('재연결 결과', {
            attempt,
            connected: devices.length,
            expected: expectedCount,
            valid: validation.valid
        });

        if (validation.valid || devices.length >= expectedCount) {
            logger.info('재연결 성공!', { finalCount: devices.length });
            return { success: true, devices };
        }

        if (attempt < CONFIG.MAX_RECONNECT_ATTEMPTS) {
            logger.info(`${CONFIG.RECONNECT_DELAY}ms 후 재시도...`);
            await sleep(CONFIG.RECONNECT_DELAY);
        }
    }

    const finalDevices = getConnectedDevices();
    logger.warn('재연결 시도 완료 (목표 미달성)', {
        finalCount: finalDevices.length,
        expected: expectedCount
    });

    return { success: false, devices: finalDevices };
}

/**
 * 킥오프 검증 - 단일 디바이스
 * @param {string} serial - 디바이스 시리얼
 * @returns {{ success: boolean, steps: Array, error?: string }}
 */
async function kickoffVerifyDevice(serial) {
    const steps = [];
    const startTime = Date.now();

    logger.info('킥오프 검증 시작', { serial });

    try {
        // Step 1: 디바이스 응답 확인
        steps.push({ step: 'ping', status: 'running' });
        const pingResult = adb(`-s ${serial} shell echo "ping"`, { timeout: 5000 });
        if (pingResult !== 'ping') {
            throw new Error('디바이스 응답 없음');
        }
        steps[steps.length - 1].status = 'success';

        // Step 2: 화면 켜기
        steps.push({ step: 'wake', status: 'running' });
        adb(`-s ${serial} shell input keyevent KEYCODE_WAKEUP`);
        await sleep(500);
        steps[steps.length - 1].status = 'success';

        // Step 3: 화면 상태 확인
        steps.push({ step: 'screen_state', status: 'running' });
        const displayState = adb(`-s ${serial} shell dumpsys power | grep "Display Power"`, { ignoreError: true });
        const screenOn = displayState.includes('state=ON');
        steps[steps.length - 1].status = screenOn ? 'success' : 'warning';
        steps[steps.length - 1].data = { screenOn };

        // Step 4: 잠금 해제 시도 (스와이프)
        steps.push({ step: 'unlock_swipe', status: 'running' });
        adb(`-s ${serial} shell input swipe 540 1500 540 500`);
        await sleep(1000);
        steps[steps.length - 1].status = 'success';

        // Step 5: 현재 포커스 앱 확인
        steps.push({ step: 'check_focus', status: 'running' });
        const focusResult = adb(`-s ${serial} shell dumpsys window | grep mCurrentFocus`, { ignoreError: true });
        const isLocked = focusResult.includes('Keyguard') || focusResult.includes('StatusBar');
        steps[steps.length - 1].status = 'success';
        steps[steps.length - 1].data = { isLocked, focus: focusResult.substring(0, 100) };

        // Step 6: 테스트 앱 실행 (Settings)
        steps.push({ step: 'launch_test_app', status: 'running' });
        adb(`-s ${serial} shell am start -a android.settings.SETTINGS`);
        await sleep(2000);

        const focusAfterLaunch = adb(`-s ${serial} shell dumpsys window | grep mFocusedApp`, { ignoreError: true });
        const settingsLaunched = focusAfterLaunch.includes('com.android.settings');
        steps[steps.length - 1].status = settingsLaunched ? 'success' : 'warning';
        steps[steps.length - 1].data = { settingsLaunched };

        // Step 7: 스크린샷 캡처
        steps.push({ step: 'screenshot', status: 'running' });
        const screenshotPath = path.join(CONFIG.SCREENSHOT_DIR, `kickoff_${serial}_${Date.now()}.png`);

        // 디렉토리 생성
        if (!fs.existsSync(CONFIG.SCREENSHOT_DIR)) {
            fs.mkdirSync(CONFIG.SCREENSHOT_DIR, { recursive: true });
        }

        try {
            execSync(`${CONFIG.ADB_PATH} -s ${serial} exec-out screencap -p > "${screenshotPath}"`, {
                timeout: 10000
            });
            steps[steps.length - 1].status = 'success';
            steps[steps.length - 1].data = { path: screenshotPath };
        } catch (e) {
            steps[steps.length - 1].status = 'warning';
            steps[steps.length - 1].data = { error: e.message };
        }

        // Step 8: 홈으로 돌아가기
        steps.push({ step: 'go_home', status: 'running' });
        adb(`-s ${serial} shell input keyevent KEYCODE_HOME`);
        steps[steps.length - 1].status = 'success';

        const duration = Date.now() - startTime;
        const allSuccess = steps.every(s => s.status === 'success' || s.status === 'warning');

        return {
            success: allSuccess,
            serial,
            duration,
            steps,
            isLocked,
            screenOn
        };

    } catch (e) {
        const currentStep = steps.find(s => s.status === 'running');
        if (currentStep) {
            currentStep.status = 'failed';
            currentStep.error = e.message;
        }

        return {
            success: false,
            serial,
            duration: Date.now() - startTime,
            steps,
            error: e.message
        };
    }
}

/**
 * 전체 디바이스 킥오프 검증
 */
async function kickoffVerifyAll(devices) {
    logger.info('전체 디바이스 킥오프 검증 시작', { count: devices.length });

    const results = [];

    for (const device of devices) {
        const result = await kickoffVerifyDevice(device.serial);
        results.push(result);

        // 결과 출력
        const icon = result.success ? '✓' : '✗';
        logger.info(`  ${icon} ${device.serial}: ${result.success ? '성공' : '실패'}`, {
            duration: result.duration,
            isLocked: result.isLocked
        });
    }

    const successCount = results.filter(r => r.success).length;
    const lockedCount = results.filter(r => r.isLocked).length;

    return {
        total: devices.length,
        success: successCount,
        failed: devices.length - successCount,
        locked: lockedCount,
        results
    };
}

/**
 * YouTube 자동화 테스트
 */
async function testYouTubeAutomation(serial, videoId = 'dQw4w9WgXcQ') {
    logger.info('YouTube 자동화 테스트', { serial, videoId });

    const steps = [];

    try {
        // 1. YouTube 앱 열기
        steps.push({ step: 'open_youtube', status: 'running' });
        adb(`-s ${serial} shell am start -a android.intent.action.VIEW -d "vnd.youtube:${videoId}"`);
        await sleep(5000);
        steps[steps.length - 1].status = 'success';

        // 2. YouTube 앱 확인
        steps.push({ step: 'verify_youtube', status: 'running' });
        const focus = adb(`-s ${serial} shell dumpsys window | grep mFocusedApp`, { ignoreError: true });
        const youtubeRunning = focus.includes('com.google.android.youtube');
        steps[steps.length - 1].status = youtubeRunning ? 'success' : 'failed';
        steps[steps.length - 1].data = { youtubeRunning };

        if (!youtubeRunning) {
            throw new Error('YouTube 앱이 실행되지 않음');
        }

        // 3. 스크린샷
        steps.push({ step: 'screenshot', status: 'running' });
        const screenshotPath = path.join(CONFIG.SCREENSHOT_DIR, `youtube_${serial}_${Date.now()}.png`);
        execSync(`${CONFIG.ADB_PATH} -s ${serial} exec-out screencap -p > "${screenshotPath}"`, { timeout: 10000 });
        steps[steps.length - 1].status = 'success';
        steps[steps.length - 1].data = { path: screenshotPath };

        // 4. 좋아요 버튼 탭 (테스트)
        steps.push({ step: 'tap_like', status: 'running' });
        adb(`-s ${serial} shell input tap 138 298`);
        await sleep(2000);
        steps[steps.length - 1].status = 'success';

        // 5. 홈으로
        steps.push({ step: 'go_home', status: 'running' });
        adb(`-s ${serial} shell input keyevent KEYCODE_HOME`);
        steps[steps.length - 1].status = 'success';

        return { success: true, steps };

    } catch (e) {
        return { success: false, steps, error: e.message };
    }
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 메인 실행
 */
async function main() {
    console.log('='.repeat(60));
    console.log('DoAi Gateway - Device Validator & Kickoff');
    console.log('='.repeat(60));
    console.log('');

    // 1. 현재 연결된 디바이스 확인
    console.log('[1/4] 디바이스 연결 상태 확인...');
    let devices = getConnectedDevices();
    console.log(`  연결된 디바이스: ${devices.length}대`);

    // 2. 폰보드 단위 검증
    console.log('');
    console.log('[2/4] 폰보드 단위 검증...');
    const validation = validateBoardUnit(devices.length);
    console.log(`  현재: ${devices.length}대`);
    console.log(`  예상 단위: ${validation.nearestUnit}대`);
    console.log(`  검증 결과: ${validation.valid ? '✓ 정상' : '✗ 불일치'}`);

    if (!validation.valid && validation.missing > 0) {
        console.log(`  누락: ${validation.missing}대`);
        console.log('');
        console.log('[2-1] 디바이스 재연결 시도...');

        const reconnectResult = await attemptReconnection(validation.nearestUnit);
        devices = reconnectResult.devices;

        console.log(`  최종 연결: ${devices.length}대`);
    }

    // 3. 킥오프 검증
    console.log('');
    console.log('[3/4] 킥오프 검증...');

    if (devices.length === 0) {
        console.log('  ✗ 연결된 디바이스가 없습니다.');
    } else {
        const kickoffResult = await kickoffVerifyAll(devices);
        console.log('');
        console.log('  킥오프 결과:');
        console.log(`    성공: ${kickoffResult.success}대`);
        console.log(`    실패: ${kickoffResult.failed}대`);
        console.log(`    잠금: ${kickoffResult.locked}대`);
    }

    // 4. YouTube 테스트 (첫 번째 잠금 해제된 디바이스)
    console.log('');
    console.log('[4/4] YouTube 자동화 테스트...');

    const unlockedDevice = devices.find(d => {
        try {
            const focus = adb(`-s ${d.serial} shell dumpsys window | grep mCurrentFocus`, { ignoreError: true });
            return !focus.includes('Keyguard');
        } catch {
            return false;
        }
    });

    if (unlockedDevice) {
        console.log(`  테스트 디바이스: ${unlockedDevice.serial}`);
        const ytResult = await testYouTubeAutomation(unlockedDevice.serial);
        console.log(`  YouTube 테스트: ${ytResult.success ? '✓ 성공' : '✗ 실패'}`);
        if (ytResult.error) {
            console.log(`  오류: ${ytResult.error}`);
        }
    } else {
        console.log('  ✗ 잠금 해제된 디바이스가 없습니다.');
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('검증 완료');
    console.log('='.repeat(60));
}

// CLI 실행
if (require.main === module) {
    main().catch(err => {
        console.error('[Fatal]', err);
        process.exit(1);
    });
}

module.exports = {
    getConnectedDevices,
    validateBoardUnit,
    attemptReconnection,
    kickoffVerifyDevice,
    kickoffVerifyAll,
    testYouTubeAutomation,
    CONFIG
};
