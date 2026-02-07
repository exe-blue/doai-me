-- ============================================
-- 회원 등급 시스템 마이그레이션 v2
-- 생성일: 2026-01-13
-- 목적: 새로운 4단계 회원 등급 시스템으로 변경
--   - 비회원: 인증되지 않은 사용자
--   - 컨펌전 회원(pending): 가입 후 승인 대기
--   - 회원(member): 승인된 일반 회원
--   - 관리자(admin): 시스템 관리자
-- ============================================

-- ============================================
-- 1. USER_MEMBERSHIPS 테이블 tier 컬럼 업데이트
-- ============================================

-- 기존 데이터 마이그레이션
-- associate, regular → pending (승인 대기)
-- special → member (승인된 회원)
UPDATE user_memberships
SET tier = CASE
    WHEN tier IN ('associate', 'regular') THEN 'pending'
    WHEN tier = 'special' THEN 'member'
    ELSE 'pending'
END;

-- 기존 체크 제약 삭제 및 새 제약 추가
ALTER TABLE user_memberships DROP CONSTRAINT IF EXISTS user_memberships_tier_check;
ALTER TABLE user_memberships ADD CONSTRAINT user_memberships_tier_check
    CHECK (tier IN ('pending', 'member'));

-- 기본값 변경
ALTER TABLE user_memberships ALTER COLUMN tier SET DEFAULT 'pending';

-- 테이블 코멘트 업데이트
COMMENT ON COLUMN user_memberships.tier IS 'pending: 컨펌전 회원(승인 대기), member: 회원(승인됨)';


-- ============================================
-- 2. ADMIN_USERS 테이블 role 컬럼 업데이트
-- ============================================

-- 기존 데이터 마이그레이션
-- pending → 삭제 (user_memberships.tier로 이동)
-- viewer → admin으로 승격 또는 삭제
-- owner → admin으로 통합
UPDATE admin_users
SET role = 'admin'
WHERE role IN ('viewer', 'owner');

-- pending 상태의 admin_users 삭제 (user_memberships.pending으로 대체)
DELETE FROM admin_users WHERE role = 'pending';

-- 기존 체크 제약 삭제 및 새 제약 추가
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
    CHECK (role IN ('admin'));

-- 테이블 코멘트 업데이트
COMMENT ON TABLE admin_users IS '관리자 테이블 - admin: 관리자(모든 권한)';


-- ============================================
-- 3. RLS 정책 업데이트
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own membership" ON user_memberships;
DROP POLICY IF EXISTS "Admins can view all memberships" ON user_memberships;
DROP POLICY IF EXISTS "Only owner can insert memberships" ON user_memberships;
DROP POLICY IF EXISTS "Only owner can update memberships" ON user_memberships;
DROP POLICY IF EXISTS "Only owner can delete memberships" ON user_memberships;

-- 새 정책 생성
-- 본인 조회 가능
CREATE POLICY "Users can view own membership" ON user_memberships
    FOR SELECT
    USING (auth.uid() = user_id);

-- 관리자는 전체 조회 가능
CREATE POLICY "Admins can view all memberships" ON user_memberships
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users
            WHERE role = 'admin'
        )
    );

-- 관리자만 회원 등록 가능
CREATE POLICY "Admins can insert memberships" ON user_memberships
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM admin_users
            WHERE role = 'admin'
        )
    );

-- 관리자만 등급 변경 가능
CREATE POLICY "Admins can update memberships" ON user_memberships
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users
            WHERE role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM admin_users
            WHERE role = 'admin'
        )
    );

-- 관리자만 삭제 가능
CREATE POLICY "Admins can delete memberships" ON user_memberships
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users
            WHERE role = 'admin'
        )
    );


-- ============================================
-- 4. 헬퍼 함수 업데이트
-- ============================================

-- 현재 사용자의 권한 정보 반환
CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS TABLE (
    user_id UUID,
    membership_tier VARCHAR(20),
    admin_role VARCHAR(20),
    is_admin BOOLEAN,
    is_owner BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        auth.uid() as user_id,
        m.tier as membership_tier,
        a.role as admin_role,
        (a.role = 'admin') as is_admin,
        (a.role = 'admin') as is_owner  -- owner 제거됨, admin이 최고 권한
    FROM
        (SELECT auth.uid() as uid) u
    LEFT JOIN user_memberships m ON m.user_id = u.uid
    LEFT JOIN admin_users a ON a.user_id = u.uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 특정 사용자의 권한 정보 반환 (관리자용)
CREATE OR REPLACE FUNCTION get_user_permissions_by_id(target_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    membership_tier VARCHAR(20),
    admin_role VARCHAR(20),
    is_admin BOOLEAN,
    is_owner BOOLEAN
) AS $$
BEGIN
    -- 관리자만 호출 가능
    IF NOT EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        target_user_id as user_id,
        m.tier as membership_tier,
        a.role as admin_role,
        (a.role = 'admin') as is_admin,
        (a.role = 'admin') as is_owner
    FROM
        (SELECT target_user_id as uid) u
    LEFT JOIN user_memberships m ON m.user_id = u.uid
    LEFT JOIN admin_users a ON a.user_id = u.uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 5. 신규 가입자 자동 컨펌전 회원 등록 트리거 업데이트
-- ============================================

CREATE OR REPLACE FUNCTION auto_create_membership()
RETURNS TRIGGER AS $$
BEGIN
    -- 새 사용자 가입 시 자동으로 컨펌전 회원(pending) 등록
    INSERT INTO user_memberships (user_id, tier)
    VALUES (NEW.id, 'pending')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '=== 회원 등급 시스템 마이그레이션 v2 완료 ===';
    RAISE NOTICE '새로운 등급 체계:';
    RAISE NOTICE '  - 비회원: 인증되지 않은 사용자';
    RAISE NOTICE '  - 컨펌전 회원(pending): 가입 후 승인 대기';
    RAISE NOTICE '  - 회원(member): 승인된 일반 회원';
    RAISE NOTICE '  - 관리자(admin): 시스템 관리자';
END $$;
