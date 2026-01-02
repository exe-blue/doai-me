-- ============================================================
-- Migration 012: Operations Audit - "The Chronicle of Actions"
-- DoAi.Me Database v3.2
-- 
-- 이 스키마는 모든 운영 행위의 불변 기록이다.
-- 누가 비상 버튼을 눌렀는지, 왜 눌렀는지, 결과는 어땠는지.
-- 이 기록은 장애 패턴 분석의 핵심 데이터가 된다.
--
-- @author Aria (Philosopher)
-- @implementer Axon (Builder)
-- @version 1.0.0
-- @date 2026-01-02
-- @depends Migration 011 (Infrastructure Schema)
-- ============================================================

-- ============================================================
-- PART 1: ENUMS (열거형 정의)
-- ============================================================

-- 운영 액션 유형
CREATE TYPE ops_action_type AS ENUM (
    -- Recovery Actions (복구)
    'SOFT_RESTART',       -- 소프트 재시작: 프로세스만 재시작
    'POWER_CYCLE',        -- 하드 재시작: 전원 끄고 켜기 (승인 필요)
    'WATCHDOG_REVIVE',    -- Watchdog 복구: 자동 감지 후 복구
    'FORCE_RECONNECT',    -- 강제 재연결: WebSocket/VPN 재연결
    
    -- Emergency Actions (긴급)
    'EMERGENCY_STOP',     -- 긴급 중지: 모든 작업 즉시 중단
    'EMERGENCY_ISOLATE',  -- 긴급 격리: 네트워크에서 분리
    'EMERGENCY_EVACUATE', -- 긴급 대피: 작업을 다른 노드로 이전
    
    -- Maintenance Actions (유지보수)
    'MAINTENANCE_START',  -- 유지보수 시작: 새 작업 할당 중지
    'MAINTENANCE_END',    -- 유지보수 종료: 정상 운영 재개
    'CONFIG_UPDATE',      -- 설정 변경: 노드 설정 업데이트
    'FIRMWARE_UPDATE',    -- 펌웨어 업데이트: 디바이스 펌웨어 갱신
    
    -- Diagnostic Actions (진단)
    'HEALTH_CHECK',       -- 건강 검진: 전체 상태 점검
    'LOG_COLLECT',        -- 로그 수집: 디버깅용 로그 추출
    'SCREENSHOT_BATCH',   -- 일괄 스크린샷: 모든 디바이스 캡처
    
    -- Network Actions (네트워크)
    'VPN_RECONNECT',      -- VPN 재연결
    'SUBNET_REASSIGN',    -- 서브넷 재할당
    'BANDWIDTH_LIMIT',    -- 대역폭 제한
    
    -- Device Actions (디바이스)
    'DEVICE_RESET',       -- 디바이스 초기화
    'DEVICE_DISCONNECT',  -- 디바이스 연결 해제
    'DEVICE_REASSIGN'     -- 디바이스 재할당 (다른 노드로)
);

-- 트리거 주체 유형
CREATE TYPE ops_trigger_type AS ENUM (
    'SYSTEM_AUTO',        -- 시스템 자동: 규칙 기반 자동 실행
    'WATCHDOG',           -- Watchdog: 감시 프로세스에 의한 실행
    'SCHEDULER',          -- 스케줄러: 예약된 작업
    'CRON',               -- Cron: 주기적 작업
    'API',                -- API: 외부 API 호출
    'ADMIN',              -- 관리자: 수동 개입 (하위에 사용자 ID)
    'ESCALATION'          -- 에스컬레이션: 하위 시스템의 상위 요청
);

