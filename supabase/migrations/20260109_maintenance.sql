-- =====================================================
-- Maintenance (유지보수) 시스템 테이블
--
-- 디바이스 팜 유지보수 관리:
-- - 헬스 체크 및 모니터링
-- - 유지보수 작업 스케줄링
-- - 이슈/인시던트 관리
-- - 비용 추적
--
-- @author Axon (DoAi.Me Tech Lead)
-- @created 2026-01-09
-- =====================================================

-- 유지보수 작업 유형 ENUM
CREATE TYPE maintenance_type AS ENUM (
    'health_check',
    'battery_check',
    'storage_cleanup',
    'cache_clear',
    'app_update',
    'system_reboot',
    'factory_reset',
    'adb_reconnect',
    'network_check',
    'temperature_check',
    'screen_check',
    'account_check'
);

-- 유지보수 상태 ENUM
CREATE TYPE maintenance_status AS ENUM (
    'scheduled',
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled',
    'skipped'
);

-- 유지보수 우선순위 ENUM
CREATE TYPE maintenance_priority AS ENUM (
    'critical',
    'high',
    'normal',
    'low',
    'scheduled'
);

-- 헬스 상태 ENUM
CREATE TYPE health_status AS ENUM (
    'healthy',
    'warning',
    'critical',
    'unknown',
    'maintenance'
);

-- 이슈 유형 ENUM
CREATE TYPE issue_type AS ENUM (
    'hardware',
    'software',
    'network',
    'battery',
    'storage',
    'temperature',
    'account',
    'adb',
    'app',
    'other'
);

-- 이슈 심각도 ENUM
CREATE TYPE issue_severity AS ENUM (
    'critical',
    'high',
    'medium',
    'low',
    'info'
);

-- 이슈 상태 ENUM
CREATE TYPE issue_status AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed',
    'wont_fix'
);

-- 비용 카테고리 ENUM
CREATE TYPE cost_category AS ENUM (
    'electricity',
    'network',
    'hardware',
    'software',
    'labor',
    'maintenance',
    'depreciation',
    'other'
);

-- =====================================================
-- device_health_records 테이블 (디바이스 헬스 레코드)
-- =====================================================
CREATE TABLE IF NOT EXISTS device_health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,

    -- 전체 상태
    status health_status NOT NULL DEFAULT 'unknown',
    health_score DECIMAL(5,2) NOT NULL DEFAULT 100.0 CHECK (health_score >= 0 AND health_score <= 100),

    -- 배터리 상태
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    battery_temperature DECIMAL(4,1),
    battery_voltage DECIMAL(6,1),
    battery_charging BOOLEAN DEFAULT FALSE,
    battery_health TEXT,
    battery_charge_cycles INTEGER,

    -- 저장소 상태
    storage_total_bytes BIGINT,
    storage_used_bytes BIGINT,
    storage_free_bytes BIGINT,
    storage_usage_percent DECIMAL(5,2),
    storage_cache_bytes BIGINT,

    -- 네트워크 상태
    network_connected BOOLEAN DEFAULT TRUE,
    network_type TEXT DEFAULT 'wifi',
    network_signal_strength INTEGER,
    network_ip_address TEXT,
    network_latency_ms DECIMAL(8,2),
    network_download_speed_mbps DECIMAL(8,2),

    -- 시스템 상태
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_percent DECIMAL(5,2),
    temperature_celsius DECIMAL(4,1),

    -- 앱 상태
    youtube_app_version TEXT,
    youtube_logged_in BOOLEAN,

    -- ADB 상태
    adb_connected BOOLEAN DEFAULT TRUE,
    adb_response_time_ms DECIMAL(8,2),

    -- 화면 상태
    screen_on BOOLEAN,
    screen_locked BOOLEAN,

    -- 경고/오류
    warnings TEXT[] DEFAULT '{}',
    errors TEXT[] DEFAULT '{}',

    -- 타임스탬프
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_health_records_device_id ON device_health_records(device_id);
CREATE INDEX idx_health_records_status ON device_health_records(status);
CREATE INDEX idx_health_records_checked_at ON device_health_records(checked_at DESC);
CREATE INDEX idx_health_records_health_score ON device_health_records(health_score);

-- 디바이스별 최신 레코드 조회용 인덱스
CREATE INDEX idx_health_records_device_latest ON device_health_records(device_id, checked_at DESC);

