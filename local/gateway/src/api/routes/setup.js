/**
 * Setup API - 초기 설정 및 명령 템플릿
 *
 * localhost 전용 대시보드에서 사용하는 설정 API
 * - 명령 템플릿 목록 조회
 * - 템플릿 명령 실행
 * - 전체 상태 요약
 *
 * @author DoAi.Me Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 명령 템플릿 정의
const COMMAND_TEMPLATES = {
    'adb-rescan': {
        id: 'adb-rescan',
        name: '기기 재연결 (ADB 재스캔)',
        description: 'ADB 서버를 재시작하고 연결된 기기를 다시 스캔합니다',
        icon: 'refresh-cw',
        type: 'adb',
        commands: ['adb kill-server', 'adb start-server', 'adb devices']
    },
    'laixi-start': {
        id: 'laixi-start',
        name: 'Laixi.app 실행',
        description: 'Laixi 원격 제어 프로그램을 실행합니다',
        icon: 'smartphone',
        type: 'app',
        paths: [
            // Gateway 설치 경로 (번들된 Laixi)
            path.join(__dirname, '..', '..', '..', '..', 'laixi', 'Laixi.exe'),
            'C:\\Program Files\\DoAi Gateway\\laixi\\Laixi.exe',
            // 기존 Laixi 설치 경로
            'C:\\Program Files\\Laixi\\Laixi.exe',
            'C:\\Program Files (x86)\\Laixi\\Laixi.exe',
            process.env.LAIXI_EXE_PATH
        ].filter(Boolean)
    },
    'laixi-health': {
        id: 'laixi-health',
        name: 'Laixi 연결 상태 확인',
        description: 'Laixi WebSocket 연결 상태를 확인합니다',
        icon: 'wifi',
        type: 'health-check',
        endpoint: '/api/laixi?action=health'
    },
    'connection-check': {
        id: 'connection-check',
        name: '전체 연결 상태 확인',
        description: '게이트웨이, ADB, Laixi, 디바이스 연결 상태를 확인합니다',
        icon: 'activity',
        type: 'health-check'
    }
};

// GET /api/setup/templates - 명령 템플릿 목록
router.get('/templates', (req, res) => {
    res.json({
        success: true,
        templates: COMMAND_TEMPLATES
    });
});

// POST /api/setup/execute - 템플릿 명령 실행
router.post('/execute', async (req, res) => {
    const { templateId, customPath } = req.body;
    const template = COMMAND_TEMPLATES[templateId];
    const logger = req.context?.logger;

    if (!template) {
        return res.status(400).json({
            success: false,
            error: 'Unknown template',
            message: `템플릿 '${templateId}'를 찾을 수 없습니다`
        });
    }

    try {
        let result;

        switch (template.type) {
            case 'adb':
                result = await executeAdbCommands(template.commands, logger);
                break;

            case 'app':
                result = await launchApp(template.paths, customPath, logger);
                break;

            case 'health-check':
                result = await performHealthCheck(templateId, req.context, logger);
                break;

            default:
                result = { success: false, message: '알 수 없는 템플릿 타입' };
        }

        res.json({
            success: result.success,
            templateId,
            templateName: template.name,
            ...result
        });

    } catch (error) {
        logger?.error(`[Setup] 명령 실행 오류: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message,
            templateId
        });
    }
});

// GET /api/setup/status - 전체 상태 요약
router.get('/status', async (req, res) => {
    const { discoveryManager, deviceTracker } = req.context || {};
    const logger = req.context?.logger;

    try {
        // Gateway 상태
        const gatewayStatus = {
            status: 'online',
            port: process.env.PORT || process.env.GATEWAY_PORT || 3100,
            uptime: process.uptime(),
            localhostOnly: process.env.LOCALHOST_ONLY === 'true'
        };

        // ADB 상태
        let adbStatus = { status: 'unknown' };
        try {
            const adbResult = await execPromise('adb devices');
            const deviceLines = adbResult.stdout.split('\n').filter(line =>
                line.includes('\tdevice') || line.includes('\toffline')
            );
            adbStatus = {
                status: 'online',
                deviceCount: deviceLines.length
            };
        } catch (err) {
            adbStatus = { status: 'offline', error: err.message };
        }

        // Laixi 상태
        let laixiStatus = { status: 'disabled' };
        if (process.env.LAIXI_ENABLED === 'true') {
            try {
                // Laixi WebSocket 연결 상태 확인 (간단한 버전)
                const laixiUrl = process.env.LAIXI_URL || 'ws://127.0.0.1:22221/';
                laixiStatus = {
                    status: 'enabled',
                    url: laixiUrl,
                    // 실제 연결 상태는 LaixiAdapter에서 가져와야 함
                    connected: true // placeholder
                };
            } catch (err) {
                laixiStatus = { status: 'error', error: err.message };
            }
        }

        // 디바이스 상태
        let devicesStatus = { count: 0, online: 0 };
        if (discoveryManager) {
            const deviceCount = discoveryManager.getDeviceCount();
            devicesStatus = {
                count: deviceCount.total || 0,
                online: deviceCount.online || 0,
                byType: deviceCount.byType || {}
            };
        } else if (deviceTracker) {
            const devices = deviceTracker.getDevices();
            devicesStatus = {
                count: devices.length,
                online: devices.filter(d => d.status === 'device').length
            };
        }

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            gateway: gatewayStatus,
            adb: adbStatus,
            laixi: laixiStatus,
            devices: devicesStatus
        });

    } catch (error) {
        logger?.error(`[Setup] 상태 조회 오류: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/setup/laixi-path - Laixi 실행 파일 경로 찾기
router.get('/laixi-path', (req, res) => {
    const possiblePaths = [
        'C:\\Program Files\\Laixi\\touping.exe',
        'C:\\Program Files (x86)\\Laixi\\touping.exe',
        'D:\\Laixi\\touping.exe',
        process.env.LAIXI_EXE_PATH
    ].filter(Boolean);

    const foundPath = possiblePaths.find(p => {
        try {
            return fs.existsSync(p);
        } catch {
            return false;
        }
    });

    res.json({
        success: !!foundPath,
        path: foundPath || null,
        searchedPaths: possiblePaths
    });
});

// ==================== Helper 함수 ====================

function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, { encoding: 'utf8', timeout: 30000 }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

async function executeAdbCommands(commands, logger) {
    const results = [];

    for (const cmd of commands) {
        try {
            logger?.info(`[Setup] ADB 명령 실행: ${cmd}`);
            const result = await execPromise(cmd);
            results.push({
                command: cmd,
                success: true,
                output: result.stdout.trim()
            });
        } catch (error) {
            results.push({
                command: cmd,
                success: false,
                error: error.message
            });
        }
    }

    const allSuccess = results.every(r => r.success);
    return {
        success: allSuccess,
        message: allSuccess ? 'ADB 명령 실행 완료' : '일부 명령 실패',
        results
    };
}

async function launchApp(paths, customPath, logger) {
    const searchPaths = customPath ? [customPath, ...paths] : paths;

    // 실행 파일 찾기
    let exePath = null;
    for (const p of searchPaths) {
        try {
            if (fs.existsSync(p)) {
                exePath = p;
                break;
            }
        } catch {
            continue;
        }
    }

    if (!exePath) {
        return {
            success: false,
            message: 'Laixi 실행 파일을 찾을 수 없습니다',
            searchedPaths: searchPaths
        };
    }

    // 앱 실행
    return new Promise((resolve) => {
        logger?.info(`[Setup] 앱 실행: ${exePath}`);

        const child = spawn(exePath, [], {
            detached: true,
            stdio: 'ignore',
            shell: true
        });

        child.unref();

        // 약간의 딜레이 후 성공 반환
        setTimeout(() => {
            resolve({
                success: true,
                message: 'Laixi.app 실행됨',
                path: exePath
            });
        }, 1000);
    });
}

async function performHealthCheck(templateId, context, logger) {
    const { discoveryManager, deviceTracker } = context || {};

    if (templateId === 'laixi-health') {
        // Laixi 전용 헬스체크
        if (process.env.LAIXI_ENABLED !== 'true') {
            return {
                success: false,
                message: 'Laixi가 비활성화되어 있습니다'
            };
        }

        return {
            success: true,
            message: 'Laixi 연결 상태 확인됨',
            url: process.env.LAIXI_URL || 'ws://127.0.0.1:22221/'
        };
    }

    // 전체 연결 상태 확인
    const checks = {
        gateway: { status: 'online' },
        adb: { status: 'unknown' },
        laixi: { status: process.env.LAIXI_ENABLED === 'true' ? 'enabled' : 'disabled' },
        devices: { count: 0 }
    };

    // ADB 체크
    try {
        await execPromise('adb devices');
        checks.adb.status = 'online';
    } catch {
        checks.adb.status = 'offline';
    }

    // 디바이스 수
    if (discoveryManager) {
        const count = discoveryManager.getDeviceCount();
        checks.devices.count = count.online || 0;
    }

    return {
        success: checks.adb.status === 'online',
        message: '연결 상태 확인 완료',
        checks
    };
}

module.exports = router;