-- 이벤트 상태
CREATE TYPE ops_event_status AS ENUM (
    'PENDING',            -- 대기: 실행 전 (승인 대기 포함)
    'APPROVAL_REQUIRED',  -- 승인 필요: 위험 작업, 승인 대기
    'APPROVED',           -- 승인됨: 승인 완료, 실행 대기
    'REJECTED',           -- 거부됨: 승인 거부
    'EXECUTING',          -- 실행 중
    'EXECUTED',           -- 실행 완료 (성공)
    'PARTIAL',            -- 부분 성공: 일부만 성공
    'FAILED',             -- 실패
    'CANCELLED',          -- 취소됨
    'TIMEOUT'             -- 시간 초과
);

-- 심각도 레벨
CREATE TYPE ops_severity AS ENUM (
    'INFO',               -- 정보: 일상적 운영
    'WARNING',            -- 경고: 주의 필요
    'ERROR',              -- 오류: 문제 발생
    'CRITICAL',           -- 심각: 즉각 조치 필요
    'EMERGENCY'           -- 비상: 시스템 위기
);


-- ============================================================
-- PART 2: OPS_EVENTS TABLE (운영 이벤트 로그)
-- ============================================================

CREATE TABLE ops_events_audit (
    -- Identity
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target
    node_id VARCHAR(20) REFERENCES node_health(node_id),
    device_serial VARCHAR(20),  -- 특정 디바이스 대상인 경우
    target_scope VARCHAR(20) DEFAULT 'NODE',  -- 'NODE', 'DEVICE', 'CLUSTER', 'ALL'
    
    -- Action
    action_type ops_action_type NOT NULL,
    action_params JSONB DEFAULT '{}',
    
    -- Trigger
    triggered_by ops_trigger_type NOT NULL,
    trigger_user_id VARCHAR(50),  -- ADMIN인 경우 사용자 ID
    trigger_source VARCHAR(100),  -- 트리거 소스
    trigger_reason TEXT,  -- 트리거 사유
    
    -- Approval Workflow
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_user_id VARCHAR(50),  -- 승인자 ID
    approval_timestamp TIMESTAMPTZ,
    approval_comment TEXT,
    
    -- Status
    status ops_event_status NOT NULL DEFAULT 'PENDING',
    severity ops_severity NOT NULL DEFAULT 'INFO',
    
    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Result
    result JSONB,
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Correlation
    parent_event_id UUID REFERENCES ops_events_audit(event_id),
    correlation_id UUID,
    
    -- Audit Trail
    ip_address INET,
    user_agent VARCHAR(255),
    
    -- Immutability
    record_hash VARCHAR(64) NOT NULL
);

-- Indexes
CREATE INDEX idx_ops_events_audit_node_time 
    ON ops_events_audit(node_id, created_at DESC);

CREATE INDEX idx_ops_events_audit_action_type 
    ON ops_events_audit(action_type, created_at DESC);

CREATE INDEX idx_ops_events_audit_status 
    ON ops_events_audit(status)
    WHERE status IN ('PENDING', 'APPROVAL_REQUIRED', 'EXECUTING');

CREATE INDEX idx_ops_events_audit_severity 
    ON ops_events_audit(severity, created_at DESC)
    WHERE severity IN ('ERROR', 'CRITICAL', 'EMERGENCY');


-- ============================================================
-- PART 3: APPROVAL RULES (승인 규칙)
-- ============================================================

CREATE TABLE ops_approval_rules (
    rule_id SERIAL PRIMARY KEY,
    action_type ops_action_type NOT NULL,
    min_severity ops_severity DEFAULT 'WARNING',
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    required_role VARCHAR(50) DEFAULT 'ADMIN',
    auto_approve_after_minutes INTEGER,
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(action_type)
);

