-- =====================================================
-- YouTube 자동화 시스템 데이터베이스 v2.0
-- 개선사항:
--   1. campaigns 테이블 추가 (작업 배치 관리)
--   2. videos에 target_views, youtube_video_id 추가
--   3. comment_templates 테이블 추가
--   4. pc_masters 테이블 추가
--   5. 복합/부분 인덱스 추가
--   6. 필수 필드 제약조건 강화
-- =====================================================

-- UUID 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. API 키 관리
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA256 해시
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'worker' CHECK (role IN ('admin', 'worker', 'readonly')),
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE api_keys IS 'API 키 관리 (해시로 저장)';

-- =====================================================
-- 2. 마스터 PC 관리
-- =====================================================
CREATE TABLE IF NOT EXISTS pc_masters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pc_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    ip_address VARCHAR(45),
    device_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE pc_masters IS '마스터 PC (Laixi 실행) 관리';

-- =====================================================
-- 3. 댓글 템플릿
-- =====================================================
CREATE TABLE IF NOT EXISTS comment_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) DEFAULT 'general',
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'ko',
    weight INTEGER DEFAULT 1,  -- 선택 가중치
    is_active BOOLEAN DEFAULT TRUE,
    used_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE comment_templates IS '댓글 템플릿 (가중치 기반 랜덤 선택)';

-- 기본 댓글 템플릿
INSERT INTO comment_templates (category, content, language, weight) VALUES
('positive', '좋은 영상이네요!', 'ko', 10),
('positive', '정말 유익합니다', 'ko', 8),
('positive', '잘 봤습니다 👍', 'ko', 10),
('positive', '도움이 많이 됐어요', 'ko', 7),
('positive', '감사합니다!', 'ko', 10),
('positive', '구독 누르고 갑니다', 'ko', 5),
('question', '더 자세한 내용도 알고 싶어요', 'ko', 3),
('positive', 'Great video!', 'en', 5),
('positive', 'Thanks for sharing!', 'en', 5);

-- =====================================================
-- 4. 영상 테이블 (개선)
-- =====================================================
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- YouTube 정보 (필수)
    url VARCHAR(500) NOT NULL,
    youtube_video_id VARCHAR(20) UNIQUE,  -- 추출된 YouTube ID
    
    -- 메타데이터
    title VARCHAR(500) NOT NULL,
    keyword VARCHAR(255),  -- 검색 키워드
    channel_name VARCHAR(255),
    duration INTEGER CHECK (duration > 0),  -- 초 단위
    thumbnail_url VARCHAR(500),
    
    -- 작업 설정
    target_views INTEGER DEFAULT 1 CHECK (target_views >= 1),  -- 목표 시청 횟수
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- 인터랙션 설정
    like_probability FLOAT DEFAULT 0.3 CHECK (like_probability >= 0 AND like_probability <= 1),
    comment_probability FLOAT DEFAULT 0.1 CHECK (comment_probability >= 0 AND comment_probability <= 1),
    
    -- 상태
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'error')),
    completed_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    -- 메타
    created_by UUID REFERENCES api_keys(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE videos IS '시청 대상 YouTube 영상';
COMMENT ON COLUMN videos.youtube_video_id IS 'URL에서 추출한 YouTube 영상 ID (중복 방지)';
COMMENT ON COLUMN videos.target_views IS '목표 시청 횟수';

-- =====================================================
-- 5. 캠페인 (작업 배치)
-- =====================================================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- 대상 영상들
    video_ids UUID[] NOT NULL,  -- 배열로 여러 영상 포함 가능
    
    -- 실행 설정
    total_tasks INTEGER NOT NULL CHECK (total_tasks > 0),  -- 총 작업 수
    tasks_per_video INTEGER DEFAULT 1,  -- 영상당 작업 수
    
    -- 스케줄
    scheduled_at TIMESTAMP WITH TIME ZONE,  -- 예약 실행
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- 상태
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
    progress_percent FLOAT DEFAULT 0,
    
    -- 통계
    completed_tasks INTEGER DEFAULT 0,
    failed_tasks INTEGER DEFAULT 0,
    
    -- 메타
    created_by UUID REFERENCES api_keys(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE campaigns IS '작업 캠페인 (대량 작업 배치)';

-- =====================================================
-- 6. 기기 테이블 (개선)
-- =====================================================
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 식별
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    pc_master_id UUID REFERENCES pc_masters(id) ON DELETE SET NULL,
    pc_id VARCHAR(50) NOT NULL,  -- 레거시 호환
    
    -- 기기 정보
    model VARCHAR(100),
    android_version VARCHAR(20),
    screen_resolution VARCHAR(20),  -- "1080x2280"
    
    -- 상태
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('idle', 'busy', 'offline', 'error', 'overheat', 'maintenance')),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    
    -- 헬스
    battery_temp FLOAT,
    cpu_usage FLOAT,
    memory_usage FLOAT,
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    
    -- 통계
    total_tasks INTEGER DEFAULT 0,
    success_tasks INTEGER DEFAULT 0,
    error_tasks INTEGER DEFAULT 0,
    total_watch_time INTEGER DEFAULT 0,  -- 누적 시청 시간 (초)
    
    -- 메타
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE devices IS '연결된 Android 기기';

-- =====================================================
-- 7. 작업 테이블 (개선)
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 관계
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    
    -- 목표 설정
    target_watch_percent FLOAT DEFAULT 70 CHECK (target_watch_percent > 0 AND target_watch_percent <= 100),
    should_like BOOLEAN DEFAULT FALSE,
    should_comment BOOLEAN DEFAULT FALSE,
    
    -- 휴먼 패턴
    pattern_config JSONB DEFAULT '{}',
    
    -- 상태
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'assigned', 'running', 'completed', 'failed', 'cancelled', 'timeout')),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- 재시도
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    
    -- 타임스탬프
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    timeout_at TIMESTAMP WITH TIME ZONE  -- 타임아웃 예정 시간
);

