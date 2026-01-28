/**
 * Gateway Health Check Script
 * Gateway 및 Laixi 연결 상태 확인
 */

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = process.env.GATEWAY_CONFIG ||
    path.join(__dirname, '..', 'configs', 'default.json');

async function main() {
    console.log('DoAi Gateway - Health Check');
    console.log('='.repeat(40));

    // 설정 로드
    let config = {
        gateway: { port: 3100 },
        laixi: { host: '127.0.0.1', port: 22221 }
    };

    if (fs.existsSync(CONFIG_PATH)) {
        config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) };
    }

    const results = {
        gateway: false,
        laixi: false
    };

    // Gateway 상태 확인
    console.log('');
    console.log('[Gateway]');
    try {
        const gatewayStatus = await checkHttp(`http://127.0.0.1:${config.gateway.port}/health`);
        if (gatewayStatus) {
            console.log(`  ✓ 포트 ${config.gateway.port} - 정상`);
            results.gateway = true;
        } else {
            console.log(`  ✗ 포트 ${config.gateway.port} - 응답 없음`);
        }
    } catch (err) {
        console.log(`  ✗ 포트 ${config.gateway.port} - 연결 실패`);
    }

    // Laixi 상태 확인
    console.log('');
    console.log('[Laixi]');
    try {
        const laixiStatus = await checkTcp(config.laixi.host, config.laixi.port);
        if (laixiStatus) {
            console.log(`  ✓ ${config.laixi.host}:${config.laixi.port} - 연결됨`);
            results.laixi = true;
        } else {
            console.log(`  ✗ ${config.laixi.host}:${config.laixi.port} - 연결 안됨`);
        }
    } catch (err) {
        console.log(`  ✗ ${config.laixi.host}:${config.laixi.port} - 오류: ${err.message}`);
    }

    // 결과 요약
    console.log('');
    console.log('='.repeat(40));
    const allHealthy = results.gateway && results.laixi;
    if (allHealthy) {
        console.log('Status: ✓ 모든 서비스 정상');
        process.exit(0);
    } else {
        console.log('Status: ✗ 일부 서비스 오류');
        process.exit(1);
    }
}

function checkHttp(url) {
    return new Promise((resolve) => {
        const req = http.get(url, { timeout: 3000 }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}

function checkTcp(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.connect(port, host);
    });
}

main().catch(err => {
    console.error('[Fatal]', err);
    process.exit(1);
});
