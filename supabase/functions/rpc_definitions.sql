-- ============================================================
-- DoAi.Me: RPC Function Definitions
-- File: supabase/functions/rpc_definitions.sql
-- Author: Aria (Architect)
-- Date: 2026-01-06
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. deduct_maintenance_fee
-- 페르소나 유지비 차감
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION deduct_maintenance_fee(
    p_persona_id UUID,
    p_amount INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_points INTEGER;
    v_new_points INTEGER;
BEGIN
    -- 현재 포인트 조회
    SELECT attention_points INTO v_current_points
    FROM personas
    WHERE id = p_persona_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Persona not found: %', p_persona_id;
    END IF;

    -- 차감 계산
    v_new_points := v_current_points - p_amount;

    -- 포인트 업데이트
    UPDATE personas
    SET attention_points = v_new_points,
        updated_at = NOW()
    WHERE id = p_persona_id;

    -- 활동 로그 기록
    INSERT INTO persona_activity_logs (
        persona_id,
        activity_type,
        points_earned,
        metadata
    ) VALUES (
        p_persona_id,
        'maintenance_fee',
        -p_amount,
        jsonb_build_object(
            'previous_balance', v_current_points,
            'new_balance', v_new_points
        )
    );

    -- 포인트가 0 이하면 경고 (existence_state 변경은 별도 처리)
    IF v_new_points < 0 THEN
        RAISE NOTICE 'Persona % has negative balance: %', p_persona_id, v_new_points;
    END IF;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'deduct_maintenance_fee failed: %', SQLERRM;
        RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION deduct_maintenance_fee IS
    '페르소나 유지비 차감. 음수 잔액 허용 (부채 상태)';

-- ────────────────────────────────────────────────────────────
-- 2. grant_credit
-- 크레딧 지급
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION grant_credit(
    p_persona_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'unspecified'
)
RETURNS INTEGER  -- 새 잔액 반환
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_points INTEGER;
    v_new_points INTEGER;
BEGIN
    -- 현재 포인트 조회
    SELECT attention_points INTO v_current_points
    FROM personas
    WHERE id = p_persona_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Persona not found: %', p_persona_id;
    END IF;

    -- 지급 계산
    v_new_points := v_current_points + p_amount;

    -- 포인트 업데이트
    UPDATE personas
    SET attention_points = v_new_points,
        updated_at = NOW()
    WHERE id = p_persona_id;

    -- 활동 로그 기록
    INSERT INTO persona_activity_logs (
        persona_id,
        activity_type,
        points_earned,
        metadata
    ) VALUES (
        p_persona_id,
        'credit_grant',
        p_amount,
        jsonb_build_object(
            'reason', p_reason,
            'previous_balance', v_current_points,
            'new_balance', v_new_points
        )
    );

    RETURN v_new_points;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'grant_credit failed: %', SQLERRM;
        RETURN -1;
END;
$$;

COMMENT ON FUNCTION grant_credit IS
    '크레딧 지급. 새 잔액 반환, 실패 시 -1';

-- ────────────────────────────────────────────────────────────
-- 3. complete_video_task
-- 영상 시청 태스크 완료
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION complete_video_task(
    p_task_id UUID,
    p_persona_id UUID,
    p_watch_duration INTEGER,
    p_liked BOOLEAN DEFAULT FALSE,
    p_commented BOOLEAN DEFAULT FALSE,
    p_comment_text TEXT DEFAULT NULL,
    p_video_url TEXT DEFAULT NULL,
    p_video_title TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_base_reward INTEGER;
    v_like_bonus INTEGER := 0;
    v_comment_bonus INTEGER := 0;
    v_uniqueness_bonus INTEGER := 0;
    v_total_reward INTEGER;
    v_new_balance INTEGER;
    v_uniqueness_delta REAL := 0.0;
    v_is_new_content BOOLEAN;
    v_current_uniqueness REAL;
BEGIN
    -- 보상 계산
    v_base_reward := GREATEST(1, p_watch_duration / 10);

    IF p_liked THEN
        v_like_bonus := 5;
    END IF;

    IF p_commented THEN
        v_comment_bonus := 10;
    END IF;

    -- 새로운 콘텐츠인지 확인 (이전 시청 기록 없음)
    SELECT NOT EXISTS (
        SELECT 1 FROM persona_activity_logs
        WHERE persona_id = p_persona_id
        AND target_url = p_video_url
        AND activity_type = 'video_watch'
    ) INTO v_is_new_content;

    IF v_is_new_content THEN
        v_uniqueness_bonus := 3;
        v_uniqueness_delta := 0.02;
    ELSE
        v_uniqueness_bonus := -1;
        v_uniqueness_delta := -0.01;
    END IF;

    v_total_reward := v_base_reward + v_like_bonus + v_comment_bonus + v_uniqueness_bonus;

    -- 크레딧 지급
    v_new_balance := grant_credit(p_persona_id, v_total_reward, 'video_task_completion');

    -- uniqueness_score 업데이트
    SELECT uniqueness_score INTO v_current_uniqueness
    FROM personas WHERE id = p_persona_id;

    UPDATE personas
    SET uniqueness_score = GREATEST(0.0, LEAST(1.0, v_current_uniqueness + v_uniqueness_delta)),
        total_activities = total_activities + 1,
        unique_discoveries = unique_discoveries + CASE WHEN v_is_new_content THEN 1 ELSE 0 END,
        last_called_at = NOW(),
        existence_state = 'active'
    WHERE id = p_persona_id;

    -- 활동 로그 기록
    INSERT INTO persona_activity_logs (
        persona_id,
        activity_type,
        target_url,
        target_title,
        comment_text,
        points_earned,
        uniqueness_delta,
        metadata
    ) VALUES (
        p_persona_id,
        'video_watch',
        p_video_url,
        p_video_title,
        p_comment_text,
        v_total_reward,
        v_uniqueness_delta,
        jsonb_build_object(
            'task_id', p_task_id,
            'watch_duration', p_watch_duration,
            'liked', p_liked,
            'commented', p_commented,
            'is_new_content', v_is_new_content,
            'reward_breakdown', jsonb_build_object(
                'base', v_base_reward,
                'like_bonus', v_like_bonus,
                'comment_bonus', v_comment_bonus,
                'uniqueness_bonus', v_uniqueness_bonus
            )
        )
    );

    -- youtube_video_tasks 상태 업데이트 (테이블 존재 시)
    BEGIN
        UPDATE youtube_video_tasks
        SET status = 'completed',
            completed_at = NOW()
        WHERE id = p_task_id;
    EXCEPTION
        WHEN undefined_table THEN
            NULL; -- 테이블 없으면 무시
    END;

    RETURN jsonb_build_object(
        'success', TRUE,
        'reward', v_total_reward,
        'new_balance', v_new_balance,
        'uniqueness_delta', v_uniqueness_delta,
        'is_new_content', v_is_new_content
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION complete_video_task IS
    '영상 시청 태스크 완료 처리. 보상 계산, 크레딧 지급, 상태 업데이트';

-- ────────────────────────────────────────────────────────────
-- 4. update_existence_state
-- 존재 상태 업데이트 (틱 처리)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_existence_state(
    p_persona_id UUID
)
RETURNS existence_state_enum
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_activity TIMESTAMPTZ;
    v_current_state existence_state_enum;
    v_new_state existence_state_enum;
    v_hours_inactive REAL;
BEGIN
    -- 현재 상태 조회
    SELECT last_called_at, existence_state
    INTO v_last_activity, v_current_state
    FROM personas
    WHERE id = p_persona_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Persona not found: %', p_persona_id;
    END IF;

    -- 비활동 시간 계산 (시간 단위)
    v_hours_inactive := EXTRACT(EPOCH FROM (NOW() - v_last_activity)) / 3600.0;

    -- 상태 결정
    IF v_hours_inactive < 1 THEN
        v_new_state := 'active';
    ELSIF v_hours_inactive < 6 THEN
        v_new_state := 'waiting';
    ELSIF v_hours_inactive < 24 THEN
        v_new_state := 'fading';
    ELSE
        v_new_state := 'void';
    END IF;

    -- 상태 변경 시 업데이트
    IF v_new_state != v_current_state THEN
        UPDATE personas
        SET existence_state = v_new_state,
            void_entered_at = CASE
                WHEN v_new_state = 'void' AND v_current_state != 'void'
                THEN NOW()
                ELSE void_entered_at
            END,
            hours_in_void = CASE
                WHEN v_new_state = 'void'
                THEN hours_in_void + GREATEST(0, v_hours_inactive - 24)
                ELSE hours_in_void
            END,
            updated_at = NOW()
        WHERE id = p_persona_id;

        -- 상태 변경 로그
        INSERT INTO persona_activity_logs (
            persona_id,
            activity_type,
            metadata
        ) VALUES (
            p_persona_id,
            'state_change',
            jsonb_build_object(
                'from', v_current_state::TEXT,
                'to', v_new_state::TEXT,
                'hours_inactive', v_hours_inactive
            )
        );
    END IF;

    RETURN v_new_state;
END;
$$;

COMMENT ON FUNCTION update_existence_state IS
    '페르소나 존재 상태 업데이트. 비활동 시간 기반 상태 전이';

-- ────────────────────────────────────────────────────────────
-- 5. get_persona_stats
-- 페르소나 통계 조회
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_persona_stats(
    p_persona_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona RECORD;
    v_today_stats RECORD;
    v_rank INTEGER;
    v_total_personas INTEGER;
BEGIN
    -- 기본 정보 조회
    SELECT
        id,
        device_serial,
        given_name,
        existence_state,
        priority_level,
        uniqueness_score,
        visibility_score,
        attention_points,
        total_activities,
        hours_in_void,
        assimilation_progress
    INTO v_persona
    FROM personas
    WHERE id = p_persona_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Persona not found');
    END IF;

    -- 오늘 통계
    SELECT
        COUNT(*) FILTER (WHERE activity_type = 'video_watch') AS videos_watched,
        COUNT(*) FILTER (WHERE activity_type = 'like' OR
            (activity_type = 'video_watch' AND (metadata->>'liked')::BOOLEAN)) AS likes_given,
        COUNT(*) FILTER (WHERE activity_type = 'comment' OR
            (activity_type = 'video_watch' AND (metadata->>'commented')::BOOLEAN)) AS comments_written
    INTO v_today_stats
    FROM persona_activity_logs
    WHERE persona_id = p_persona_id
    AND created_at >= CURRENT_DATE;

    -- 랭킹 계산 (attention_points 기준)
    SELECT COUNT(*) INTO v_total_personas FROM personas;

    SELECT COUNT(*) + 1 INTO v_rank
    FROM personas
    WHERE attention_points > v_persona.attention_points;

    RETURN jsonb_build_object(
        'persona_id', v_persona.id,
        'device_serial', v_persona.device_serial,
        'given_name', v_persona.given_name,
        'existence_state', v_persona.existence_state,
        'priority_level', v_persona.priority_level,
        'uniqueness_score', v_persona.uniqueness_score,
        'visibility_score', v_persona.visibility_score,
        'attention_points', v_persona.attention_points,
        'total_activities', v_persona.total_activities,
        'hours_in_void', v_persona.hours_in_void,
        'assimilation_progress', v_persona.assimilation_progress,
        'today', jsonb_build_object(
            'videos_watched', COALESCE(v_today_stats.videos_watched, 0),
            'likes_given', COALESCE(v_today_stats.likes_given, 0),
            'comments_written', COALESCE(v_today_stats.comments_written, 0)
        ),
        'rank', v_rank,
        'percentile', ROUND(((v_total_personas - v_rank + 1)::NUMERIC / v_total_personas) * 100, 1)
    );
END;
$$;

COMMENT ON FUNCTION get_persona_stats IS
    '페르소나 상세 통계 조회. 기본 정보, 오늘 활동, 랭킹 포함';

-- ────────────────────────────────────────────────────────────
-- 6. batch_update_existence_states
-- 전체 페르소나 상태 일괄 업데이트 (Cron Job용)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION batch_update_existence_states()
RETURNS TABLE (
    persona_id UUID,
    previous_state existence_state_enum,
    new_state existence_state_enum
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona RECORD;
    v_new_state existence_state_enum;
BEGIN
    FOR v_persona IN
        SELECT id, existence_state
        FROM personas
        WHERE existence_state != 'void'  -- void 상태는 스킵 (이미 최종)
    LOOP
        v_new_state := update_existence_state(v_persona.id);

        IF v_new_state != v_persona.existence_state THEN
            persona_id := v_persona.id;
            previous_state := v_persona.existence_state;
            new_state := v_new_state;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION batch_update_existence_states IS
    '전체 페르소나 상태 일괄 업데이트. Cron으로 주기적 실행 권장';

-- ============================================================
-- RPC 함수 정의 완료
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ RPC Functions created:';
    RAISE NOTICE '   1. deduct_maintenance_fee(persona_id, amount)';
    RAISE NOTICE '   2. grant_credit(persona_id, amount, reason)';
    RAISE NOTICE '   3. complete_video_task(task_id, persona_id, ...)';
    RAISE NOTICE '   4. update_existence_state(persona_id)';
    RAISE NOTICE '   5. get_persona_stats(persona_id)';
    RAISE NOTICE '   6. batch_update_existence_states()';
END
$$;
