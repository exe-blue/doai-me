#!/usr/bin/env node
/**
 * Supabase 설정 및 스키마 적용 스크립트
 * 
 * 실행: node setup-supabase.js
 * 
 * @author Axon (Tech Lead)
 */

const { getSupabaseAdmin, SUPABASE_CONFIG } = require('./supabase');

async function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     🗄️ DoAi.Me Supabase Setup                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    
    console.log(`📡 Supabase URL: ${SUPABASE_CONFIG.url}`);
    console.log(`📡 Project Ref: hycynmzdrngsozxdmyxi`);
    console.log('');
    
    const supabase = getSupabaseAdmin();
    
    // Step 1: 연결 테스트
    console.log('🔌 Step 1: 연결 테스트...');
    
    try {
        // 간단한 health check (auth.users는 항상 존재)
        const { error: authError } = await supabase.auth.getSession();
        
        if (authError && authError.message !== 'Auth session missing!') {
            throw new Error(`인증 실패: ${authError.message}`);
        }
        
        console.log('   ✅ Supabase 연결 성공!\n');
        
    } catch (err) {
        console.error('   ❌ 연결 실패:', err.message);
        process.exit(1);
    }
    
    // Step 2: 테이블 존재 여부 확인
    console.log('📋 Step 2: 테이블 확인...');
    
    const tables = ['nodes', 'devices', 'tasks', 'videos', 'results', 'echotions'];
    const existingTables = [];
    const missingTables = [];
    
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        
        if (error && error.code === '42P01') {
            // 테이블 없음
            missingTables.push(table);
            console.log(`   ❌ ${table}: 없음`);
        } else if (error) {
            // 다른 에러 (권한 등)
            console.log(`   ⚠️ ${table}: ${error.message}`);
            missingTables.push(table);
        } else {
            existingTables.push(table);
            console.log(`   ✅ ${table}: 존재`);
        }
    }
    
    console.log('');
    
    // Step 3: 결과 요약
    if (missingTables.length === 0) {
        console.log('✅ 모든 테이블이 존재합니다!\n');
        
        // 노드 데이터 확인
        const { data: nodes, error } = await supabase.from('nodes').select('*');
        
        if (!error && nodes) {
            console.log(`📊 nodes 테이블: ${nodes.length}개 레코드`);
            
            if (nodes.length > 0) {
                console.log('   등록된 노드:');
                nodes.forEach(n => {
                    console.log(`   - ${n.name}: ${n.host}:${n.port} (${n.status})`);
                });
            }
        }
        
    } else {
        console.log('⚠️ 테이블 생성이 필요합니다!\n');
        console.log('   누락된 테이블:', missingTables.join(', '));
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║     📝 Supabase SQL Editor에서 실행해주세요                     ║');
        console.log('╠═══════════════════════════════════════════════════════════════╣');
        console.log('║  1. https://supabase.com/dashboard/project/                   ║');
        console.log('║     hycynmzdrngsozxdmyxi/sql/new 접속                          ║');
        console.log('║                                                               ║');
        console.log('║  2. backend/migrations/DATABASE_SCHEMA_V2.sql 파일 내용       ║');
        console.log('║     전체 복사하여 붙여넣기                                       ║');
        console.log('║                                                               ║');
        console.log('║  3. "Run" 버튼 클릭                                            ║');
        console.log('║                                                               ║');
        console.log('║  4. 이 스크립트 다시 실행하여 확인                               ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
    }
    
    console.log('');
}

// 에러 핸들링
process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
    process.exit(1);
});

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

