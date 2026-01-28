/**
 * Gateway Runner - 독립 실행 엔트리포인트
 *
 * 워크스테이션별 Gateway 실행 패키지
 * - Laixi 연동
 * - YouTube 자동화
 * - Backend 보고
 *
 * @author DoAi.Me Team
 * @version 1.0.0
 */

const path = require('path');
const fs = require('fs');

// 설정 로드
const CONFIG_PATH = process.env.GATEWAY_CONFIG || path.join(__dirname, 'configs', 'default.json');
const GATEWAY_PATH = path.join(__dirname, '..', '..', 'local', 'gateway');

async function main() {
    console.log('='.repeat(50));
    console.log('DoAi Gateway Runner v1.0.0');
    console.log('='.repeat(50));

    // 1. 설정 파일 확인
    let config = {};
    if (fs.existsSync(CONFIG_PATH)) {
        console.log(`[Config] 설정 로드: ${CONFIG_PATH}`);
        config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } else {
        console.log('[Config] 기본 설정 사용');
        config = getDefaultConfig();
    }

    // 2. 환경변수 오버라이드
    applyEnvOverrides(config);

    // 3. Gateway 경로 확인
    if (!fs.existsSync(GATEWAY_PATH)) {
        console.error(`[Error] Gateway 경로를 찾을 수 없습니다: ${GATEWAY_PATH}`);
        process.exit(1);
    }

    // 4. Gateway 의존성 확인
    const gatewayPackage = path.join(GATEWAY_PATH, 'package.json');
    const nodeModules = path.join(GATEWAY_PATH, 'node_modules');

    if (!fs.existsSync(nodeModules)) {
        console.log('[Setup] Gateway 의존성 설치 중...');
        const { execSync } = require('child_process');
        execSync('npm install', { cwd: GATEWAY_PATH, stdio: 'inherit' });
    }

    // 5. Gateway 실행
    console.log('[Gateway] 시작 중...');
    console.log(`  - Workstation ID: ${config.workstation_id || 'default'}`);
    console.log(`  - Laixi Host: ${config.laixi?.host || '127.0.0.1'}:${config.laixi?.port || 22221}`);
    console.log(`  - Gateway Port: ${config.gateway?.port || 3100}`);
    console.log('');

    // 환경변수 설정
    process.env.WORKSTATION_ID = config.workstation_id || 'default';
    process.env.LAIXI_HOST = config.laixi?.host || '127.0.0.1';
    process.env.LAIXI_PORT = config.laixi?.port || '22221';
    process.env.GATEWAY_PORT = config.gateway?.port || '3100';
    process.env.BACKEND_URL = config.backend?.url || '';
    process.env.BACKEND_TOKEN = config.backend?.token || '';

    // ADB PATH 설정 (Windows)
    const adbPaths = [
        process.env.USERPROFILE,
        path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools'),
        'C:\\Users\\ChoiJoonho'
    ].filter(Boolean);

    if (process.platform === 'win32') {
        process.env.PATH = adbPaths.join(';') + ';' + (process.env.PATH || '');
    } else {
        process.env.PATH = adbPaths.join(':') + ':' + (process.env.PATH || '');
    }

    // Gateway 진입점 실행 (우선순위: src/index.js > server.js > index.js)
    const entryPoints = [
        path.join(GATEWAY_PATH, 'src', 'index.js'),
        path.join(GATEWAY_PATH, 'server.js'),
        path.join(GATEWAY_PATH, 'index.js')
    ];

    let entryPoint = null;
    for (const ep of entryPoints) {
        if (fs.existsSync(ep)) {
            entryPoint = ep;
            break;
        }
    }

    if (entryPoint) {
        console.log(`[Gateway] 진입점: ${entryPoint}`);
        require(entryPoint);
    } else {
        console.error('[Error] Gateway 진입점을 찾을 수 없습니다');
        console.error('  확인 경로:', entryPoints);
        process.exit(1);
    }
}

function getDefaultConfig() {
    return {
        workstation_id: 'workstation-1',
        laixi: {
            host: '127.0.0.1',
            port: 22221
        },
        gateway: {
            port: 3100
        },
        backend: {
            url: '',
            token: ''
        },
        youtube: {
            default_watch_duration: 180,
            like_probability: 0.7,
            comment_probability: 0.3
        }
    };
}

function applyEnvOverrides(config) {
    if (process.env.WORKSTATION_ID) {
        config.workstation_id = process.env.WORKSTATION_ID;
    }
    if (process.env.LAIXI_HOST) {
        config.laixi = config.laixi || {};
        config.laixi.host = process.env.LAIXI_HOST;
    }
    if (process.env.LAIXI_PORT) {
        config.laixi = config.laixi || {};
        config.laixi.port = parseInt(process.env.LAIXI_PORT);
    }
    if (process.env.GATEWAY_PORT) {
        config.gateway = config.gateway || {};
        config.gateway.port = parseInt(process.env.GATEWAY_PORT);
    }
    if (process.env.BACKEND_URL) {
        config.backend = config.backend || {};
        config.backend.url = process.env.BACKEND_URL;
    }
    if (process.env.BACKEND_TOKEN) {
        config.backend = config.backend || {};
        config.backend.token = process.env.BACKEND_TOKEN;
    }
}

// 실행
main().catch(err => {
    console.error('[Fatal]', err);
    process.exit(1);
});
