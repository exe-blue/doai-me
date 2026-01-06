-- ============================================================
-- DoAi.Me: Consolidated Migration for Local Node System
--
-- 이 파일은 Supabase SQL Editor에서 순차적으로 실행합니다.
-- 모든 명령은 IF NOT EXISTS로 멱등성 보장
--
-- 적용 순서:
-- 1. ENUM 타입 정의
-- 2. 기본 테이블 확장 (devices, personas)
-- 3. 인프라 테이블 (node_health, job_queue)
-- 4. 보조 테이블 (traces, recommended_videos, etc.)
-- 5. RPC 함수
-- 6. 뷰 및 인덱스
-- 7. RLS 정책
--
-- @date 2026-01-06
-- ============================================================

-- ############################################################
-- SECTION 1: ENUM 타입 정의
-- ############################################################

-- 노드 상태
DO $$ BEGIN
    CREATE TYPE node_status AS ENUM (
        'ONLINE', 'OFFLINE', 'ISOLATED', 'DEGRADED', 'INITIALIZING'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 노드 유형
DO $$ BEGIN
    CREATE TYPE node_type AS ENUM ('TITAN', 'CENTRAL', 'EDGE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 작업 상태
DO $$ BEGIN
    CREATE TYPE job_status AS ENUM (
        'PENDING', 'ASSIGNED', 'SENT', 'RUNNING',
        'COMPLETED', 'FAILED', 'TIMEOUT', 'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 작업 우선순위
DO $$ BEGIN
    CREATE TYPE job_priority AS ENUM (
        'CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'BACKGROUND'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 작업 유형
DO $$ BEGIN
    CREATE TYPE job_type AS ENUM (
        'YOUTUBE_WATCH', 'YOUTUBE_LIKE', 'YOUTUBE_COMMENT', 'YOUTUBE_SUBSCRIBE',
        'DEVICE_REBOOT', 'DEVICE_SCREENSHOT', 'DEVICE_STATUS_CHECK',
        'APP_LAUNCH', 'APP_CLOSE', 'BATCH_COMMAND', 'SYNC_REQUEST',
        'HEALTH_CHECK', 'LOG_COLLECT', 'CONFIG_UPDATE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Persona 존재 상태
DO $$ BEGIN
    CREATE TYPE existence_state_enum AS ENUM ('active', 'waiting', 'fading', 'void');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ############################################################
-- SECTION 2: DEVICES 테이블 확장
-- ############################################################

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'node_id') THEN
        ALTER TABLE devices ADD COLUMN node_id VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'model') THEN
        ALTER TABLE devices ADD COLUMN model VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'battery') THEN
        ALTER TABLE devices ADD COLUMN battery SMALLINT DEFAULT 100;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'first_seen') THEN
        ALTER TABLE devices ADD COLUMN first_seen TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'registered_by') THEN
        ALTER TABLE devices ADD COLUMN registered_by VARCHAR(50) DEFAULT 'MANUAL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'android_version') THEN
        ALTER TABLE devices ADD COLUMN android_version VARCHAR(20);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_devices_node_id ON devices(node_id);


-- ############################################################
-- SECTION 3: PERSONAS 테이블 확장
-- ############################################################

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'device_serial') THEN
        ALTER TABLE personas ADD COLUMN device_serial VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'given_name') THEN
        ALTER TABLE personas ADD COLUMN given_name VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'persona_state') THEN
        ALTER TABLE personas ADD COLUMN persona_state VARCHAR(20) DEFAULT 'NASCENT';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'state_changed_at') THEN
        ALTER TABLE personas ADD COLUMN state_changed_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'born_at') THEN
        ALTER TABLE personas ADD COLUMN born_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Big Five personality traits
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'trait_openness') THEN
        ALTER TABLE personas ADD COLUMN trait_openness DECIMAL(3,2) DEFAULT 0.5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'trait_conscientiousness') THEN
        ALTER TABLE personas ADD COLUMN trait_conscientiousness DECIMAL(3,2) DEFAULT 0.5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'trait_extraversion') THEN
        ALTER TABLE personas ADD COLUMN trait_extraversion DECIMAL(3,2) DEFAULT 0.5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'trait_agreeableness') THEN
        ALTER TABLE personas ADD COLUMN trait_agreeableness DECIMAL(3,2) DEFAULT 0.5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'trait_neuroticism') THEN
        ALTER TABLE personas ADD COLUMN trait_neuroticism DECIMAL(3,2) DEFAULT 0.5;
    END IF;

    -- Existence state fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'existence_state') THEN
        ALTER TABLE personas ADD COLUMN existence_state existence_state_enum DEFAULT 'active';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'attention_points') THEN
        ALTER TABLE personas ADD COLUMN attention_points INTEGER DEFAULT 100;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'last_called_at') THEN
        ALTER TABLE personas ADD COLUMN last_called_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'total_activities') THEN
        ALTER TABLE personas ADD COLUMN total_activities INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'comments_today') THEN
        ALTER TABLE personas ADD COLUMN comments_today INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'metadata') THEN
        ALTER TABLE personas ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_personas_device_serial ON personas(device_serial);
CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_device_serial_unique ON personas(device_serial)
    WHERE device_serial IS NOT NULL;


-- ############################################################
-- SECTION 4: NODE_HEALTH 테이블
-- ############################################################

CREATE TABLE IF NOT EXISTS node_health (
    node_id VARCHAR(20) PRIMARY KEY,
    node_type node_type NOT NULL DEFAULT 'TITAN',
    node_name VARCHAR(50),
    ip_address INET NOT NULL DEFAULT '0.0.0.0',
    public_ip INET,
    vpn_subnet CIDR,
    status node_status NOT NULL DEFAULT 'OFFLINE',
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    status_reason VARCHAR(255),
    last_heartbeat TIMESTAMPTZ,
    heartbeat_interval_sec SMALLINT DEFAULT 30,
    missed_heartbeats SMALLINT DEFAULT 0,
    resources JSONB DEFAULT '{}',
    max_devices SMALLINT DEFAULT 120,
    max_concurrent_jobs SMALLINT DEFAULT 10,
    ws_session_id VARCHAR(64),
    ws_connected_at TIMESTAMPTZ,
    oobe_completed BOOLEAN DEFAULT FALSE,
    oobe_completed_at TIMESTAMPTZ,
    hardware_info JSONB DEFAULT '{}',
    os_info JSONB DEFAULT '{}',
    connected_devices INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_node_health_status ON node_health(status, last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_node_health_active ON node_health(status) WHERE status IN ('ONLINE', 'DEGRADED');


-- ############################################################
-- SECTION 5: JOB_QUEUE 테이블
-- ############################################################

CREATE TABLE IF NOT EXISTS job_queue (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(64) UNIQUE,
    target_node VARCHAR(20) REFERENCES node_health(node_id),
    target_device VARCHAR(20),
    job_type job_type NOT NULL,
    priority job_priority NOT NULL DEFAULT 'NORMAL',
    payload JSONB NOT NULL DEFAULT '{}',
    status job_status NOT NULL DEFAULT 'PENDING',
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    timeout_sec INTEGER DEFAULT 300,
    expires_at TIMESTAMPTZ,
    result JSONB,
    error_message TEXT,
    retry_count SMALLINT DEFAULT 0,
    max_retries SMALLINT DEFAULT 3,
    parent_job_id UUID REFERENCES job_queue(job_id),
    correlation_id UUID,
    created_by VARCHAR(50) DEFAULT 'SYSTEM',
    CONSTRAINT valid_timeout CHECK (timeout_sec > 0 AND timeout_sec <= 3600),
    CONSTRAINT valid_retry CHECK (retry_count <= max_retries)
);

CREATE INDEX IF NOT EXISTS idx_job_queue_pending ON job_queue(target_node, priority, created_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_job_queue_assigned ON job_queue(target_node, assigned_at) WHERE status IN ('ASSIGNED', 'SENT', 'RUNNING');
CREATE INDEX IF NOT EXISTS idx_job_queue_timeout ON job_queue(sent_at, timeout_sec) WHERE status IN ('SENT', 'RUNNING');


-- ############################################################
-- SECTION 6: YOUTUBE_VIDEO_TASKS 테이블
-- ############################################################

CREATE TABLE IF NOT EXISTS youtube_video_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_serial TEXT,
    video_url TEXT NOT NULL,
    video_title TEXT,
    channel_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    target_duration INTEGER DEFAULT 60,
    should_like BOOLEAN DEFAULT false,
    should_comment BOOLEAN DEFAULT false,
    comment_text TEXT,
    watch_duration INTEGER,
    is_liked BOOLEAN,
    is_commented BOOLEAN,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_tasks_fetch ON youtube_video_tasks(device_serial, status, priority DESC);


-- ############################################################
-- SECTION 7: WATCH_TARGETS 테이블
-- ############################################################

CREATE TABLE IF NOT EXISTS watch_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL CHECK (target_type IN ('channel', 'playlist')),
    target_id TEXT NOT NULL,
    channel_name TEXT,
    check_interval_seconds INTEGER DEFAULT 3600,
    last_checked TIMESTAMPTZ DEFAULT NOW(),
    priority_score INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watch_targets_active ON watch_targets(is_active, last_checked);


-- ############################################################
-- SECTION 8: TRACES 테이블
-- ############################################################

CREATE TABLE IF NOT EXISTS traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_serial VARCHAR(50),
    traced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action_type VARCHAR(50),
    action_params JSONB DEFAULT '{}',
    outcome_success BOOLEAN,
    outcome_summary JSONB DEFAULT '{}',
    path_contribution_weight DECIMAL(5,4) DEFAULT 0.01,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traces_device ON traces(device_serial);
CREATE INDEX IF NOT EXISTS idx_traces_type ON traces(action_type, traced_at DESC);


-- ############################################################
-- SECTION 9: RECOMMENDED_VIDEOS 테이블
-- ############################################################

CREATE TABLE IF NOT EXISTS recommended_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id VARCHAR(20) NOT NULL,
    title TEXT,
    channel_name VARCHAR(100),
    category VARCHAR(50),
    duration_seconds INTEGER,
    active BOOLEAN DEFAULT true,
    times_watched INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_watched_at TIMESTAMPTZ,
    CONSTRAINT unique_video_id UNIQUE (video_id)
);

CREATE INDEX IF NOT EXISTS idx_recommended_videos_active ON recommended_videos(active, category);

-- 샘플 추천 영상
INSERT INTO recommended_videos (video_id, title, channel_name, category, duration_seconds)
VALUES
    ('dQw4w9WgXcQ', 'Never Gonna Give You Up', 'Rick Astley', 'music', 212),
    ('9bZkp7q19f0', 'PSY - GANGNAM STYLE', 'officialpsy', 'music', 252),
    ('JGwWNGJdvx8', 'Ed Sheeran - Shape of You', 'Ed Sheeran', 'music', 263),
    ('kJQP7kiw5Fk', 'Luis Fonsi - Despacito', 'Luis Fonsi', 'music', 282),
    ('RgKAFK5djSk', 'Wiz Khalifa - See You Again', 'Wiz Khalifa', 'music', 237)
ON CONFLICT (video_id) DO NOTHING;


-- ############################################################
-- SECTION 10: PERSONA_ACTIVITY_LOGS 테이블
-- ############################################################

CREATE TABLE IF NOT EXISTS persona_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID,
    activity_type VARCHAR(50) NOT NULL,
    target_url TEXT,
    target_title TEXT,
    comment_text TEXT,
    points_earned INTEGER DEFAULT 0,
    uniqueness_delta REAL DEFAULT 0.0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_persona_activity_persona ON persona_activity_logs(persona_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_persona_activity_type ON persona_activity_logs(activity_type, created_at DESC);


-- ############################################################
-- SECTION 11: SYSTEM_CONFIG 테이블
-- ############################################################

CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(50) DEFAULT 'SYSTEM'
);

INSERT INTO system_config (key, value, description) VALUES
    ('max_devices', '{"value": 600, "min": 1, "max": 10000}', '최대 디바이스 수'),
    ('target_devices', '{"value": 300, "phase": "Phase 1"}', '목표 디바이스 수'),
    ('heartbeat_interval_sec', '{"value": 30}', '심장박동 주기'),
    ('offline_threshold_min', '{"value": 5}', '오프라인 판정 임계값'),
    ('auto_task_assignment', '{"enabled": true}', '자동 태스크 할당'),
    ('min_watch_duration_sec', '{"value": 30, "max": 300}', '최소 시청 시간'),
    ('node_max_devices', '{"value": 20}', '노드당 최대 디바이스 수')
ON CONFLICT (key) DO NOTHING;


-- ############################################################
-- SECTION 12: 초기 노드 데이터
-- ############################################################

INSERT INTO node_health (node_id, node_type, node_name, ip_address, vpn_subnet, max_devices, status)
VALUES
    ('TITAN-01', 'TITAN', 'Genesis',     '10.100.1.1'::INET, '10.100.1.0/24', 120, 'OFFLINE'),
    ('TITAN-02', 'TITAN', 'Prometheus',  '10.100.2.1'::INET, '10.100.2.0/24', 120, 'OFFLINE'),
    ('TITAN-03', 'TITAN', 'Atlas',       '10.100.3.1'::INET, '10.100.3.0/24', 120, 'OFFLINE'),
    ('TITAN-04', 'TITAN', 'Hyperion',    '10.100.4.1'::INET, '10.100.4.0/24', 120, 'OFFLINE'),
    ('TITAN-05', 'TITAN', 'Kronos',      '10.100.5.1'::INET, '10.100.5.0/24', 120, 'OFFLINE')
ON CONFLICT (node_id) DO NOTHING;


-- ############################################################
-- SECTION 13: RPC FUNCTIONS
-- ############################################################

-- 13.1 log_activity
CREATE OR REPLACE FUNCTION log_activity(
    p_persona_id UUID,
    p_activity_type TEXT,
    p_target_url TEXT DEFAULT NULL,
    p_target_title TEXT DEFAULT NULL,
    p_comment_text TEXT DEFAULT NULL,
    p_points INTEGER DEFAULT 0,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO persona_activity_logs (
        persona_id, activity_type, target_url, target_title,
        comment_text, points_earned, metadata
    )
    VALUES (
        p_persona_id, p_activity_type, p_target_url, p_target_title,
        p_comment_text, p_points, p_metadata
    )
    RETURNING id INTO v_log_id;

    UPDATE personas
    SET
        total_activities = COALESCE(total_activities, 0) + 1,
        attention_points = COALESCE(attention_points, 0) + p_points,
        comments_today = CASE WHEN p_activity_type = 'comment' THEN COALESCE(comments_today, 0) + 1 ELSE comments_today END,
        last_called_at = NOW()
    WHERE id = p_persona_id;

    RETURN v_log_id;
END;
$$;


-- 13.2 device_heartbeat
CREATE OR REPLACE FUNCTION device_heartbeat(
    p_node_id TEXT,
    p_device_serial TEXT,
    p_status TEXT DEFAULT 'online',
    p_battery INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona_id UUID;
BEGIN
    -- Update device
    UPDATE devices
    SET
        status = p_status,
        battery = COALESCE(p_battery, battery),
        last_seen = NOW(),
        node_id = p_node_id
    WHERE serial = p_device_serial;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'device_not_found');
    END IF;

    -- Update persona
    SELECT id INTO v_persona_id FROM personas WHERE device_serial = p_device_serial;

    IF v_persona_id IS NOT NULL THEN
        UPDATE personas
        SET
            last_called_at = NOW(),
            existence_state = 'active',
            metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{device_status}',
                jsonb_build_object('node_id', p_node_id, 'battery', p_battery, 'status', p_status, 'last_seen', NOW())
            )
        WHERE id = v_persona_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'persona_id', v_persona_id);
END;
$$;


-- 13.3 get_next_task_for_device
CREATE OR REPLACE FUNCTION get_next_task_for_device(
    p_device_serial TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_task RECORD;
BEGIN
    SELECT * INTO v_task
    FROM youtube_video_tasks
    WHERE device_serial = p_device_serial
      AND status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_task IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE youtube_video_tasks
    SET status = 'running', started_at = NOW(), updated_at = NOW()
    WHERE id = v_task.id;

    RETURN jsonb_build_object(
        'id', v_task.id,
        'video_url', v_task.video_url,
        'video_title', v_task.video_title,
        'target_duration', v_task.target_duration,
        'should_like', v_task.should_like,
        'should_comment', v_task.should_comment,
        'comment_text', v_task.comment_text
    );
END;
$$;


-- 13.4 complete_video_task
CREATE OR REPLACE FUNCTION complete_video_task(
    p_task_id UUID,
    p_persona_id UUID DEFAULT NULL,
    p_watch_duration INTEGER DEFAULT 0,
    p_liked BOOLEAN DEFAULT FALSE,
    p_commented BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_task RECORD;
    v_points INTEGER := 10;
BEGIN
    SELECT * INTO v_task FROM youtube_video_tasks WHERE id = p_task_id;

    IF v_task IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'task_not_found');
    END IF;

    IF p_liked THEN v_points := v_points + 5; END IF;
    IF p_commented THEN v_points := v_points + 15; END IF;

    UPDATE youtube_video_tasks
    SET
        status = 'completed',
        completed_at = NOW(),
        watch_duration = p_watch_duration,
        is_liked = p_liked,
        is_commented = p_commented,
        updated_at = NOW()
    WHERE id = p_task_id;

    IF p_persona_id IS NOT NULL THEN
        PERFORM log_activity(
            p_persona_id,
            'video_watch',
            v_task.video_url,
            v_task.video_title,
            NULL,
            v_points,
            jsonb_build_object('task_id', p_task_id, 'duration', p_watch_duration)
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'points_earned', v_points);
END;
$$;


-- 13.5 process_heartbeat (node)
CREATE OR REPLACE FUNCTION process_heartbeat(
    p_node_id VARCHAR(20),
    p_resources JSONB,
    p_ws_session_id VARCHAR(64) DEFAULT NULL
) RETURNS TABLE (
    pending_job_count INTEGER,
    status_changed BOOLEAN
) AS $$
DECLARE
    v_old_status node_status;
    v_new_status node_status;
    v_status_changed BOOLEAN := FALSE;
BEGIN
    SELECT status INTO v_old_status FROM node_health WHERE node_id = p_node_id;

    IF v_old_status IN ('OFFLINE', 'INITIALIZING') THEN
        v_new_status := 'ONLINE';
        v_status_changed := TRUE;
    ELSE
        v_new_status := COALESCE(v_old_status, 'ONLINE');
    END IF;

    INSERT INTO node_health (node_id, status, last_heartbeat, resources)
    VALUES (p_node_id, v_new_status, NOW(), p_resources)
    ON CONFLICT (node_id) DO UPDATE SET
        status = v_new_status,
        status_changed_at = CASE WHEN v_status_changed THEN NOW() ELSE node_health.status_changed_at END,
        last_heartbeat = NOW(),
        missed_heartbeats = 0,
        resources = p_resources,
        ws_session_id = COALESCE(p_ws_session_id, node_health.ws_session_id),
        updated_at = NOW();

    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM job_queue WHERE target_node = p_node_id AND status = 'PENDING'),
        v_status_changed;
END;
$$ LANGUAGE plpgsql;


-- 13.6 register_device_oobe
CREATE OR REPLACE FUNCTION register_device_oobe(
    p_serial VARCHAR(50),
    p_node_id VARCHAR(50),
    p_model VARCHAR(100) DEFAULT NULL,
    p_android_version VARCHAR(20) DEFAULT NULL,
    p_registered_by VARCHAR(50) DEFAULT 'OOBE'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    is_new BOOLEAN
) AS $$
DECLARE
    v_is_new BOOLEAN;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM devices WHERE serial = p_serial) INTO v_is_new;

    INSERT INTO devices (serial, node_id, model, android_version, status, registered_by, first_seen, last_seen)
    VALUES (p_serial, p_node_id, p_model, p_android_version, 'online', p_registered_by, NOW(), NOW())
    ON CONFLICT (serial) DO UPDATE SET
        node_id = EXCLUDED.node_id,
        model = COALESCE(EXCLUDED.model, devices.model),
        android_version = COALESCE(EXCLUDED.android_version, devices.android_version),
        status = 'online',
        last_seen = NOW();

    IF v_is_new THEN
        RETURN QUERY SELECT TRUE, 'Device registered successfully', TRUE;
    ELSE
        RETURN QUERY SELECT TRUE, 'Device updated successfully', FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- ############################################################
