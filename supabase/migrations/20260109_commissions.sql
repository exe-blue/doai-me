-- =====================================================
-- Commission (작업 위임) 시스템 테이블
--
-- AI 시민(디바이스)에게 위임하는 작업 관리
-- - 작업 유형: LIKE, COMMENT, SUBSCRIBE, WATCH, SHARE
-- - 페르소나 적합도 검증
-- - 보상 시스템
--
-- @author Axon (DoAi.Me Tech Lead)
-- @created 2026-01-09
-- =====================================================

-- 작업 유형 ENUM
CREATE TYPE job_type AS ENUM (
    'LIKE',
    'COMMENT',
    'SUBSCRIBE',
    'WATCH',
    'SHARE'
);

-- Commission 상태 ENUM
CREATE TYPE commission_status AS ENUM (
    'pending',      -- 생성됨, 할당 대기
    'assigned',     -- 디바이스 할당됨
    'sent',         -- 디바이스에 전송됨
    'in_progress',  -- 실행 중
    'success',      -- 성공
    'failed',       -- 실패
    'refused',      -- 거절됨 (페르소나 불일치)
    'timeout',      -- 타임아웃
    'cancelled'     -- 취소됨
);

-- 플랫폼 타입 ENUM
CREATE TYPE platform_type AS ENUM (
    'youtube',
    'instagram',
    'tiktok',
    'twitter',
    'facebook'
);

-- =====================================================
-- commissions 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 작업 정의
    job_type job_type NOT NULL,
    platform platform_type NOT NULL DEFAULT 'youtube',
    url TEXT,
    video_id TEXT,
    channel_id TEXT,

    -- 대상 디바이스
    device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
    device_serial TEXT,
    workstation_id TEXT,

    -- 상태
    status commission_status NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

    -- 설정 (JSON)
    target_config JSONB,       -- CommissionTarget
    content_config JSONB,      -- CommissionContent
    timing_config JSONB,       -- CommissionTiming
    reward_config JSONB,       -- CommissionReward
    compliance_config JSONB,   -- CommissionCompliance

    -- 결과
    result_status TEXT,
    result_data JSONB,
    credits_earned INTEGER NOT NULL DEFAULT 0,
    error_code TEXT,
    error_message TEXT,

    -- 실행 정보
    retry_count INTEGER NOT NULL DEFAULT 0,
    execution_time_ms INTEGER,

    -- 페르소나 정보
    persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
    persona_alignment DECIMAL(3,2),

    -- 타임스탬프
    scheduled_at TIMESTAMPTZ,
    assigned_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 메타데이터
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- 인덱스
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_device_id ON commissions(device_id);
CREATE INDEX idx_commissions_job_type ON commissions(job_type);
CREATE INDEX idx_commissions_priority ON commissions(priority DESC);
CREATE INDEX idx_commissions_scheduled_at ON commissions(scheduled_at);
CREATE INDEX idx_commissions_created_at ON commissions(created_at DESC);
CREATE INDEX idx_commissions_video_id ON commissions(video_id);
CREATE INDEX idx_commissions_workstation_id ON commissions(workstation_id);

-- 복합 인덱스 (대기열 조회용)
CREATE INDEX idx_commissions_queue ON commissions(status, priority DESC, created_at ASC)
    WHERE status IN ('pending', 'assigned');

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_commissions_updated_at
    BEFORE UPDATE ON commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_commissions_updated_at();

-- =====================================================
-- commission_batches 테이블 (배치 작업 그룹)
-- =====================================================
CREATE TABLE IF NOT EXISTS commission_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 배치 정보
    name TEXT,
    description TEXT,

    -- 공통 작업 정의
    job_type job_type NOT NULL,
    platform platform_type NOT NULL DEFAULT 'youtube',
    url TEXT,
    video_id TEXT,

    -- 대상 설정
    target_workstations TEXT[],
    device_percent DECIMAL(3,2) NOT NULL DEFAULT 1.0,

    -- 통계
    total_commissions INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    refused_count INTEGER NOT NULL DEFAULT 0,

    -- 상태
    status commission_status NOT NULL DEFAULT 'pending',

    -- 타임스탬프
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 메타데이터
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- commission_batches updated_at 트리거
CREATE TRIGGER trigger_commission_batches_updated_at
    BEFORE UPDATE ON commission_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_commissions_updated_at();

