/**
 * Gateway Runner Setup Script
 * 초기 설정 및 의존성 확인
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const SCRIPT_DIR = path.dirname(__dirname);
const GATEWAY_PATH = path.join(SCRIPT_DIR, '..', '..', 'local', 'gateway');
const CONFIG_PATH = path.join(SCRIPT_DIR, 'configs');

async function main() {
    console.log('='.repeat(50));
    console.log('DoAi Gateway Runner - Setup');
    console.log('='.repeat(50));
    console.log('');

    // 1. Node.js 버전 확인
    console.log('[1/5] Node.js 버전 확인...');
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
        console.error(`  ❌ Node.js 18 이상 필요 (현재: ${nodeVersion})`);
        process.exit(1);
    }
    console.log(`  ✓ Node.js ${nodeVersion}`);

    // 2. Gateway 경로 확인
    console.log('[2/5] Gateway 경로 확인...');
    if (!fs.existsSync(GATEWAY_PATH)) {
        console.error(`  ❌ Gateway 경로 없음: ${GATEWAY_PATH}`);
        process.exit(1);
    }
    console.log(`  ✓ ${GATEWAY_PATH}`);

    // 3. Gateway 의존성 설치
    console.log('[3/5] Gateway 의존성 확인...');
    const nodeModules = path.join(GATEWAY_PATH, 'node_modules');
    if (!fs.existsSync(nodeModules)) {
        console.log('  → 의존성 설치 중...');
        execSync('npm install', { cwd: GATEWAY_PATH, stdio: 'inherit' });
    }
    console.log('  ✓ 의존성 설치 완료');

    // 4. 설정 디렉토리 확인
    console.log('[4/5] 설정 디렉토리 확인...');
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.mkdirSync(CONFIG_PATH, { recursive: true });
    }

    const defaultConfig = path.join(CONFIG_PATH, 'default.json');
    if (!fs.existsSync(defaultConfig)) {
        const config = {
            workstation_id: 'workstation-1',
            laixi: {
                host: '127.0.0.1',
                port: 22221
            },
            gateway: {
                host: '0.0.0.0',
                port: 3100
            },
            backend: {
                url: '',
                token: ''
            }
        };
        fs.writeFileSync(defaultConfig, JSON.stringify(config, null, 2));
        console.log('  → 기본 설정 파일 생성');
    }
    console.log('  ✓ 설정 디렉토리 준비 완료');

    // 5. 로그 디렉토리 생성
    console.log('[5/5] 로그 디렉토리 확인...');
    const logsDir = path.join(SCRIPT_DIR, 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    console.log('  ✓ 로그 디렉토리 준비 완료');

    console.log('');
    console.log('='.repeat(50));
    console.log('Setup 완료!');
    console.log('');
    console.log('실행 방법:');
    console.log('  Windows: .\\start-windows.bat 또는 .\\start-windows.ps1');
    console.log('  Linux:   ./start-linux.sh');
    console.log('='.repeat(50));
}

main().catch(err => {
    console.error('[Fatal]', err);
    process.exit(1);
});
