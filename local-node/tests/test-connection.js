/**
 * 연결 테스트 스크립트
 *
 * Supabase 및 Laixi 연결 확인
 *
 * Usage: node tests/test-connection.js
 */

require('dotenv').config();

const db = require('../lib/supabase');
const laixi = require('../lib/laixi');

async function testSupabase() {
    console.log('═══════════════════════════════════════════');
    console.log('[Test] Supabase 연결 테스트');
    console.log('═══════════════════════════════════════════');

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_KEY가 설정되지 않음');
        return false;
    }

    console.log(`  URL: ${process.env.SUPABASE_URL}`);

    try {
        // node_health 테이블 조회 테스트
        const { data, error } = await db.supabase
            .from('node_health')
            .select('node_id, status, last_heartbeat')
            .limit(5);

        if (error) throw error;

        console.log('✅ Supabase 연결 성공');
        console.log(`  노드 수: ${data.length}`);

        if (data.length > 0) {
            console.log('  노드 목록:');
            data.forEach(node => {
                console.log(`    - ${node.node_id}: ${node.status}`);
            });
        }

        return true;
    } catch (err) {
        console.error('❌ Supabase 연결 실패:', err.message);
        return false;
    }
}

async function testLaixi() {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('[Test] Laixi 연결 테스트');
    console.log('═══════════════════════════════════════════');

    console.log(`  URL: ${process.env.LAIXI_URL || 'http://127.0.0.1:9317'}`);

    try {
        const health = await laixi.healthCheck();

        if (!health.ok) {
            throw new Error(health.error || 'Unknown error');
        }

        console.log('✅ Laixi 연결 성공');
        console.log(`  연결된 디바이스: ${health.deviceCount}대`);

        // 디바이스 목록 조회
        const devices = await laixi.getDevices({ online: true });

        if (devices.length > 0) {
            console.log('  온라인 디바이스:');
            devices.slice(0, 5).forEach(d => {
                console.log(`    - ${d.serial || d.id}: 배터리 ${d.battery || 'N/A'}%`);
            });

            if (devices.length > 5) {
                console.log(`    ... 외 ${devices.length - 5}대`);
            }
        }

        return true;
    } catch (err) {
        console.error('❌ Laixi 연결 실패:', err.message);
        console.error('   Laixi가 실행 중인지 확인하세요.');
        return false;
    }
}

async function testHeartbeat() {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('[Test] device_heartbeat RPC 테스트');
    console.log('═══════════════════════════════════════════');

    const testSerial = 'TEST-DEVICE-001';
    const testNodeId = 'TEST-NODE';

    try {
        const result = await db.deviceHeartbeat(testNodeId, testSerial, {
            battery: 100,
            status: 'online'
        });

        if (result && result.success !== false) {
            console.log('✅ device_heartbeat RPC 호출 성공');
            console.log(`  결과: ${JSON.stringify(result)}`);
        } else if (result && result.error) {
            // 페르소나가 없는 경우 (정상적인 실패)
            console.log('⚠️ device_heartbeat 호출됨 (페르소나 없음)');
            console.log(`  응답: ${result.error}`);
        }

        return true;
    } catch (err) {
        console.error('❌ device_heartbeat RPC 실패:', err.message);
        return false;
    }
}

async function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║          DoAi.Me Local Node - 연결 테스트                 ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    const results = {
        supabase: await testSupabase(),
        laixi: await testLaixi(),
        heartbeat: await testHeartbeat()
    };

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('[Test] 결과 요약');
    console.log('═══════════════════════════════════════════');
    console.log(`  Supabase: ${results.supabase ? '✅ OK' : '❌ FAIL'}`);
    console.log(`  Laixi:    ${results.laixi ? '✅ OK' : '❌ FAIL'}`);
    console.log(`  RPC:      ${results.heartbeat ? '✅ OK' : '❌ FAIL'}`);
    console.log('');

    const allPassed = Object.values(results).every(r => r);

    if (allPassed) {
        console.log('🎉 모든 테스트 통과! 서비스 시작 가능');
    } else {
        console.log('⚠️ 일부 테스트 실패. 설정을 확인하세요.');
    }

    process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
    console.error('테스트 실행 오류:', err);
    process.exit(1);
});
