/**
 * DoAi.Me - Supabase Client
 * 
 * ⚠️ 보안 주의: Supabase 키는 반드시 환경변수로 관리하세요.
 * 이전에 소스코드에 노출된 serviceRoleKey는 즉시 Supabase 대시보드에서 교체해야 합니다!
 * 
 * @author Axon (Tech Lead)
 */

const { createClient } = require('@supabase/supabase-js');

/**
 * 필수 환경변수 검증
 */
function validateEnvVars() {
    const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(
            `Supabase 환경변수 누락: ${missing.join(', ')}\n` +
            `.env 파일에 다음 변수를 설정하세요:\n` +
            `  SUPABASE_URL=https://your-project.supabase.co\n` +
            `  SUPABASE_ANON_KEY=your-anon-key\n` +
            `  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`
        );
    }
}

// 환경변수에서 설정 로드 (실패 시 명확한 에러 메시지)
validateEnvVars();

const SUPABASE_CONFIG = {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

// 클라이언트 인스턴스 (싱글톤)
let _anonClient = null;
let _adminClient = null;

/**
 * Anon 클라이언트 (RLS 적용)
 * 프론트엔드/일반 API용
 */
function getSupabaseClient() {
    if (!_anonClient) {
        _anonClient = createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: false
                }
            }
        );
    }
    return _anonClient;
}

/**
 * Admin 클라이언트 (RLS 우회)
 * 서버 사이드 전용 - 절대 프론트엔드에 노출하지 마세요!
 */
function getSupabaseAdmin() {
    if (!_adminClient) {
        _adminClient = createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );
    }
    return _adminClient;
}

/**
 * 연결 테스트
 */
async function testConnection() {
    const client = getSupabaseAdmin();
    
    try {
        // 간단한 쿼리로 연결 테스트
        const { data, error } = await client
            .from('nodes')
            .select('count')
            .limit(1);
        
        if (error) {
            // 테이블이 없을 수 있음 - 연결은 성공
            if (error.code === '42P01') {
                return {
                    connected: true,
                    tablesExist: false,
                    message: '연결 성공, 테이블 생성 필요'
                };
            }
            throw error;
        }
        
        return {
            connected: true,
            tablesExist: true,
            message: '연결 성공'
        };
        
    } catch (err) {
        return {
            connected: false,
            tablesExist: false,
            message: `연결 실패: ${err.message}`
        };
    }
}

/**
 * SQL 실행 (스키마 적용용)
 */
async function executeSQL(sql) {
    const client = getSupabaseAdmin();
    
    // Supabase는 직접 SQL 실행을 위해 RPC 또는 REST API 사용
    // 여기서는 개별 테이블 생성으로 대체
    const { data, error } = await client.rpc('exec_sql', { query: sql });
    
    if (error) {
        throw error;
    }
    
    return data;
}

module.exports = {
    SUPABASE_CONFIG,
    getSupabaseClient,
    getSupabaseAdmin,
    testConnection,
    executeSQL
};

