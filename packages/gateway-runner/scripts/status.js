/**
 * Gateway Status Script
 * Gateway 상세 상태 및 연결된 디바이스 정보 확인
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = process.env.GATEWAY_CONFIG ||
    path.join(__dirname, '..', 'configs', 'default.json');

async function main() {
    console.log('DoAi Gateway - Status');
    console.log('='.repeat(50));

    // 설정 로드
    let config = {
        gateway: { port: 3100 },
        workstation_id: 'unknown'
    };

    if (fs.existsSync(CONFIG_PATH)) {
        config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) };
    }

    console.log(`Workstation: ${config.workstation_id}`);
    console.log(`Gateway Port: ${config.gateway.port}`);
    console.log('');

    // Gateway 상태 조회
    try {
        const status = await getJson(`http://127.0.0.1:${config.gateway.port}/api/v1/status`);

        if (status) {
            console.log('[Gateway 상태]');
            console.log(`  Uptime: ${formatUptime(status.uptime || 0)}`);
            console.log(`  연결된 디바이스: ${status.connected_devices || 0}개`);
            console.log('');

            if (status.devices && status.devices.length > 0) {
                console.log('[디바이스 목록]');
                for (const device of status.devices) {
                    const statusIcon = device.status === 'healthy' ? '✓' : '✗';
                    console.log(`  ${statusIcon} ${device.id}`);
                    console.log(`      상태: ${device.status}`);
                    console.log(`      마지막 활동: ${device.last_activity || 'N/A'}`);
                }
            } else {
                console.log('[디바이스 목록]');
                console.log('  연결된 디바이스 없음');
            }

            console.log('');
            if (status.queue) {
                console.log('[작업 큐]');
                console.log(`  대기 중: ${status.queue.pending || 0}개`);
                console.log(`  처리 중: ${status.queue.processing || 0}개`);
                console.log(`  완료: ${status.queue.completed || 0}개`);
            }
        } else {
            console.log('[Error] Gateway에서 응답이 없습니다.');
            console.log('        Gateway가 실행 중인지 확인하세요.');
        }
    } catch (err) {
        console.log('[Error] Gateway 연결 실패');
        console.log(`        ${err.message}`);
        console.log('');
        console.log('Gateway 실행:');
        console.log('  .\\start-windows.bat (Windows)');
        console.log('  ./start-linux.sh (Linux)');
    }

    console.log('');
    console.log('='.repeat(50));
}

function getJson(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(null);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}시간 ${minutes}분 ${secs}초`;
    } else if (minutes > 0) {
        return `${minutes}분 ${secs}초`;
    } else {
        return `${secs}초`;
    }
}

main().catch(err => {
    console.error('[Fatal]', err);
    process.exit(1);
});