-- commissions에 batch_id 컬럼 추가
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES commission_batches(id) ON DELETE SET NULL;
CREATE INDEX idx_commissions_batch_id ON commissions(batch_id);

-- =====================================================
-- commission_results 테이블 (결과 히스토리)
-- =====================================================
CREATE TABLE IF NOT EXISTS commission_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,

    -- 결과
    status commission_status NOT NULL,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    credits_earned INTEGER NOT NULL DEFAULT 0,

    -- 상세 결과
    action_details JSONB,

    -- 오류 정보
    error_code TEXT,
    error_message TEXT,

    -- 페르소나 정보
    persona_alignment DECIMAL(3,2),
    refused_reason TEXT,

    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commission_results_commission_id ON commission_results(commission_id);
CREATE INDEX idx_commission_results_device_id ON commission_results(device_id);
CREATE INDEX idx_commission_results_created_at ON commission_results(created_at DESC);

-- =====================================================
-- RPC Functions
-- =====================================================

-- 다음 Commission 가져오기 (디바이스 할당)
CREATE OR REPLACE FUNCTION get_next_commission(p_device_id TEXT, p_workstation_id TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    job_type job_type,
    platform platform_type,
    url TEXT,
    video_id TEXT,
    target_config JSONB,
    content_config JSONB,
    timing_config JSONB,
    reward_config JSONB,
    compliance_config JSONB
) AS $$
DECLARE
    v_commission_id UUID;