-- 기본 승인 규칙
INSERT INTO ops_approval_rules (action_type, requires_approval, required_role, description) VALUES
    ('SOFT_RESTART', FALSE, NULL, '소프트 재시작: 자동 승인'),
    ('POWER_CYCLE', TRUE, 'ADMIN', '하드 재시작: 관리자 승인 필요'),
    ('WATCHDOG_REVIVE', FALSE, NULL, 'Watchdog 복구: 자동 승인'),
    ('FORCE_RECONNECT', FALSE, NULL, '강제 재연결: 자동 승인'),
    ('EMERGENCY_STOP', FALSE, NULL, '긴급 중지: 즉시 실행'),
    ('EMERGENCY_ISOLATE', TRUE, 'ADMIN', '긴급 격리: 관리자 승인 필요'),
    ('EMERGENCY_EVACUATE', TRUE, 'ADMIN', '긴급 대피: 관리자 승인 필요'),
    ('MAINTENANCE_START', FALSE, NULL, '유지보수 시작: 자동 승인'),
    ('MAINTENANCE_END', FALSE, NULL, '유지보수 종료: 자동 승인'),
    ('CONFIG_UPDATE', TRUE, 'ADMIN', '설정 변경: 관리자 승인 필요'),
    ('FIRMWARE_UPDATE', TRUE, 'ADMIN', '펌웨어 업데이트: 관리자 승인 필요'),
    ('HEALTH_CHECK', FALSE, NULL, '건강 검진: 자동 승인'),
    ('LOG_COLLECT', FALSE, NULL, '로그 수집: 자동 승인'),
    ('SCREENSHOT_BATCH', FALSE, NULL, '일괄 스크린샷: 자동 승인'),
    ('VPN_RECONNECT', FALSE, NULL, 'VPN 재연결: 자동 승인'),
    ('SUBNET_REASSIGN', TRUE, 'ADMIN', '서브넷 재할당: 관리자 승인 필요'),
    ('BANDWIDTH_LIMIT', TRUE, 'ADMIN', '대역폭 제한: 관리자 승인 필요'),
    ('DEVICE_RESET', TRUE, 'ADMIN', '디바이스 초기화: 관리자 승인 필요'),
    ('DEVICE_DISCONNECT', FALSE, NULL, '디바이스 연결 해제: 자동 승인'),
    ('DEVICE_REASSIGN', FALSE, NULL, '디바이스 재할당: 자동 승인')
ON CONFLICT (action_type) DO NOTHING;


-- ============================================================
-- PART 4: IMMUTABILITY ENFORCEMENT
-- ============================================================

