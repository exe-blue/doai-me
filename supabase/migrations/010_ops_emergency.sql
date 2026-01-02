-- ============================================================================
-- Migration 010: Emergency Recovery System
-- OOB (Out-of-Band) Recovery & Auto Self-Healing
-- 
-- "개발자가 실수해도 시스템을 살릴 수 있는 뒷문(OOB)"
-- — Orion
-- 
-- @author Axon (Builder)
-- @version 1.0.0
-- @date 2026-01-02
-- ============================================================================

-- ============================================================================
-- PART 1: OPS EVENTS (복구 이벤트 기록)
-- ============================================================================

-- Recovery level 열거형
CREATE TYPE recovery_level AS ENUM (
    'soft',      -- 소프트 재시작 (스크립트만)
    'service',   -- 서비스 재시작 (Laixi + ADB)
    'power'      -- 전원 재부팅 (2단 승인 필요)
);

-- Event status 열거형
CREATE TYPE ops_event_status AS ENUM (
    'pending',      -- 대기 중
    'awaiting_confirm',  -- 승인 대기 (power만)
    'executing',    -- 실행 중
    'success',      -- 성공
    'failed',       -- 실패
    'timeout',      -- 타임아웃
    'cancelled'     -- 취소됨
);

-- Trigger type 열거형
CREATE TYPE trigger_type AS ENUM (
    'manual',       -- 수동 요청 (API)
    'auto_soft',    -- 자동 (soft)
    'auto_service', -- 자동 (service)
    'alert_only'    -- 경보만 (power)
);

-- Ops Events: 모든 복구 작업 기록
CREATE TABLE ops_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target
    node_id VARCHAR(20) NOT NULL,
    
    -- Recovery Info
    recovery_level recovery_level NOT NULL,
    trigger_type trigger_type NOT NULL,
    reason TEXT NOT NULL,
    
    -- Status
    status ops_event_status DEFAULT 'pending',
    
    -- Confirmation (power만)
    requires_confirmation BOOLEAN DEFAULT false,
    confirmed_by VARCHAR(50),
    confirmed_at TIMESTAMPTZ,
    confirmation_token VARCHAR(64),  -- 2단 승인 토큰
    confirmation_expires_at TIMESTAMPTZ,  -- TTL 120초
    
    -- Execution
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Result
    exit_code INTEGER,
    stdout_preview TEXT,  -- 최대 1000자
    stderr_preview TEXT,  -- 최대 1000자
    error_message TEXT,
    
    -- Audit
    requested_by VARCHAR(50) DEFAULT 'system',
    requester_ip VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ops_events_node ON ops_events(node_id, created_at DESC);
CREATE INDEX idx_ops_events_status ON ops_events(status);
CREATE INDEX idx_ops_events_awaiting_confirm 
    ON ops_events(confirmation_expires_at) 
    WHERE status = 'awaiting_confirm';


-- ============================================================================
-- PART 2: OPS LOCKS (노드별 동시 실행 방지)
-- ============================================================================

CREATE TABLE ops_locks (
    lock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target
    node_id VARCHAR(20) UNIQUE NOT NULL,
    
    -- Lock Info
    locked_by_event_id UUID NOT NULL REFERENCES ops_events(event_id),
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,  -- 기본 600초 (10분)
    
    -- Metadata
    lock_reason TEXT
);

CREATE INDEX idx_ops_locks_expires ON ops_locks(expires_at);


-- ============================================================================
-- PART 3: AUTO RECOVERY POLICY (자동 자가복구 정책)
-- ============================================================================

-- Auto recovery rules
CREATE TABLE auto_recovery_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Condition
    rule_name VARCHAR(100) UNIQUE NOT NULL,
    condition_type VARCHAR(50) NOT NULL,  -- 'device_drop', 'heartbeat_timeout', etc
    threshold_value DECIMAL(5,2),
    
    -- Action
    recovery_level recovery_level NOT NULL,
    cooldown_minutes INTEGER DEFAULT 60,  -- 재실행 제한 (분)
    daily_limit INTEGER DEFAULT 5,        -- 일일 실행 제한
    
    -- State
    enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto recovery execution log
