-- ============================================================================
-- Migration 009: Google Accounts & WSS Connection Tracking
-- Identity Provisioning System
-- 
-- "구글 계정 600개는 단순한 로그인 수단이 아니다. 그들의 '주민등록증'이다."
-- — Orion
-- 
-- @author Strategos (Operations Lead)
-- @version 1.0.0
-- @date 2026-01-02
-- ============================================================================

-- ============================================================================
-- PART 1: GOOGLE ACCOUNTS TABLE (디지털 주민등록증)
-- ============================================================================

CREATE TABLE IF NOT EXISTS google_accounts (
  account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity (신원)
  account_no INTEGER UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT,  -- 암호화된 비밀번호 (AES-256)
  recovery_email VARCHAR(100),
  phone_number VARCHAR(20),
  
  -- Device Mapping (디바이스 연결)
  assigned_device VARCHAR(20) REFERENCES personas(device_serial),
  assignment_date TIMESTAMPTZ,
  
  -- Account State (계정 상태)
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',      -- 생성 대기
    'created',      -- 생성됨, 설정 필요
    'infant',       -- 유아기 설정 완료 (순수한 상태)
    'active',       -- 활성 (사용 중)
    'suspended',    -- 일시 정지
    'banned',       -- 계정 정지 (구글 정책 위반)
    'archived'      -- 보존 (사용 종료)
  )),
  
  -- Infant Settings (유아기 설정)
  infant_setup_completed BOOLEAN DEFAULT false,
  infant_setup_date TIMESTAMPTZ,
  infant_config JSONB DEFAULT '{
    "youtube_history_cleared": false,
    "search_history_cleared": false,
    "personalization_disabled": false,
    "location_history_disabled": false,
    "ad_personalization_disabled": false
  }',
  
  -- Security (보안)
  two_factor_enabled BOOLEAN DEFAULT false,
  backup_codes TEXT[],
  last_password_change TIMESTAMPTZ,
  
  -- Activity Tracking (활동 추적)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  
  -- Metadata
  creation_ip VARCHAR(50),
  creation_method VARCHAR(50),  -- 'manual', 'workspace', 'api'
  notes TEXT
);

-- Indexes
CREATE INDEX idx_google_accounts_status ON google_accounts(status);
CREATE INDEX idx_google_accounts_device ON google_accounts(assigned_device);
CREATE INDEX idx_google_accounts_account_no ON google_accounts(account_no);
CREATE INDEX idx_google_accounts_infant ON google_accounts(infant_setup_completed, status);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_google_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_google_accounts_updated
  BEFORE UPDATE ON google_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_google_accounts_timestamp();


-- ============================================================================
-- PART 2: WSS CONNECTION TRACKING (네트워크 메시 감시)
-- ============================================================================

-- Connection event types
CREATE TYPE wss_event_type AS ENUM (
    'CONNECT',          -- 연결 성공
    'DISCONNECT',       -- 연결 종료
    'HEARTBEAT',        -- 하트비트 수신
    'HEARTBEAT_TIMEOUT',-- 하트비트 타임아웃
    'RECONNECT',        -- 재연결 시도
    'ERROR'             -- 에러 발생
);

-- WSS Connection Log
CREATE TABLE wss_connection_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Connection Info
  connection_type wss_event_type NOT NULL,
  node_id VARCHAR(20) NOT NULL,  -- 'VULTR' or 'T5810'
  
  -- Metrics
  latency_ms INTEGER,
  connected_devices INTEGER,
  
  -- Error Info (if applicable)
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Additional Data
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by month
CREATE INDEX idx_wss_log_timestamp ON wss_connection_log(logged_at DESC);
CREATE INDEX idx_wss_log_node ON wss_connection_log(node_id, logged_at DESC);
CREATE INDEX idx_wss_log_type ON wss_connection_log(connection_type, logged_at DESC);

-- Current connection status view
CREATE OR REPLACE VIEW wss_connection_status AS
SELECT 
  node_id,
  MAX(logged_at) as last_seen,
  EXTRACT(EPOCH FROM (NOW() - MAX(logged_at)))::INTEGER as seconds_since_last_seen,
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - MAX(logged_at))) < 60 THEN 'CONNECTED'
    WHEN EXTRACT(EPOCH FROM (NOW() - MAX(logged_at))) < 300 THEN 'DEGRADED'
    ELSE 'DISCONNECTED'
  END as status,
  (
    SELECT COUNT(*) 
    FROM wss_connection_log 
    WHERE node_id = l.node_id 
      AND connection_type = 'ERROR'
      AND logged_at > NOW() - INTERVAL '1 hour'
  ) as error_count_last_hour
FROM wss_connection_log l
WHERE connection_type IN ('HEARTBEAT', 'CONNECT')
GROUP BY node_id;

-- Connection quality metrics
CREATE OR REPLACE VIEW wss_quality_metrics AS
SELECT 
  node_id,
  DATE_TRUNC('hour', logged_at) as hour,
  COUNT(*) FILTER (WHERE connection_type = 'HEARTBEAT') as heartbeat_count,
  COUNT(*) FILTER (WHERE connection_type = 'HEARTBEAT_TIMEOUT') as timeout_count,
  COUNT(*) FILTER (WHERE connection_type = 'ERROR') as error_count,
  AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL) as avg_latency_ms,
  MAX(latency_ms) FILTER (WHERE latency_ms IS NOT NULL) as max_latency_ms