COMMENT ON TABLE tasks IS '개별 시청 작업';

-- =====================================================
-- 8. 결과 테이블 (개선)
-- =====================================================
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 관계
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    video_id UUID NOT NULL REFERENCES videos(id),
    device_id UUID NOT NULL REFERENCES devices(id),
    
    -- 시청 결과
    watch_time INTEGER NOT NULL CHECK (watch_time >= 0),
    total_duration INTEGER NOT NULL CHECK (total_duration > 0),
    watch_percent FLOAT GENERATED ALWAYS AS (
        CASE WHEN total_duration > 0 THEN (watch_time::FLOAT / total_duration * 100) ELSE 0 END
    ) STORED,
    
    -- 인터랙션
    liked BOOLEAN DEFAULT FALSE,
    liked_at TIMESTAMP WITH TIME ZONE,
    commented BOOLEAN DEFAULT FALSE,
    comment_text TEXT,
    commented_at TIMESTAMP WITH TIME ZONE,
    subscribed BOOLEAN DEFAULT FALSE,
    
    -- 검색 정보
    search_type INTEGER CHECK (search_type IN (1, 2, 3, 4)),
    search_keyword VARCHAR(255),
    search_rank INTEGER DEFAULT 0,
    
    -- 품질
    screenshot_url VARCHAR(500),
    error_message TEXT,
    
    -- 메타
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE results IS '시청 결과 및 통계';
COMMENT ON COLUMN results.search_type IS '1=키워드, 2=최근, 3=제목, 4=URL직접';

-- =====================================================
-- 9. 패턴 로그 (기존 유지)
-- =====================================================
CREATE TABLE IF NOT EXISTS pattern_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL,
    pattern_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 10. 감사 로그
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(50) NOT NULL,  -- CREATE, UPDATE, DELETE, LOGIN, etc.
    entity_type VARCHAR(50),  -- video, device, task, etc.
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    api_key_id UUID REFERENCES api_keys(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_logs IS '감사 로그 (누가 무엇을 언제)';

-- =====================================================
-- 인덱스 (개선)
-- =====================================================

-- videos
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_priority ON videos(priority DESC);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_videos_keyword ON videos(keyword);
CREATE INDEX IF NOT EXISTS idx_videos_active ON videos(status) WHERE status = 'active';  -- 부분 인덱스

-- campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_at) WHERE status = 'scheduled';

-- devices
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_pc_id ON devices(pc_id);
CREATE INDEX IF NOT EXISTS idx_devices_pc_master ON devices(pc_master_id);
CREATE INDEX IF NOT EXISTS idx_devices_idle ON devices(status) WHERE status = 'idle';  -- 부분 인덱스

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_video_id ON tasks(video_id);
CREATE INDEX IF NOT EXISTS idx_tasks_device_id ON tasks(device_id);
CREATE INDEX IF NOT EXISTS idx_tasks_campaign_id ON tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tasks_queued ON tasks(priority DESC, queued_at) WHERE status = 'queued';  -- 복합 부분 인덱스
CREATE INDEX IF NOT EXISTS idx_tasks_video_status ON tasks(video_id, status);  -- 복합 인덱스

-- results
CREATE INDEX IF NOT EXISTS idx_results_task_id ON results(task_id);
CREATE INDEX IF NOT EXISTS idx_results_video_id ON results(video_id);
CREATE INDEX IF NOT EXISTS idx_results_device_id ON results(device_id);
CREATE INDEX IF NOT EXISTS idx_results_campaign_id ON results(campaign_id);
CREATE INDEX IF NOT EXISTS idx_results_created_at ON results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_video_date ON results(video_id, DATE(created_at));  -- 일별 영상 통계용

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- =====================================================
-- 트리거
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- videos
DROP TRIGGER IF EXISTS videos_updated_at ON videos;
CREATE TRIGGER videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- campaigns
DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- devices
DROP TRIGGER IF EXISTS devices_updated_at ON devices;
CREATE TRIGGER devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- pc_masters
DROP TRIGGER IF EXISTS pc_masters_updated_at ON pc_masters;
CREATE TRIGGER pc_masters_updated_at
    BEFORE UPDATE ON pc_masters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 영상 완료 카운트 자동 증가