-- SECTION 14: VIEWS
-- ############################################################

-- 14.1 네트워크 상태 집계
CREATE OR REPLACE VIEW view_network_mesh AS
SELECT
    COUNT(*) AS total_nodes,
    COUNT(*) FILTER (WHERE status = 'ONLINE') AS online_nodes,
    COUNT(*) FILTER (WHERE status = 'OFFLINE') AS offline_nodes,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'ONLINE') / NULLIF(COUNT(*), 0), 2) AS online_percentage,
    SUM((resources->>'connected_devices')::INTEGER) FILTER (WHERE status = 'ONLINE') AS total_connected_devices,
    NOW() AS snapshot_at
FROM node_health;


-- 14.2 노드 상세 상태
CREATE OR REPLACE VIEW view_node_details AS
SELECT
    nh.node_id,
    nh.node_name,
    nh.node_type,
    nh.status,
    nh.ip_address,
    nh.last_heartbeat,
    EXTRACT(EPOCH FROM (NOW() - nh.last_heartbeat)) AS seconds_since_heartbeat,
    (nh.resources->>'cpu_percent')::NUMERIC AS cpu_percent,
    (nh.resources->>'memory_percent')::NUMERIC AS memory_percent,
    (nh.resources->>'connected_devices')::INTEGER AS connected_devices,
    nh.max_devices