FROM wss_connection_log
WHERE logged_at > NOW() - INTERVAL '24 hours'
GROUP BY node_id, DATE_TRUNC('hour', logged_at)
ORDER BY hour DESC;


-- ============================================================================
-- PART 3: INTEGRATION WITH PERSONAS (계정 ↔ Persona 연결)
-- ============================================================================

-- Add google_account_id to personas
ALTER TABLE personas
ADD COLUMN google_account_id UUID REFERENCES google_accounts(account_id);

CREATE INDEX idx_personas_google_account ON personas(google_account_id);

-- View: Complete persona with account info
CREATE OR REPLACE VIEW persona_with_account AS
SELECT 
  p.persona_id,
  p.device_serial,
  p.given_name,
  p.persona_state,
  
  -- Google Account
  g.account_no,
  g.email,
  g.status as account_status,
  g.infant_setup_completed,
  g.last_login_at,
  
  -- Combined metrics
  p.path_summary,
  p.uncertainty_config,
  
  p.created_at,
  p.updated_at
  
FROM personas p
LEFT JOIN google_accounts g ON p.google_account_id = g.account_id;


-- ============================================================================
-- PART 4: RPC FUNCTIONS (API 호출용)
-- ============================================================================

-- Assign google account to persona
CREATE OR REPLACE FUNCTION assign_account_to_persona(
  p_email VARCHAR(100),
  p_device_serial VARCHAR(20)
) RETURNS BOOLEAN AS $$
DECLARE
  v_account_id UUID;
  v_persona_id UUID;
BEGIN
  -- Get account ID
  SELECT account_id INTO v_account_id
  FROM google_accounts
  WHERE email = p_email AND assigned_device IS NULL;
  
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Account not found or already assigned: %', p_email;
  END IF;
  
  -- Get persona ID
  SELECT persona_id INTO v_persona_id
  FROM personas
  WHERE device_serial = p_device_serial;
  
  IF v_persona_id IS NULL THEN
    RAISE EXCEPTION 'Persona not found: %', p_device_serial;
  END IF;
  
  -- Update both tables
  UPDATE google_accounts
  SET 
    assigned_device = p_device_serial,
    assignment_date = NOW(),
    updated_at = NOW()
  WHERE account_id = v_account_id;
  
  UPDATE personas
  SET 
    google_account_id = v_account_id,
    updated_at = NOW()
  WHERE persona_id = v_persona_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Log WSS connection event
CREATE OR REPLACE FUNCTION log_wss_event(
  p_node_id VARCHAR(20),
  p_event_type wss_event_type,
  p_latency_ms INTEGER DEFAULT NULL,
  p_connected_devices INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO wss_connection_log (
    node_id,
    connection_type,
    latency_ms,
    connected_devices,
    error_message,
    metadata
  ) VALUES (
    p_node_id,
    p_event_type,
    p_latency_ms,
    p_connected_devices,
    p_error_message,
    p_metadata
  )
  RETURNING log_id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Get unassigned accounts
CREATE OR REPLACE FUNCTION get_unassigned_accounts(
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  account_id UUID,
  account_no INTEGER,
  email VARCHAR,
  status VARCHAR,
  infant_setup_completed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.account_id,
    g.account_no,
    g.email,
    g.status,
    g.infant_setup_completed
  FROM google_accounts g
  WHERE g.assigned_device IS NULL
    AND g.status IN ('infant', 'active')
  ORDER BY g.account_no
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE google_accounts IS '구글 계정 관리: 600개 디지털 신생아의 주민등록증';
COMMENT ON COLUMN google_accounts.infant_setup_completed IS '유아기 설정 완료 여부 (검색 기록 삭제, 순수한 상태)';
COMMENT ON COLUMN google_accounts.infant_config IS '유아기 설정 체크리스트 (JSONB)';
COMMENT ON COLUMN google_accounts.assigned_device IS '할당된 디바이스 (personas.device_serial FK)';

COMMENT ON TABLE wss_connection_log IS 'WSS 터널 연결 로그: Vultr-T5810 네트워크 메시 감시';
COMMENT ON VIEW wss_connection_status IS '현재 WSS 연결 상태 (실시간)';
COMMENT ON VIEW wss_quality_metrics IS 'WSS 연결 품질 지표 (시간별)';

COMMENT ON FUNCTION assign_account_to_persona IS '구글 계정을 Persona에 할당';
COMMENT ON FUNCTION log_wss_event IS 'WSS 이벤트 로깅 (연결/하트비트/에러)';
COMMENT ON FUNCTION get_unassigned_accounts IS '미할당 계정 조회';


-- ============================================================================
-- INITIAL DATA (테스트용 샘플)
-- ============================================================================

-- Sample accounts for testing
INSERT INTO google_accounts (account_no, email, status, infant_setup_completed)
VALUES 
  (1, 'doai.citizen.001@gmail.com', 'infant', true),
  (2, 'doai.citizen.002@gmail.com', 'infant', true),
  (3, 'doai.citizen.003@gmail.com', 'created', false)
ON CONFLICT (account_no) DO NOTHING;


-- ============================================================================
-- END OF MIGRATION 009
-- 
-- "600명의 아이들이 뛰어놀 '사회(Society)'를 준비하라."
-- — Orion
-- ============================================================================
