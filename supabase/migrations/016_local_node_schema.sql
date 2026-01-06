-- ============================================================
-- Migration 016: Local Node Schema
-- DoAi.Me Database v3.2
--
-- Local Node Heartbeat를 위한 스키마 확장
-- - devices 테이블: 디바이스 기본 정보
-- - youtube_video_tasks 테이블: 시청 태스크 큐
-- - personas 테이블 확장 필드
--
-- @author DoAi.Me Team
-- @version 1.0.0
-- @date 2026-01-06
-- ============================================================

-- ============================================================
-- PART 1: DEVICES TABLE (디바이스 기본 정보)
-- ============================================================

-- 디바이스 상태 열거형
DO $$ BEGIN
    CREATE TYPE device_status AS ENUM (
        'online',       -- 온라인: 연결됨
        'offline',      -- 오프라인: 연결 끊김
        'busy',         -- 사용중: 태스크 실행 중
        'error',        -- 오류: 문제 발생
        'charging',     -- 충전중: 충전 모드
        'maintenance'   -- 유지보수: 점검 중
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Devices: 물리적 디바이스 정보
CREATE TABLE IF NOT EXISTS devices (
    -- Identity
    serial VARCHAR(50) PRIMARY KEY,  -- 디바이스 시리얼 번호

    -- Node Assignment
    node_id VARCHAR(50) NOT NULL,  -- 연결된 노드 ID

    -- Device Info
    model VARCHAR(100),  -- 디바이스 모델명
    android_version VARCHAR(20),  -- Android 버전

    -- Status
    status device_status NOT NULL DEFAULT 'offline',
    battery SMALLINT DEFAULT 100 CHECK (battery >= 0 AND battery <= 100),
    is_charging BOOLEAN DEFAULT false,

    -- Timestamps
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for node queries
CREATE INDEX IF NOT EXISTS idx_devices_node_id ON devices(node_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen DESC);


-- ============================================================
-- PART 2: PERSONAS TABLE EXTENSION
-- ============================================================

-- Add columns to personas table if not exists
DO $$
BEGIN
    -- node_id: 연결된 노드
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'node_id') THEN
        ALTER TABLE personas ADD COLUMN node_id VARCHAR(50);
    END IF;

    -- node_name: 노드 이름
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'node_name') THEN
        ALTER TABLE personas ADD COLUMN node_name VARCHAR(100);
    END IF;

    -- device_model: 디바이스 모델
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'device_model') THEN
        ALTER TABLE personas ADD COLUMN device_model VARCHAR(100);
    END IF;

    -- is_online: 온라인 상태
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'is_online') THEN
        ALTER TABLE personas ADD COLUMN is_online BOOLEAN DEFAULT false;
    END IF;

    -- last_seen: 마지막 확인 시각
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'personas' AND column_name = 'last_seen') THEN
        ALTER TABLE personas ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Big Five personality traits (if not exists)
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
END $$;

-- Index for personas queries
CREATE INDEX IF NOT EXISTS idx_personas_node_id ON personas(node_id);
CREATE INDEX IF NOT EXISTS idx_personas_is_online ON personas(is_online);


-- ============================================================
-- PART 3: YOUTUBE_VIDEO_TASKS TABLE (시청 태스크 큐)
-- ============================================================