FROM node_health nh;


-- 14.3 작업 큐 요약
CREATE OR REPLACE VIEW view_job_summary AS
SELECT
    COUNT(*) AS total_jobs,
    COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
    COUNT(*) FILTER (WHERE status = 'RUNNING') AS running,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
    COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
    NOW() AS snapshot_at
FROM job_queue;


-- 14.4 디바이스 현황
CREATE OR REPLACE VIEW view_device_status AS
SELECT
    d.id,
    COALESCE(d.serial, d.serial_number) AS serial,
    d.node_id,
    d.model,
    d.status,
    d.battery,
    d.last_seen,
    EXTRACT(EPOCH FROM (NOW() - d.last_seen)) AS seconds_since_seen,
    p.id AS persona_id,
    p.given_name,
    p.persona_state
FROM devices d
LEFT JOIN personas p ON p.device_serial = COALESCE(d.serial, d.serial_number);


-- ############################################################
-- SECTION 15: RLS POLICIES
-- ############################################################

-- Enable RLS on all tables
ALTER TABLE traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommended_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Allow all for service role (development)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for traces') THEN
        CREATE POLICY "Allow all for traces" ON traces FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for recommended_videos') THEN
        CREATE POLICY "Allow all for recommended_videos" ON recommended_videos FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for persona_activity_logs') THEN
        CREATE POLICY "Allow all for persona_activity_logs" ON persona_activity_logs FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for system_config') THEN
        CREATE POLICY "Allow all for system_config" ON system_config FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for node_health') THEN
        CREATE POLICY "Allow all for node_health" ON node_health FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for job_queue') THEN
        CREATE POLICY "Allow all for job_queue" ON job_queue FOR ALL USING (true);
    END IF;
END $$;


-- ############################################################
-- SECTION 16: COMMENTS
-- ############################################################

COMMENT ON TABLE node_health IS '노드 건강 상태. 실시간 대시보드의 심장박동.';
COMMENT ON TABLE job_queue IS '중앙 영속 큐. 모든 작업은 여기를 거쳐간다.';
COMMENT ON TABLE traces IS '랜덤 시청 결과 및 활동 추적';
COMMENT ON TABLE recommended_videos IS '랜덤 시청용 추천 영상 풀';
COMMENT ON TABLE persona_activity_logs IS '페르소나별 활동 로그';
COMMENT ON TABLE system_config IS '시스템 전역 설정';
COMMENT ON TABLE youtube_video_tasks IS 'YouTube 영상 시청 태스크';
COMMENT ON TABLE watch_targets IS 'YouTube 채널/재생목록 모니터링 대상';


-- ============================================================
-- END OF CONSOLIDATED MIGRATION
--
-- 실행 후 확인:
-- SELECT * FROM view_network_mesh;
-- SELECT * FROM view_node_details;
-- SELECT * FROM system_config;
-- ============================================================