-- =====================================================
-- maintenance_tasks 테이블 (유지보수 작업)
-- =====================================================
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 작업 정의
    task_type maintenance_type NOT NULL,
    priority maintenance_priority NOT NULL DEFAULT 'normal',
    status maintenance_status NOT NULL DEFAULT 'pending',

    -- 대상
    device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
    device_ids TEXT[] DEFAULT '{}',
    workstation_id TEXT,
    phoneboard_id TEXT,
    target_all BOOLEAN NOT NULL DEFAULT FALSE,
    target_count INTEGER NOT NULL DEFAULT 0,

    -- 작업 설정
    parameters JSONB,
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    retry_count INTEGER NOT NULL DEFAULT 1,
    current_retry INTEGER NOT NULL DEFAULT 0,

    -- 스케줄링
    scheduled_at TIMESTAMPTZ,
    recurring BOOLEAN NOT NULL DEFAULT FALSE,
    cron_expression TEXT,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,

    -- 진행 상황
    total_devices INTEGER NOT NULL DEFAULT 0,
    completed_devices INTEGER NOT NULL DEFAULT 0,
    failed_devices INTEGER NOT NULL DEFAULT 0,
    skipped_devices INTEGER NOT NULL DEFAULT 0,
    progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0.0,

    -- 결과
    results JSONB DEFAULT '[]',

    -- 메타데이터
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX idx_maintenance_tasks_task_type ON maintenance_tasks(task_type);
CREATE INDEX idx_maintenance_tasks_priority ON maintenance_tasks(priority);
CREATE INDEX idx_maintenance_tasks_device_id ON maintenance_tasks(device_id);
CREATE INDEX idx_maintenance_tasks_scheduled_at ON maintenance_tasks(scheduled_at);
CREATE INDEX idx_maintenance_tasks_created_at ON maintenance_tasks(created_at DESC);

-- 대기 중인 작업 조회용 복합 인덱스
CREATE INDEX idx_maintenance_tasks_queue ON maintenance_tasks(status, priority, scheduled_at)
    WHERE status IN ('scheduled', 'pending');

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_maintenance_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_maintenance_tasks_updated_at
    BEFORE UPDATE ON maintenance_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_tasks_updated_at();

-- =====================================================
-- maintenance_schedules 테이블 (유지보수 스케줄)
-- =====================================================
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,
    description TEXT,

    -- 작업 유형
    task_type maintenance_type NOT NULL,
    parameters JSONB,

    -- 대상
    target_workstations TEXT[] DEFAULT '{}',
    target_device_group TEXT,
    target_all BOOLEAN NOT NULL DEFAULT FALSE,

    -- 스케줄
    cron_expression TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    -- 유지보수 윈도우
    maintenance_window_start TEXT,
    maintenance_window_end TEXT,

    -- 실행 이력
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,

    -- 메타데이터
    tags TEXT[] DEFAULT '{}',

    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_maintenance_schedules_enabled ON maintenance_schedules(enabled);
CREATE INDEX idx_maintenance_schedules_next_run_at ON maintenance_schedules(next_run_at);

-- =====================================================
-- maintenance_issues 테이블 (이슈/인시던트)
-- =====================================================
CREATE TABLE IF NOT EXISTS maintenance_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 이슈 정보
    title TEXT NOT NULL,
    description TEXT,
    issue_type issue_type NOT NULL,
    severity issue_severity NOT NULL DEFAULT 'medium',
    status issue_status NOT NULL DEFAULT 'open',

    -- 대상
    device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
    workstation_id TEXT,
    phoneboard_id TEXT,

    -- 담당자/해결
    assignee TEXT,
    resolution TEXT,

    -- 감지 정보
    detected_by TEXT NOT NULL DEFAULT 'manual',
    health_record_id UUID REFERENCES device_health_records(id) ON DELETE SET NULL,

    -- 관련 작업
    related_task_ids UUID[] DEFAULT '{}',

    -- 메타데이터
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_issues_status ON maintenance_issues(status);
CREATE INDEX idx_issues_severity ON maintenance_issues(severity);
CREATE INDEX idx_issues_issue_type ON maintenance_issues(issue_type);
CREATE INDEX idx_issues_device_id ON maintenance_issues(device_id);
CREATE INDEX idx_issues_created_at ON maintenance_issues(created_at DESC);

-- 열린 이슈 조회용 인덱스
CREATE INDEX idx_issues_open ON maintenance_issues(status, severity, created_at)
    WHERE status IN ('open', 'in_progress');