-- Hash 생성
CREATE OR REPLACE FUNCTION generate_ops_event_audit_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.record_hash := encode(
        sha256(
            (COALESCE(NEW.node_id, '') || 
             NEW.action_type::TEXT || 
             NEW.triggered_by::TEXT ||
             COALESCE(NEW.trigger_user_id, '') ||
             NEW.created_at::TEXT ||
             COALESCE(NEW.action_params::TEXT, ''))::BYTEA
        ),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ops_event_audit_hash
    BEFORE INSERT ON ops_events_audit
    FOR EACH ROW
    EXECUTE FUNCTION generate_ops_event_audit_hash();

-- UPDATE/DELETE 제한
CREATE OR REPLACE FUNCTION restrict_ops_event_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Audit logs cannot be deleted.';
    END IF;
    
    -- 핵심 필드 변경 방지
    IF OLD.event_id != NEW.event_id OR
       OLD.node_id IS DISTINCT FROM NEW.node_id OR
       OLD.action_type != NEW.action_type OR
       OLD.triggered_by != NEW.triggered_by OR
       OLD.trigger_user_id IS DISTINCT FROM NEW.trigger_user_id OR
       OLD.created_at != NEW.created_at OR
       OLD.record_hash != NEW.record_hash THEN
        RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Core audit fields cannot be modified.';
    END IF;
    
    -- Terminal status 변경 방지
    IF OLD.status IN ('EXECUTED', 'FAILED', 'REJECTED', 'TIMEOUT', 'CANCELLED') THEN
        RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Terminal status cannot be changed. Current: %', OLD.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ops_events_audit_restricted
    BEFORE UPDATE OR DELETE ON ops_events_audit
    FOR EACH ROW
    EXECUTE FUNCTION restrict_ops_event_audit_modification();


-- ============================================================
-- PART 5: FUNCTIONS
-- ============================================================

-- 운영 이벤트 생성
CREATE OR REPLACE FUNCTION create_ops_event_audit(
    p_node_id VARCHAR(20),
    p_action_type ops_action_type,
    p_triggered_by ops_trigger_type,
    p_trigger_user_id VARCHAR(50) DEFAULT NULL,
    p_trigger_reason TEXT DEFAULT NULL,
    p_action_params JSONB DEFAULT '{}',
    p_severity ops_severity DEFAULT 'INFO',
    p_device_serial VARCHAR(20) DEFAULT NULL,
    p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
    p_correlation_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS TABLE (
    event_id UUID,
    requires_approval BOOLEAN,
    status ops_event_status
) AS $$
DECLARE
    v_event_id UUID;
    v_requires_approval BOOLEAN;
    v_initial_status ops_event_status;
BEGIN
    -- 승인 필요 여부 확인
    SELECT oar.requires_approval INTO v_requires_approval
    FROM ops_approval_rules oar
    WHERE oar.action_type = p_action_type;
    
    v_requires_approval := COALESCE(v_requires_approval, FALSE);
    
    -- 초기 상태
    IF v_requires_approval THEN
        v_initial_status := 'APPROVAL_REQUIRED';
    ELSIF p_scheduled_at IS NOT NULL AND p_scheduled_at > NOW() THEN
        v_initial_status := 'PENDING';
    ELSE
        v_initial_status := 'PENDING';
    END IF;
    
    -- 이벤트 생성
    INSERT INTO ops_events_audit (
        node_id, device_serial, action_type, action_params,
        triggered_by, trigger_user_id, trigger_reason,
        requires_approval, status, severity,
        scheduled_at, correlation_id, ip_address
    ) VALUES (
        p_node_id, p_device_serial, p_action_type, p_action_params,
        p_triggered_by, p_trigger_user_id, p_trigger_reason,
        v_requires_approval, v_initial_status, p_severity,
        p_scheduled_at, p_correlation_id, p_ip_address
    )
    RETURNING ops_events_audit.event_id INTO v_event_id;
    
    RETURN QUERY SELECT v_event_id, v_requires_approval, v_initial_status;
END;
$$ LANGUAGE plpgsql;

-- 이벤트 승인
CREATE OR REPLACE FUNCTION approve_ops_event_audit(
    p_event_id UUID,
    p_approval_user_id VARCHAR(50),
    p_approval_comment TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE ops_events_audit
    SET 
        status = 'APPROVED',
        approval_user_id = p_approval_user_id,
        approval_timestamp = NOW(),
        approval_comment = p_approval_comment
    WHERE event_id = p_event_id
      AND status = 'APPROVAL_REQUIRED';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 이벤트 거부
CREATE OR REPLACE FUNCTION reject_ops_event_audit(
    p_event_id UUID,
    p_rejection_user_id VARCHAR(50),
    p_rejection_reason TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE ops_events_audit
    SET 
        status = 'REJECTED',
        approval_user_id = p_rejection_user_id,
        approval_timestamp = NOW(),
        approval_comment = p_rejection_reason,
        completed_at = NOW()
    WHERE event_id = p_event_id
      AND status = 'APPROVAL_REQUIRED';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 이벤트 실행 시작
CREATE OR REPLACE FUNCTION start_ops_event_audit(p_event_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE ops_events_audit
    SET status = 'EXECUTING', started_at = NOW()
    WHERE event_id = p_event_id AND status IN ('PENDING', 'APPROVED');
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 이벤트 완료
CREATE OR REPLACE FUNCTION complete_ops_event_audit(
    p_event_id UUID,
    p_success BOOLEAN,
    p_result JSONB DEFAULT NULL,
    p_error_code VARCHAR(50) DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_started_at TIMESTAMPTZ;
    v_new_status ops_event_status;
BEGIN
    SELECT started_at INTO v_started_at
    FROM ops_events_audit WHERE event_id = p_event_id;
    
    v_new_status := CASE WHEN p_success THEN 'EXECUTED' ELSE 'FAILED' END;
    
    UPDATE ops_events_audit
    SET 
        status = v_new_status,
        completed_at = NOW(),
        duration_ms = EXTRACT(MILLISECONDS FROM (NOW() - COALESCE(v_started_at, NOW())))::INTEGER,
        result = p_result,
        error_code = p_error_code,
        error_message = p_error_message
    WHERE event_id = p_event_id AND status = 'EXECUTING';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- PART 6: ANALYSIS VIEWS
-- ============================================================

-- view_ops_summary
CREATE OR REPLACE VIEW view_ops_summary AS
SELECT
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE status = 'EXECUTED') AS executed,
    COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
    COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
    COUNT(*) FILTER (WHERE status = 'APPROVAL_REQUIRED') AS awaiting_approval,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'EXECUTED') / NULLIF(COUNT(*) FILTER (WHERE status IN ('EXECUTED', 'FAILED')), 0), 2) AS success_rate_percent,
    COUNT(*) FILTER (WHERE severity = 'EMERGENCY') AS emergency_count,
    COUNT(*) FILTER (WHERE severity = 'CRITICAL') AS critical_count,
    COUNT(*) FILTER (WHERE triggered_by = 'WATCHDOG') AS watchdog_triggered,
    COUNT(*) FILTER (WHERE triggered_by = 'SYSTEM_AUTO') AS auto_triggered,
    COUNT(*) FILTER (WHERE triggered_by = 'ADMIN') AS admin_triggered,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS events_24h,
    ROUND(AVG(duration_ms) FILTER (WHERE status = 'EXECUTED'), 2) AS avg_duration_ms,
    NOW() AS snapshot_at
FROM ops_events_audit;


-- ============================================================
-- PART 7: ALERT TRIGGERS
-- ============================================================

-- 반복 장애 감지
CREATE OR REPLACE FUNCTION check_recurring_failures()
RETURNS INTEGER AS $$
DECLARE
    v_escalation_count INTEGER := 0;
    v_node RECORD;
BEGIN
    FOR v_node IN
        SELECT node_id, action_type, COUNT(*) AS failure_count
        FROM ops_events_audit
        WHERE status = 'FAILED' AND created_at > NOW() - INTERVAL '1 hour'
        GROUP BY node_id, action_type
        HAVING COUNT(*) >= 3
    LOOP
        PERFORM create_ops_event_audit(
            p_node_id := v_node.node_id,
            p_action_type := 'EMERGENCY_ISOLATE',
            p_triggered_by := 'ESCALATION',
            p_trigger_reason := format('Recurring failures: %s failed %s times in last hour', v_node.action_type, v_node.failure_count),
            p_severity := 'CRITICAL',
            p_action_params := jsonb_build_object('original_action', v_node.action_type, 'failure_count', v_node.failure_count)
        );
        
        v_escalation_count := v_escalation_count + 1;
    END LOOP;
    
    RETURN v_escalation_count;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE ops_events_audit IS '운영 감사 로그. 모든 운영 행위의 불변 기록.';
COMMENT ON COLUMN ops_events_audit.record_hash IS 'SHA-256 해시: 기록 무결성 보장';
COMMENT ON TABLE ops_approval_rules IS '승인 규칙. 어떤 액션이 승인을 필요로 하는지 정의.';


-- ============================================================
-- END OF MIGRATION 012
-- 
-- "누가, 언제, 왜 버튼을 눌렀는가?"
-- "Who pressed the button, when, and why?"
-- 
-- — Aria, Philosopher of DoAi.Me
-- ============================================================