CREATE OR REPLACE FUNCTION increment_video_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE videos SET completed_count = completed_count + 1 WHERE id = NEW.video_id;
    ELSIF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
        UPDATE videos SET error_count = error_count + 1 WHERE id = NEW.video_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_update_video_count ON tasks;
CREATE TRIGGER tasks_update_video_count
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION increment_video_completed();

-- =====================================================
-- 뷰 (개선)
-- =====================================================

-- 일별 통계
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_results,
    COUNT(*) FILTER (WHERE liked = TRUE) as likes,
    COUNT(*) FILTER (WHERE commented = TRUE) as comments,
    SUM(watch_time) as total_watch_time,
    ROUND(AVG(watch_percent)::numeric, 2) as avg_watch_percent,
    COUNT(DISTINCT video_id) as unique_videos,
    COUNT(DISTINCT device_id) as unique_devices
FROM results
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 영상별 통계
CREATE OR REPLACE VIEW video_stats AS
SELECT 
    v.id as video_id,
    v.title,
    v.keyword,
    v.status,
    v.target_views,
    v.completed_count,
    v.error_count,
    COALESCE(COUNT(r.id), 0) as result_count,
    COALESCE(COUNT(r.id) FILTER (WHERE r.liked = TRUE), 0) as like_count,
    COALESCE(COUNT(r.id) FILTER (WHERE r.commented = TRUE), 0) as comment_count,
    ROUND(COALESCE(AVG(r.watch_percent), 0)::numeric, 2) as avg_watch_percent,
    COALESCE(SUM(r.watch_time), 0) as total_watch_time,
    ROUND((v.completed_count::float / NULLIF(v.target_views, 0) * 100)::numeric, 1) as progress_percent
FROM videos v
LEFT JOIN results r ON v.id = r.video_id
GROUP BY v.id, v.title, v.keyword, v.status, v.target_views, v.completed_count, v.error_count;

-- 기기별 통계
CREATE OR REPLACE VIEW device_stats AS
SELECT 
    d.id as device_id,
    d.serial_number,
    d.model,
    d.pc_id,
    d.status,
    d.total_tasks,
    d.success_tasks,
    d.error_tasks,
    ROUND((d.success_tasks::float / NULLIF(d.total_tasks, 0) * 100)::numeric, 1) as success_rate,
    d.total_watch_time,
    d.battery_temp,
    d.battery_level,
    d.last_heartbeat
FROM devices d;

-- 캠페인별 통계
CREATE OR REPLACE VIEW campaign_stats AS
SELECT 
    c.id as campaign_id,
    c.name,
    c.status,
    c.total_tasks,
    c.completed_tasks,
    c.failed_tasks,
    ROUND((c.completed_tasks::float / NULLIF(c.total_tasks, 0) * 100)::numeric, 1) as progress_percent,
    COUNT(DISTINCT t.device_id) as devices_used,
    SUM(r.watch_time) as total_watch_time,
    c.started_at,
    c.completed_at
FROM campaigns c
LEFT JOIN tasks t ON c.id = t.campaign_id
LEFT JOIN results r ON t.id = r.task_id
GROUP BY c.id, c.name, c.status, c.total_tasks, c.completed_tasks, c.failed_tasks, c.started_at, c.completed_at;

-- 대기 중인 작업 큐
CREATE OR REPLACE VIEW task_queue AS
SELECT 
    t.id as task_id,
    t.priority,
    t.status,
    v.title as video_title,
    v.keyword,
    c.name as campaign_name,
    t.queued_at,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.queued_at)) as wait_seconds
FROM tasks t
JOIN videos v ON t.video_id = v.id
LEFT JOIN campaigns c ON t.campaign_id = c.id
WHERE t.status = 'queued'
ORDER BY t.priority DESC, t.queued_at ASC;

-- =====================================================
-- 테스트 데이터
-- =====================================================

-- 테스트 영상
INSERT INTO videos (url, youtube_video_id, title, keyword, duration, target_views, priority, like_probability, comment_probability) VALUES
('https://youtube.com/watch?v=test1', 'test1', '테스트 영상 1', '테스트', 300, 100, 5, 0.3, 0.1),
('https://youtube.com/watch?v=test2', 'test2', '테스트 영상 2', '자동화', 600, 50, 8, 0.5, 0.2),
('https://youtube.com/watch?v=test3', 'test3', '테스트 영상 3', 'YouTube', 180, 200, 3, 0.2, 0.05)
ON CONFLICT (youtube_video_id) DO NOTHING;

-- 테스트 PC
INSERT INTO pc_masters (pc_id, name, status) VALUES
('PC-001', '마스터 PC 1', 'online'),
('PC-002', '마스터 PC 2', 'offline')
ON CONFLICT (pc_id) DO NOTHING;

-- 테스트 기기
INSERT INTO devices (serial_number, pc_id, model, status, battery_level, battery_temp) VALUES
('ABC123456', 'PC-001', 'Galaxy S21', 'idle', 85, 32.5),
('DEF789012', 'PC-001', 'Pixel 6', 'busy', 72, 38.2),
('GHI345678', 'PC-002', 'Galaxy A52', 'offline', 45, 29.0)
ON CONFLICT (serial_number) DO NOTHING;