-- 태스크 상태 열거형
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM (
        'pending',      -- 대기: 아직 시작 안 됨
        'running',      -- 실행: 현재 진행 중
        'completed',    -- 완료: 성공적으로 완료
        'failed',       -- 실패: 오류로 종료
        'cancelled'     -- 취소: 명시적으로 취소됨
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- YouTube Video Tasks: 시청 태스크 큐
CREATE TABLE IF NOT EXISTS youtube_video_tasks (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Video Info
    video_id VARCHAR(20) NOT NULL,  -- YouTube video ID
    video_url TEXT,  -- Full YouTube URL
    video_title TEXT,  -- 영상 제목
    channel_name VARCHAR(100),  -- 채널명

    -- Assignment
    node_id VARCHAR(50),  -- 할당된 노드
    device_serial VARCHAR(50),  -- 할당된 디바이스
    persona_id UUID REFERENCES personas(persona_id),  -- 할당된 페르소나

    -- Task Configuration
    target_duration INTEGER DEFAULT 60,  -- 목표 시청 시간 (초)
    should_like BOOLEAN DEFAULT false,  -- 좋아요 여부
    should_comment BOOLEAN DEFAULT false,  -- 댓글 여부
    should_subscribe BOOLEAN DEFAULT false,  -- 구독 여부
    comment_template TEXT,  -- 댓글 템플릿

    -- Priority
    priority INTEGER DEFAULT 0,  -- 높을수록 우선

    -- Status
    status task_status NOT NULL DEFAULT 'pending',

    -- Results
    actual_duration INTEGER,  -- 실제 시청 시간 (초)
    liked BOOLEAN DEFAULT false,
    commented BOOLEAN DEFAULT false,
    subscribed BOOLEAN DEFAULT false,
    comment_text TEXT,  -- 실제 작성된 댓글
    error_message TEXT,  -- 오류 메시지

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,  -- 시작 시각
    completed_at TIMESTAMPTZ,  -- 완료 시각

    -- Source
    created_by VARCHAR(50) DEFAULT 'SYSTEM',  -- 생성자
    commission_id UUID,  -- 관련 Commission ID (있는 경우)

    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Indexes for task queries
CREATE INDEX IF NOT EXISTS idx_youtube_tasks_status ON youtube_video_tasks(status);
CREATE INDEX IF NOT EXISTS idx_youtube_tasks_node ON youtube_video_tasks(node_id, status);
CREATE INDEX IF NOT EXISTS idx_youtube_tasks_pending ON youtube_video_tasks(status, priority DESC, created_at)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_youtube_tasks_video ON youtube_video_tasks(video_id);


-- ============================================================
-- PART 4: RECOMMENDED_VIDEOS TABLE (랜덤 시청용)
-- ============================================================

CREATE TABLE IF NOT EXISTS recommended_videos (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Video Info
    video_id VARCHAR(20) NOT NULL UNIQUE,
    title TEXT,
    channel_name VARCHAR(100),
    category VARCHAR(50),  -- 카테고리 (music, gaming, etc.)
    duration_seconds INTEGER,  -- 영상 길이

    -- Status
    active BOOLEAN DEFAULT true,  -- 활성화 여부

    -- Stats
    times_watched INTEGER DEFAULT 0,  -- 시청 횟수

    -- Timestamps
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_watched_at TIMESTAMPTZ
);

-- Index for random selection
CREATE INDEX IF NOT EXISTS idx_recommended_videos_active
    ON recommended_videos(active, category);


-- ============================================================
-- PART 5: PERSONA_ACTIVITY_LOGS TABLE (활동 로그)
-- ============================================================

CREATE TABLE IF NOT EXISTS persona_activity_logs (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID REFERENCES personas(persona_id),

    -- Activity
    activity_type VARCHAR(50) NOT NULL,  -- youtube_watch, youtube_like, etc.
    target_url TEXT,  -- 대상 URL
    target_title TEXT,  -- 대상 제목

    -- Points
    points_earned INTEGER DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for activity queries
CREATE INDEX IF NOT EXISTS idx_persona_activity_persona
    ON persona_activity_logs(persona_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_persona_activity_type
    ON persona_activity_logs(activity_type, created_at DESC);


-- ============================================================
-- PART 6: VIEWS (집계 뷰)
-- ============================================================

-- 디바이스 현황 뷰
CREATE OR REPLACE VIEW view_device_status AS
SELECT
    d.serial,
    d.node_id,
    d.model,
    d.status,
    d.battery,
    d.is_charging,
    d.last_seen,
    EXTRACT(EPOCH FROM (NOW() - d.last_seen)) AS seconds_since_seen,
    p.persona_id,
    p.given_name,
    p.persona_state,
    p.is_online AS persona_online,
    (
        SELECT COUNT(*)
        FROM youtube_video_tasks t
        WHERE t.device_serial = d.serial
        AND t.status = 'running'
    ) AS running_tasks,
    (
        SELECT COUNT(*)
        FROM youtube_video_tasks t
        WHERE t.device_serial = d.serial
        AND t.status = 'completed'
        AND t.completed_at > NOW() - INTERVAL '1 hour'
    ) AS completed_tasks_1h
FROM devices d
LEFT JOIN personas p ON p.device_serial = d.serial;


-- 태스크 현황 뷰
CREATE OR REPLACE VIEW view_task_status AS
SELECT
    COUNT(*) AS total_tasks,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending,
    COUNT(*) FILTER (WHERE status = 'running') AS running,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,

    -- Success rate (last hour)
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE status = 'completed'
            AND completed_at > NOW() - INTERVAL '1 hour'
        ) / NULLIF(
            COUNT(*) FILTER (
                WHERE status IN ('completed', 'failed')
                AND completed_at > NOW() - INTERVAL '1 hour'
            ), 0
        ),
        2
    ) AS success_rate_1h,

    -- Average duration (completed)
    ROUND(
        AVG(actual_duration) FILTER (WHERE status = 'completed'),
        2
    ) AS avg_duration_sec,

    NOW() AS snapshot_at
FROM youtube_video_tasks;


-- ============================================================
-- PART 7: RPC FUNCTIONS
-- ============================================================

-- Claim unassigned tasks for a node
CREATE OR REPLACE FUNCTION claim_tasks_for_node(
    p_node_id VARCHAR(50),
    p_max_tasks INTEGER DEFAULT 10
)
RETURNS TABLE (
    task_id UUID,
    video_id VARCHAR(20),
    video_url TEXT,
    target_duration INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH claimed AS (
        UPDATE youtube_video_tasks
        SET node_id = p_node_id
        WHERE id IN (
            SELECT id FROM youtube_video_tasks
            WHERE status = 'pending'
            AND node_id IS NULL
            ORDER BY priority DESC, created_at
            LIMIT p_max_tasks
            FOR UPDATE SKIP LOCKED
        )
        RETURNING id, youtube_video_tasks.video_id, youtube_video_tasks.video_url, youtube_video_tasks.target_duration
    )
    SELECT claimed.id, claimed.video_id, claimed.video_url, claimed.target_duration
    FROM claimed;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- PART 8: RLS POLICIES
-- ============================================================

-- Enable RLS on tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_video_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommended_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_activity_logs ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access)
CREATE POLICY "Service role has full access on devices" ON devices
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access on youtube_video_tasks" ON youtube_video_tasks
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access on recommended_videos" ON recommended_videos
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access on persona_activity_logs" ON persona_activity_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Anon role policies (read + limited write)
CREATE POLICY "Anon can read devices" ON devices
    FOR SELECT USING (true);

CREATE POLICY "Anon can insert/update devices" ON devices
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can update own devices" ON devices
    FOR UPDATE USING (true);

CREATE POLICY "Anon can read tasks" ON youtube_video_tasks
    FOR SELECT USING (true);

CREATE POLICY "Anon can update tasks" ON youtube_video_tasks
    FOR UPDATE USING (true);

CREATE POLICY "Anon can read recommended_videos" ON recommended_videos
    FOR SELECT USING (active = true);

CREATE POLICY "Anon can insert activity_logs" ON persona_activity_logs
    FOR INSERT WITH CHECK (true);


-- ============================================================
-- PART 9: COMMENTS
-- ============================================================

COMMENT ON TABLE devices IS '물리적 디바이스 정보. 각 스마트폰의 시리얼과 상태.';
COMMENT ON TABLE youtube_video_tasks IS 'YouTube 시청 태스크 큐. 영상 시청/좋아요/댓글 작업.';
COMMENT ON TABLE recommended_videos IS '랜덤 시청용 추천 영상 풀.';
COMMENT ON TABLE persona_activity_logs IS '페르소나 활동 로그. 모든 활동 기록.';

COMMENT ON VIEW view_device_status IS '디바이스 현황 대시보드 뷰';
COMMENT ON VIEW view_task_status IS '태스크 현황 집계 뷰';


-- ============================================================
-- PART 10: SAMPLE DATA
-- ============================================================

-- Sample recommended videos for testing
INSERT INTO recommended_videos (video_id, title, channel_name, category, duration_seconds)
VALUES
    ('dQw4w9WgXcQ', 'Never Gonna Give You Up', 'Rick Astley', 'music', 212),
    ('9bZkp7q19f0', 'PSY - GANGNAM STYLE', 'officialpsy', 'music', 252),
    ('JGwWNGJdvx8', 'Ed Sheeran - Shape of You', 'Ed Sheeran', 'music', 263),
    ('kJQP7kiw5Fk', 'Luis Fonsi - Despacito', 'Luis Fonsi', 'music', 282),
    ('RgKAFK5djSk', 'Wiz Khalifa - See You Again', 'Wiz Khalifa', 'music', 237)
ON CONFLICT (video_id) DO NOTHING;


-- ============================================================
-- END OF MIGRATION 016
-- ============================================================