BEGIN
    -- 가장 우선순위가 높은 pending commission 선택 및 할당
    UPDATE commissions c
    SET
        status = 'assigned',
        device_id = p_device_id,
        workstation_id = COALESCE(p_workstation_id, c.workstation_id),
        assigned_at = NOW(),
        updated_at = NOW()
    WHERE c.id = (
        SELECT c2.id
        FROM commissions c2
        WHERE c2.status = 'pending'
          AND (c2.scheduled_at IS NULL OR c2.scheduled_at <= NOW())
          AND (p_workstation_id IS NULL OR c2.workstation_id IS NULL OR c2.workstation_id = p_workstation_id)
        ORDER BY c2.priority DESC, c2.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING c.id INTO v_commission_id;

    -- 결과 반환
    RETURN QUERY
    SELECT
        c.id,
        c.job_type,
        c.platform,
        c.url,
        c.video_id,
        c.target_config,
        c.content_config,
        c.timing_config,
        c.reward_config,
        c.compliance_config
    FROM commissions c
    WHERE c.id = v_commission_id;
END;
$$ LANGUAGE plpgsql;

-- Commission 통계 조회
CREATE OR REPLACE FUNCTION get_commission_stats(p_start_date TIMESTAMPTZ DEFAULT NULL, p_end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
    total BIGINT,
    pending BIGINT,
    assigned BIGINT,
    in_progress BIGINT,
    success BIGINT,
    failed BIGINT,
    refused BIGINT,
    timeout BIGINT,
    cancelled BIGINT,
    total_credits_earned BIGINT,
    avg_execution_time_ms NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE c.status = 'pending')::BIGINT as pending,
        COUNT(*) FILTER (WHERE c.status = 'assigned')::BIGINT as assigned,
        COUNT(*) FILTER (WHERE c.status = 'in_progress')::BIGINT as in_progress,
        COUNT(*) FILTER (WHERE c.status = 'success')::BIGINT as success,
        COUNT(*) FILTER (WHERE c.status = 'failed')::BIGINT as failed,
        COUNT(*) FILTER (WHERE c.status = 'refused')::BIGINT as refused,
        COUNT(*) FILTER (WHERE c.status = 'timeout')::BIGINT as timeout,
        COUNT(*) FILTER (WHERE c.status = 'cancelled')::BIGINT as cancelled,
        COALESCE(SUM(c.credits_earned), 0)::BIGINT as total_credits_earned,
        COALESCE(AVG(c.execution_time_ms) FILTER (WHERE c.execution_time_ms IS NOT NULL), 0)::NUMERIC as avg_execution_time_ms,
        CASE
            WHEN COUNT(*) FILTER (WHERE c.status IN ('success', 'failed', 'refused', 'timeout')) > 0
            THEN (COUNT(*) FILTER (WHERE c.status = 'success')::NUMERIC /
                  COUNT(*) FILTER (WHERE c.status IN ('success', 'failed', 'refused', 'timeout'))::NUMERIC * 100)
            ELSE 0
        END as success_rate
    FROM commissions c
    WHERE (p_start_date IS NULL OR c.created_at >= p_start_date)
      AND (p_end_date IS NULL OR c.created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- 오늘 Commission 통계
CREATE OR REPLACE FUNCTION get_today_commission_stats()
RETURNS TABLE (
    today_total BIGINT,
    today_success BIGINT,
    today_failed BIGINT,
    today_credits BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as today_total,
        COUNT(*) FILTER (WHERE c.status = 'success')::BIGINT as today_success,
        COUNT(*) FILTER (WHERE c.status IN ('failed', 'timeout'))::BIGINT as today_failed,
        COALESCE(SUM(c.credits_earned), 0)::BIGINT as today_credits
    FROM commissions c
    WHERE c.created_at >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 작업 유형별 통계
CREATE OR REPLACE FUNCTION get_commission_stats_by_job_type()
RETURNS TABLE (
    job_type job_type,
    total BIGINT,
    success BIGINT,
    failed BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.job_type,
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE c.status = 'success')::BIGINT as success,
        COUNT(*) FILTER (WHERE c.status IN ('failed', 'timeout'))::BIGINT as failed,
        CASE
            WHEN COUNT(*) FILTER (WHERE c.status IN ('success', 'failed', 'timeout')) > 0
            THEN (COUNT(*) FILTER (WHERE c.status = 'success')::NUMERIC /
                  COUNT(*) FILTER (WHERE c.status IN ('success', 'failed', 'timeout'))::NUMERIC * 100)
            ELSE 0
        END as success_rate
    FROM commissions c
    GROUP BY c.job_type;
END;
$$ LANGUAGE plpgsql;

-- 배치 통계 업데이트
CREATE OR REPLACE FUNCTION update_batch_stats(p_batch_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE commission_batches b
    SET
        total_commissions = (SELECT COUNT(*) FROM commissions WHERE batch_id = p_batch_id),
        success_count = (SELECT COUNT(*) FROM commissions WHERE batch_id = p_batch_id AND status = 'success'),
        failed_count = (SELECT COUNT(*) FROM commissions WHERE batch_id = p_batch_id AND status IN ('failed', 'timeout')),
        refused_count = (SELECT COUNT(*) FROM commissions WHERE batch_id = p_batch_id AND status = 'refused'),
        status = CASE
            WHEN (SELECT COUNT(*) FROM commissions WHERE batch_id = p_batch_id AND status IN ('pending', 'assigned', 'sent', 'in_progress')) = 0
            THEN 'success'::commission_status
            ELSE b.status
        END,
        completed_at = CASE
            WHEN (SELECT COUNT(*) FROM commissions WHERE batch_id = p_batch_id AND status IN ('pending', 'assigned', 'sent', 'in_progress')) = 0
            THEN NOW()
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE b.id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 코멘트
-- =====================================================
COMMENT ON TABLE commissions IS 'AI 시민(디바이스)에게 위임하는 작업';
COMMENT ON TABLE commission_batches IS '배치 Commission 그룹';
COMMENT ON TABLE commission_results IS 'Commission 결과 히스토리';
COMMENT ON FUNCTION get_next_commission IS '디바이스에 할당할 다음 Commission 가져오기';
COMMENT ON FUNCTION get_commission_stats IS 'Commission 전체 통계 조회';