-- updated_at 트리거
CREATE TRIGGER trigger_maintenance_issues_updated_at
    BEFORE UPDATE ON maintenance_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_tasks_updated_at();

-- =====================================================
-- issue_comments 테이블 (이슈 코멘트)
-- =====================================================
CREATE TABLE IF NOT EXISTS issue_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES maintenance_issues(id) ON DELETE CASCADE,

    author TEXT NOT NULL DEFAULT 'system',
    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX idx_issue_comments_created_at ON issue_comments(created_at);

-- =====================================================
-- cost_records 테이블 (비용 기록)
-- =====================================================
CREATE TABLE IF NOT EXISTS cost_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category cost_category NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'KRW',

    -- 대상
    device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
    workstation_id TEXT,

    -- 기간
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    -- 상세
    description TEXT,
    unit_cost DECIMAL(12,4),
    quantity DECIMAL(10,4),

    -- 메타데이터
    invoice_id TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_cost_records_category ON cost_records(category);
CREATE INDEX idx_cost_records_period ON cost_records(period_start, period_end);
CREATE INDEX idx_cost_records_device_id ON cost_records(device_id);
CREATE INDEX idx_cost_records_workstation_id ON cost_records(workstation_id);
CREATE INDEX idx_cost_records_created_at ON cost_records(created_at DESC);

-- =====================================================
-- RPC Functions
-- =====================================================