CREATE TABLE auto_recovery_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trigger
    rule_id UUID NOT NULL REFERENCES auto_recovery_rules(rule_id),
    node_id VARCHAR(20) NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Condition Values
    trigger_condition JSONB NOT NULL,
    /*
      {
        "device_count_before": 120,
        "device_count_after": 105,
        "drop_percentage": 12.5
      }
    */
    
    -- Result
    ops_event_id UUID REFERENCES ops_events(event_id),
    executed BOOLEAN DEFAULT false,
    skipped_reason TEXT,  -- 쿨다운, 일일 제한 등
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_auto_recovery_log_node ON auto_recovery_log(node_id, triggered_at DESC);
CREATE INDEX idx_auto_recovery_log_rule ON auto_recovery_log(rule_id, triggered_at DESC);


-- ============================================================================
-- PART 4: FUNCTIONS (API 호출용)
-- ============================================================================

-- Request emergency recovery
CREATE OR REPLACE FUNCTION request_emergency_recovery(
    p_node_id VARCHAR(20),
    p_recovery_level recovery_level,
    p_reason TEXT,
    p_trigger_type trigger_type DEFAULT 'manual',
    p_requested_by VARCHAR(50) DEFAULT 'system',
    p_requester_ip VARCHAR(50) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_requires_confirm BOOLEAN;
    v_confirmation_token VARCHAR(64);
BEGIN
    -- power는 2단 승인 필요
    v_requires_confirm := (p_recovery_level = 'power');
    
    IF v_requires_confirm THEN
        -- 승인 토큰 생성
        v_confirmation_token := encode(gen_random_bytes(32), 'hex');
    END IF;
    
    -- Event 생성
    INSERT INTO ops_events (
        node_id,
        recovery_level,
        trigger_type,
        reason,
        status,
        requires_confirmation,
        confirmation_token,
        confirmation_expires_at,
        requested_by,
        requester_ip
    ) VALUES (
        p_node_id,
        p_recovery_level,
        p_trigger_type,
        p_reason,
        CASE WHEN v_requires_confirm THEN 'awaiting_confirm' ELSE 'pending' END,
        v_requires_confirm,
        v_confirmation_token,
        CASE WHEN v_requires_confirm THEN NOW() + INTERVAL '120 seconds' ELSE NULL END,
        p_requested_by,
        p_requester_ip
    )
    RETURNING event_id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Confirm emergency recovery (power only)
CREATE OR REPLACE FUNCTION confirm_emergency_recovery(
    p_event_id UUID,
    p_confirmation_token VARCHAR(64),
    p_confirmed_by VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    v_event RECORD;
BEGIN
    SELECT * INTO v_event
    FROM ops_events
    WHERE event_id = p_event_id;
    
    IF v_event IS NULL THEN
        RAISE EXCEPTION 'Event not found: %', p_event_id;
    END IF;
    
    IF v_event.status != 'awaiting_confirm' THEN
        RAISE EXCEPTION 'Event is not awaiting confirmation: % (status: %)', p_event_id, v_event.status;
    END IF;
    
    IF v_event.confirmation_token != p_confirmation_token THEN
        RAISE EXCEPTION 'Invalid confirmation token';
    END IF;
    
    IF NOW() > v_event.confirmation_expires_at THEN
        -- 타임아웃
        UPDATE ops_events
        SET status = 'timeout', updated_at = NOW()
        WHERE event_id = p_event_id;
        
        RAISE EXCEPTION 'Confirmation timeout (TTL: 120s)';
    END IF;
    
    -- 승인 처리
    UPDATE ops_events
    SET 
        status = 'pending',
        confirmed_by = p_confirmed_by,
        confirmed_at = NOW(),
        updated_at = NOW()
    WHERE event_id = p_event_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Acquire node lock
CREATE OR REPLACE FUNCTION acquire_node_lock(
    p_node_id VARCHAR(20),
    p_event_id UUID,
    p_lock_duration_seconds INTEGER DEFAULT 600
) RETURNS BOOLEAN AS $$
BEGIN
    -- 기존 lock 정리 (만료된 것)
    DELETE FROM ops_locks
    WHERE expires_at < NOW();
    
    -- Lock 시도
    BEGIN
        INSERT INTO ops_locks (
            node_id,
            locked_by_event_id,
            expires_at,
            lock_reason
        ) VALUES (
            p_node_id,
            p_event_id,
            NOW() + (p_lock_duration_seconds || ' seconds')::INTERVAL,
            'emergency_recovery'
        );
        
        RETURN TRUE;
        
    EXCEPTION WHEN unique_violation THEN
        -- 이미 lock 존재
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql;

-- Release node lock
CREATE OR REPLACE FUNCTION release_node_lock(p_node_id VARCHAR(20)) RETURNS VOID AS $$
BEGIN
    DELETE FROM ops_locks WHERE node_id = p_node_id;
END;
$$ LANGUAGE plpgsql;

-- Check if auto recovery is allowed (쿨다운, 일일 제한)
CREATE OR REPLACE FUNCTION is_auto_recovery_allowed(
    p_rule_id UUID,
    p_node_id VARCHAR(20)
) RETURNS BOOLEAN AS $$
DECLARE
    v_rule RECORD;
    v_last_execution TIMESTAMPTZ;
    v_daily_count INTEGER;
BEGIN
    -- Rule 조회
    SELECT * INTO v_rule
    FROM auto_recovery_rules
    WHERE rule_id = p_rule_id AND enabled = true;
    
    IF v_rule IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 쿨다운 체크 (마지막 실행으로부터 N분)
    SELECT MAX(triggered_at) INTO v_last_execution
    FROM auto_recovery_log
    WHERE rule_id = p_rule_id
      AND node_id = p_node_id
      AND executed = true;
    
    IF v_last_execution IS NOT NULL THEN
        IF NOW() - v_last_execution < (v_rule.cooldown_minutes || ' minutes')::INTERVAL THEN
            RETURN FALSE;  -- 쿨다운 중
        END IF;
    END IF;
    
    -- 일일 제한 체크
    SELECT COUNT(*) INTO v_daily_count
    FROM auto_recovery_log
    WHERE rule_id = p_rule_id
      AND node_id = p_node_id
      AND executed = true
      AND triggered_at > CURRENT_DATE;
    
    IF v_daily_count >= v_rule.daily_limit THEN
        RETURN FALSE;  -- 일일 제한 초과
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- PART 5: INITIAL DATA (기본 정책)
-- ============================================================================

-- 자동 복구 규칙
INSERT INTO auto_recovery_rules (
    rule_name,
    condition_type,
    threshold_value,
    recovery_level,
    cooldown_minutes,
    daily_limit
) VALUES
    ('device_drop_10pct', 'device_drop', 10.0, 'soft', 60, 5),
    ('device_drop_30pct', 'device_drop', 30.0, 'service', 120, 3),
    ('heartbeat_timeout', 'heartbeat_timeout', 30.0, 'soft', 30, 10),
    ('laixi_not_running', 'laixi_status', 0.0, 'service', 60, 5)
ON CONFLICT (rule_name) DO NOTHING;


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ops_events IS '긴급 복구 이벤트 기록: 모든 복구 작업은 여기 audit log로 저장된다';
COMMENT ON COLUMN ops_events.requires_confirmation IS '2단 승인 필요 여부 (power만 true)';
COMMENT ON COLUMN ops_events.confirmation_token IS '승인 토큰 (SHA-256, TTL 120초)';
COMMENT ON COLUMN ops_events.stdout_preview IS 'recover.ps1 실행 결과 (최대 1000자)';

COMMENT ON TABLE ops_locks IS '노드별 동시 실행 방지 Lock (한 번에 하나의 복구 작업만)';
COMMENT ON TABLE auto_recovery_rules IS '자동 자가복구 정책 (soft/service만 자동, power는 경보만)';
COMMENT ON TABLE auto_recovery_log IS '자동 복구 실행 로그 (쿨다운, 일일 제한 추적)';

COMMENT ON FUNCTION request_emergency_recovery IS '긴급 복구 요청: power는 자동으로 awaiting_confirm 상태';
COMMENT ON FUNCTION confirm_emergency_recovery IS 'power 복구 승인 (TTL 120초)';
COMMENT ON FUNCTION acquire_node_lock IS '노드 Lock 획득 (동시 실행 방지)';
COMMENT ON FUNCTION is_auto_recovery_allowed IS '자동 복구 허용 여부 (쿨다운, 일일 제한 체크)';


-- ============================================================================
-- END OF MIGRATION 010
-- 
-- "임의 커맨드 실행은 금지한다. Allowlist only."
-- — Orion
-- ============================================================================
