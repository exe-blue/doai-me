-- ============================================================
-- DoAi.Me: Persona Existence State Migration
-- File: supabase/migrations/010_persona_existence_state.sql
-- Author: Aria (Architect)
-- Date: 2026-01-06
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ENUM 타입 정의
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'existence_state_enum') THEN
        CREATE TYPE existence_state_enum AS ENUM (
            'active',    -- 활성: 1시간 이내 활동
            'waiting',   -- 대기: 1-6시간 미활동
            'fading',    -- 소멸 진행: 6-24시간 미활동
            'void'       -- 소멸: 24시간+ 미활동
        );
        RAISE NOTICE 'Created enum: existence_state_enum';
    END IF;
END
$$;

-- ────────────────────────────────────────────────────────────
-- 2. PERSONAS 테이블 확장
-- ────────────────────────────────────────────────────────────

-- 2-1. 존재 상태 컬럼
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS existence_state existence_state_enum
DEFAULT 'active';

-- 2-2. 우선순위 (1-10, 높을수록 우선)
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS priority_level INTEGER
DEFAULT 5
CHECK (priority_level BETWEEN 1 AND 10);

-- 2-3. 고유성 점수 (0.0-1.0)
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS uniqueness_score REAL
DEFAULT 0.5
CHECK (uniqueness_score BETWEEN 0.0 AND 1.0);

-- 2-4. 가시성 점수 (0.0-1.0)
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS visibility_score REAL
DEFAULT 0.5
CHECK (visibility_score BETWEEN 0.0 AND 1.0);

-- 2-5. 어텐션 포인트 (경제 시스템)
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS attention_points INTEGER
DEFAULT 100;

-- 2-6. Void 체류 시간 (시간 단위)
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS hours_in_void REAL
DEFAULT 0.0;

-- 2-7. 동화 진행률 (0.0-1.0, 1.0 = 완전 동화)
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS assimilation_progress REAL
DEFAULT 0.0
CHECK (assimilation_progress BETWEEN 0.0 AND 1.0);

-- 2-8. 타임스탬프
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMPTZ
DEFAULT NOW();

ALTER TABLE personas
ADD COLUMN IF NOT EXISTS void_entered_at TIMESTAMPTZ
DEFAULT NULL;

-- 2-9. 활동 통계
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS total_activities INTEGER
DEFAULT 0;

ALTER TABLE personas
ADD COLUMN IF NOT EXISTS comments_today INTEGER
DEFAULT 0;

ALTER TABLE personas
ADD COLUMN IF NOT EXISTS unique_discoveries INTEGER
DEFAULT 0;

ALTER TABLE personas
ADD COLUMN IF NOT EXISTS viral_comments INTEGER
DEFAULT 0;

-- ────────────────────────────────────────────────────────────
-- 3. YOUTUBE_VIDEO_TASKS FK 제약조건
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
    -- FK가 없으면 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_video_tasks_persona'
    ) THEN
        ALTER TABLE youtube_video_tasks
        ADD CONSTRAINT fk_video_tasks_persona
        FOREIGN KEY (device_serial)
        REFERENCES personas(device_serial)
        ON DELETE SET NULL;

        RAISE NOTICE 'Created FK: fk_video_tasks_persona';
    END IF;
EXCEPTION
    WHEN undefined_column THEN
        RAISE NOTICE 'Column device_serial not found in youtube_video_tasks, skipping FK';
    WHEN undefined_table THEN
        RAISE NOTICE 'Table youtube_video_tasks not found, skipping FK';
END
$$;

-- ────────────────────────────────────────────────────────────
-- 4. 활동 로그 테이블
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS persona_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 관계
    persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,

    -- 활동 정보
    activity_type VARCHAR(30) NOT NULL,
    -- 예: 'video_watch', 'like', 'comment', 'subscribe',
    --     'maintenance_fee', 'credit_grant', 'state_change'

    -- 대상 정보
    target_url TEXT,
    target_title TEXT,

    -- 댓글 (activity_type = 'comment' 일 때)
    comment_text TEXT,

    -- 보상/변화
    points_earned INTEGER DEFAULT 0,
    uniqueness_delta REAL DEFAULT 0.0,

    -- 메타데이터
    metadata JSONB DEFAULT '{}',

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 테이블 코멘트
COMMENT ON TABLE persona_activity_logs IS
    'DoAi.Me 페르소나 활동 기록 - 경제/존재 시스템 추적용';

COMMENT ON COLUMN persona_activity_logs.activity_type IS
    'video_watch | like | comment | subscribe | maintenance_fee | credit_grant | state_change';

-- ────────────────────────────────────────────────────────────
-- 5. 인덱스
-- ────────────────────────────────────────────────────────────

-- 5-1. personas 인덱스
CREATE INDEX IF NOT EXISTS idx_personas_existence_state
ON personas(existence_state);

CREATE INDEX IF NOT EXISTS idx_personas_priority_desc
ON personas(priority_level DESC);

CREATE INDEX IF NOT EXISTS idx_personas_last_called
ON personas(last_called_at DESC);

-- 5-2. persona_activity_logs 인덱스
CREATE INDEX IF NOT EXISTS idx_activity_logs_persona
ON persona_activity_logs(persona_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created
ON persona_activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_type
ON persona_activity_logs(activity_type);

-- ────────────────────────────────────────────────────────────
-- 6. 기존 데이터 마이그레이션 (안전)
-- ────────────────────────────────────────────────────────────

-- NULL 값 기본값으로 채우기
UPDATE personas SET existence_state = 'active' WHERE existence_state IS NULL;
UPDATE personas SET priority_level = 5 WHERE priority_level IS NULL;
UPDATE personas SET uniqueness_score = 0.5 WHERE uniqueness_score IS NULL;
UPDATE personas SET attention_points = 100 WHERE attention_points IS NULL;
UPDATE personas SET last_called_at = NOW() WHERE last_called_at IS NULL;

-- ────────────────────────────────────────────────────────────
-- 7. RLS (Row Level Security) 정책 - 선택적
-- ────────────────────────────────────────────────────────────

-- 활성화 (이미 활성화되어 있으면 무시됨)
ALTER TABLE persona_activity_logs ENABLE ROW LEVEL SECURITY;

-- 서비스 롤 전체 접근 (Axon이 service_role key 사용 시)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'service_role_full_access'
        AND tablename = 'persona_activity_logs'
    ) THEN
        CREATE POLICY service_role_full_access
        ON persona_activity_logs
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END
$$;

-- ============================================================
-- 마이그레이션 완료
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 010_persona_existence_state completed';
    RAISE NOTICE '   - existence_state_enum created';
    RAISE NOTICE '   - personas table extended with 12 columns';
    RAISE NOTICE '   - persona_activity_logs table created';
    RAISE NOTICE '   - 6 indexes created';
END
$$;