-- 디바이스 최신 헬스 레코드 조회
CREATE OR REPLACE FUNCTION get_latest_device_health(p_device_id TEXT)
RETURNS TABLE (
    id UUID,
    status health_status,
    health_score DECIMAL,
    battery_level INTEGER,
    storage_usage_percent DECIMAL,
    adb_connected BOOLEAN,
    temperature_celsius DECIMAL,
    checked_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.status,
        h.health_score,
        h.battery_level,
        h.storage_usage_percent,
        h.adb_connected,
        h.temperature_celsius,
        h.checked_at
    FROM device_health_records h
    WHERE h.device_id = p_device_id
    ORDER BY h.checked_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 유지보수 통계 조회
CREATE OR REPLACE FUNCTION get_maintenance_stats(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    total_tasks BIGINT,
    scheduled_tasks BIGINT,
    pending_tasks BIGINT,
    in_progress_tasks BIGINT,
    completed_tasks BIGINT,
    failed_tasks BIGINT,
    avg_execution_time_ms NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_tasks,
        COUNT(*) FILTER (WHERE t.status = 'scheduled')::BIGINT as scheduled_tasks,
        COUNT(*) FILTER (WHERE t.status = 'pending')::BIGINT as pending_tasks,
        COUNT(*) FILTER (WHERE t.status = 'in_progress')::BIGINT as in_progress_tasks,
        COUNT(*) FILTER (WHERE t.status = 'completed')::BIGINT as completed_tasks,
        COUNT(*) FILTER (WHERE t.status = 'failed')::BIGINT as failed_tasks,
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) * 1000)
            FILTER (WHERE t.completed_at IS NOT NULL AND t.started_at IS NOT NULL), 0)::NUMERIC as avg_execution_time_ms,
        CASE
            WHEN COUNT(*) FILTER (WHERE t.status IN ('completed', 'failed')) > 0
            THEN (COUNT(*) FILTER (WHERE t.status = 'completed')::NUMERIC /
                  COUNT(*) FILTER (WHERE t.status IN ('completed', 'failed'))::NUMERIC * 100)
            ELSE 0
        END as success_rate
    FROM maintenance_tasks t
    WHERE (p_start_date IS NULL OR t.created_at >= p_start_date)
      AND (p_end_date IS NULL OR t.created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- 디바이스 헬스 통계 조회
CREATE OR REPLACE FUNCTION get_device_health_stats()
RETURNS TABLE (
    total_devices BIGINT,
    healthy_count BIGINT,
    warning_count BIGINT,
    critical_count BIGINT,
    unknown_count BIGINT,
    maintenance_count BIGINT,
    avg_health_score NUMERIC,
    avg_battery_level NUMERIC,
    low_battery_count BIGINT,
    avg_storage_usage NUMERIC,
    low_storage_count BIGINT,
    adb_connected_count BIGINT,
    avg_temperature NUMERIC,
    overheat_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_health AS (
        SELECT DISTINCT ON (h.device_id)
            h.*
        FROM device_health_records h
        ORDER BY h.device_id, h.checked_at DESC
    )
    SELECT
        COUNT(*)::BIGINT as total_devices,
        COUNT(*) FILTER (WHERE lh.status = 'healthy')::BIGINT as healthy_count,
        COUNT(*) FILTER (WHERE lh.status = 'warning')::BIGINT as warning_count,
        COUNT(*) FILTER (WHERE lh.status = 'critical')::BIGINT as critical_count,
        COUNT(*) FILTER (WHERE lh.status = 'unknown')::BIGINT as unknown_count,
        COUNT(*) FILTER (WHERE lh.status = 'maintenance')::BIGINT as maintenance_count,
        COALESCE(AVG(lh.health_score), 0)::NUMERIC as avg_health_score,
        COALESCE(AVG(lh.battery_level), 0)::NUMERIC as avg_battery_level,
        COUNT(*) FILTER (WHERE lh.battery_level < 20)::BIGINT as low_battery_count,
        COALESCE(AVG(lh.storage_usage_percent), 0)::NUMERIC as avg_storage_usage,
        COUNT(*) FILTER (WHERE lh.storage_usage_percent > 90)::BIGINT as low_storage_count,
        COUNT(*) FILTER (WHERE lh.adb_connected = TRUE)::BIGINT as adb_connected_count,
        COALESCE(AVG(lh.temperature_celsius), 0)::NUMERIC as avg_temperature,
        COUNT(*) FILTER (WHERE lh.temperature_celsius > 45)::BIGINT as overheat_count
    FROM latest_health lh;
END;
$$ LANGUAGE plpgsql;

-- 이슈 통계 조회
CREATE OR REPLACE FUNCTION get_issue_stats()
RETURNS TABLE (
    total_issues BIGINT,
    open_issues BIGINT,
    in_progress_issues BIGINT,
    resolved_issues BIGINT,
    closed_issues BIGINT,
    critical_count BIGINT,
    high_count BIGINT,
    medium_count BIGINT,
    low_count BIGINT,
    avg_resolution_time_hours NUMERIC,
    today_created BIGINT,
    today_resolved BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_issues,
        COUNT(*) FILTER (WHERE i.status = 'open')::BIGINT as open_issues,
        COUNT(*) FILTER (WHERE i.status = 'in_progress')::BIGINT as in_progress_issues,
        COUNT(*) FILTER (WHERE i.status = 'resolved')::BIGINT as resolved_issues,
        COUNT(*) FILTER (WHERE i.status = 'closed')::BIGINT as closed_issues,
        COUNT(*) FILTER (WHERE i.severity = 'critical')::BIGINT as critical_count,
        COUNT(*) FILTER (WHERE i.severity = 'high')::BIGINT as high_count,
        COUNT(*) FILTER (WHERE i.severity = 'medium')::BIGINT as medium_count,
        COUNT(*) FILTER (WHERE i.severity = 'low')::BIGINT as low_count,
        COALESCE(AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600)
            FILTER (WHERE i.resolved_at IS NOT NULL), 0)::NUMERIC as avg_resolution_time_hours,
        COUNT(*) FILTER (WHERE i.created_at >= CURRENT_DATE)::BIGINT as today_created,
        COUNT(*) FILTER (WHERE i.resolved_at >= CURRENT_DATE)::BIGINT as today_resolved
    FROM maintenance_issues i;
END;
$$ LANGUAGE plpgsql;

-- 비용 요약 조회
CREATE OR REPLACE FUNCTION get_cost_summary(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    total_cost NUMERIC,
    electricity_cost NUMERIC,
    network_cost NUMERIC,
    hardware_cost NUMERIC,
    software_cost NUMERIC,
    labor_cost NUMERIC,
    maintenance_cost NUMERIC,
    other_cost NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(c.amount), 0)::NUMERIC as total_cost,
        COALESCE(SUM(c.amount) FILTER (WHERE c.category = 'electricity'), 0)::NUMERIC as electricity_cost,
        COALESCE(SUM(c.amount) FILTER (WHERE c.category = 'network'), 0)::NUMERIC as network_cost,
        COALESCE(SUM(c.amount) FILTER (WHERE c.category = 'hardware'), 0)::NUMERIC as hardware_cost,
        COALESCE(SUM(c.amount) FILTER (WHERE c.category = 'software'), 0)::NUMERIC as software_cost,
        COALESCE(SUM(c.amount) FILTER (WHERE c.category = 'labor'), 0)::NUMERIC as labor_cost,
        COALESCE(SUM(c.amount) FILTER (WHERE c.category = 'maintenance'), 0)::NUMERIC as maintenance_cost,
        COALESCE(SUM(c.amount) FILTER (WHERE c.category IN ('depreciation', 'other')), 0)::NUMERIC as other_cost
    FROM cost_records c
    WHERE c.period_start >= p_start_date
      AND c.period_end <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- 다음 유지보수 작업 가져오기
CREATE OR REPLACE FUNCTION get_next_maintenance_task()
RETURNS TABLE (
    id UUID,
    task_type maintenance_type,
    priority maintenance_priority,
    device_id TEXT,
    device_ids TEXT[],
    workstation_id TEXT,
    parameters JSONB,
    timeout_seconds INTEGER
) AS $$
DECLARE
    v_task_id UUID;
BEGIN
    -- 우선순위 순으로 다음 작업 선택 및 상태 변경
    UPDATE maintenance_tasks t
    SET
        status = 'in_progress',
        started_at = NOW(),
        updated_at = NOW()
    WHERE t.id = (
        SELECT t2.id
        FROM maintenance_tasks t2
        WHERE t2.status IN ('pending', 'scheduled')
          AND (t2.scheduled_at IS NULL OR t2.scheduled_at <= NOW())
        ORDER BY
            CASE t2.priority
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'normal' THEN 3
                WHEN 'low' THEN 4
                WHEN 'scheduled' THEN 5
            END,
            t2.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING t.id INTO v_task_id;

    -- 결과 반환
    RETURN QUERY
    SELECT
        t.id,
        t.task_type,
        t.priority,
        t.device_id,
        t.device_ids,
        t.workstation_id,
        t.parameters,
        t.timeout_seconds
    FROM maintenance_tasks t
    WHERE t.id = v_task_id;
END;
$$ LANGUAGE plpgsql;

-- 디바이스 헬스 이력에서 문제 감지
CREATE OR REPLACE FUNCTION detect_device_issues()
RETURNS TABLE (
    device_id TEXT,
    issue_type issue_type,
    severity issue_severity,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_health AS (
        SELECT DISTINCT ON (h.device_id)
            h.*
        FROM device_health_records h
        ORDER BY h.device_id, h.checked_at DESC
    )
    -- 배터리 문제
    SELECT
        lh.device_id,
        'battery'::issue_type,
        CASE WHEN lh.battery_level < 10 THEN 'critical'::issue_severity ELSE 'high'::issue_severity END,
        '배터리 부족: ' || lh.battery_level || '%'
    FROM latest_health lh
    WHERE lh.battery_level < 20

    UNION ALL

    -- 저장소 문제
    SELECT
        lh.device_id,
        'storage'::issue_type,
        CASE WHEN lh.storage_usage_percent > 95 THEN 'critical'::issue_severity ELSE 'high'::issue_severity END,
        '저장소 부족: ' || ROUND(lh.storage_usage_percent, 1) || '% 사용 중'
    FROM latest_health lh
    WHERE lh.storage_usage_percent > 90

    UNION ALL

    -- ADB 연결 문제
    SELECT
        lh.device_id,
        'adb'::issue_type,
        'critical'::issue_severity,
        'ADB 연결 끊김'
    FROM latest_health lh
    WHERE lh.adb_connected = FALSE

    UNION ALL

    -- 온도 문제
    SELECT
        lh.device_id,
        'temperature'::issue_type,
        CASE WHEN lh.temperature_celsius > 50 THEN 'critical'::issue_severity ELSE 'high'::issue_severity END,
        '과열: ' || lh.temperature_celsius || '°C'
    FROM latest_health lh
    WHERE lh.temperature_celsius > 45;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 코멘트
-- =====================================================
COMMENT ON TABLE device_health_records IS '디바이스 헬스 체크 기록';
COMMENT ON TABLE maintenance_tasks IS '유지보수 작업';
COMMENT ON TABLE maintenance_schedules IS '유지보수 스케줄';
COMMENT ON TABLE maintenance_issues IS '유지보수 이슈/인시던트';
COMMENT ON TABLE issue_comments IS '이슈 코멘트';
COMMENT ON TABLE cost_records IS '비용 기록';

COMMENT ON FUNCTION get_maintenance_stats IS '유지보수 통계 조회';
COMMENT ON FUNCTION get_device_health_stats IS '디바이스 헬스 통계 조회';
COMMENT ON FUNCTION get_issue_stats IS '이슈 통계 조회';
COMMENT ON FUNCTION detect_device_issues IS '디바이스 헬스에서 이슈 자동 감지';
