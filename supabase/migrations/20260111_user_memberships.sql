-- ============================================
-- 회원 등급 시스템 마이그레이션
-- 생성일: 2026-01-11
-- 목적: 5단계 회원 등급 시스템 구현
--   - 일반 사용자: associate(준회원), regular(정회원), special(특별회원)
--   - 관리자: admin(관리자), owner(소유자)
-- ============================================

-- ============================================
-- 1. USER_MEMBERSHIPS 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL DEFAULT 'associate' 
        CHECK (tier IN ('associate', 'regular', 'special')),
    display_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_tier ON user_memberships(tier);

-- 테이블 코멘트
COMMENT ON TABLE user_memberships IS '일반 사용자 회원 등급 테이블';
COMMENT ON COLUMN user_memberships.tier IS 'associate: 준회원(철학 라이브러리만), regular: 정회원(전체 조회), special: 특별회원(등록 가능)';

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_user_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_memberships_updated_at ON user_memberships;
CREATE TRIGGER trigger_user_memberships_updated_at
    BEFORE UPDATE ON user_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_user_memberships_updated_at();


-- ============================================
-- 2. ADMIN_USERS 역할 확장 (owner 추가)
-- ============================================

-- 기존 super_admin을 owner로 변경
UPDATE admin_users SET role = 'owner' WHERE role = 'super_admin';

-- 기존 role 체크 제약 업데이트 (owner 추가)
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check 
    CHECK (role IN ('pending', 'viewer', 'admin', 'owner'));

COMMENT ON TABLE admin_users IS '관리자 테이블 - pending: 승인 대기, viewer: 읽기 전용, admin: 관리자(입력/수정), owner: 소유자(삭제/회원등급변경)';


-- ============================================
-- 3. RLS 정책 설정
-- ============================================

-- RLS 활성화
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (재실행 안전성)
DROP POLICY IF EXISTS "Users can view own membership" ON user_memberships;
DROP POLICY IF EXISTS "Admins can view all memberships" ON user_memberships;
DROP POLICY IF EXISTS "Only owner can insert memberships" ON user_memberships;
DROP POLICY IF EXISTS "Only owner can update memberships" ON user_memberships;
DROP POLICY IF EXISTS "Only owner can delete memberships" ON user_memberships;

-- 본인 조회 가능
CREATE POLICY "Users can view own membership" ON user_memberships
    FOR SELECT 
    USING (auth.uid() = user_id);

-- 관리자/소유자는 전체 조회 가능
CREATE POLICY "Admins can view all memberships" ON user_memberships
    FOR SELECT 
    USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users 
            WHERE role IN ('admin', 'owner')
        )
    );

-- 소유자만 회원 등록 가능
CREATE POLICY "Only owner can insert memberships" ON user_memberships
    FOR INSERT 
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM admin_users 
            WHERE role = 'owner'
        )
    );

-- 소유자만 등급 변경 가능
CREATE POLICY "Only owner can update memberships" ON user_memberships
    FOR UPDATE 
    USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users 
            WHERE role = 'owner'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM admin_users 
            WHERE role = 'owner'
        )
    );

-- 소유자만 삭제 가능
CREATE POLICY "Only owner can delete memberships" ON user_memberships
    FOR DELETE 
    USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users 
            WHERE role = 'owner'
        )
    );


-- ============================================
-- 4. 헬퍼 함수: 사용자 권한 조회
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
        (a.role IN ('admin', 'owner')) as is_admin,
        (a.role = 'owner') as is_owner
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
        AND role IN ('admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    RETURN QUERY
    SELECT 
        target_user_id as user_id,
        m.tier as membership_tier,
        a.role as admin_role,
        (a.role IN ('admin', 'owner')) as is_admin,
        (a.role = 'owner') as is_owner
    FROM 
        (SELECT target_user_id as uid) u
    LEFT JOIN user_memberships m ON m.user_id = u.uid
    LEFT JOIN admin_users a ON a.user_id = u.uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 5. 신규 가입자 자동 준회원 등록 트리거
-- ============================================

CREATE OR REPLACE FUNCTION auto_create_membership()
RETURNS TRIGGER AS $$
BEGIN
    -- 새 사용자 가입 시 자동으로 준회원 등록
    INSERT INTO user_memberships (user_id, tier)
    VALUES (NEW.id, 'associate')
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users 테이블에 트리거 연결
DROP TRIGGER IF EXISTS trigger_auto_create_membership ON auth.users;
CREATE TRIGGER trigger_auto_create_membership
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_membership();


-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ 회원 등급 시스템 마이그레이션 완료';
    RAISE NOTICE '   - user_memberships 테이블 생성';
    RAISE NOTICE '   - admin_users 역할 확장 (owner 추가)';
    RAISE NOTICE '   - RLS 정책 설정';
    RAISE NOTICE '   - 헬퍼 함수 생성';
    RAISE NOTICE '   - 자동 준회원 등록 트리거 설정';
END $$;
