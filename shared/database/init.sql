-- YouTube 자동화 시스템 데이터베이스 초기화

-- UUID 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 영상 테이블
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url VARCHAR(500),
    title VARCHAR(500),
    keyword VARCHAR(255),
    duration INTEGER,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    completed_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 기기 테이블
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    pc_id VARCHAR(50) NOT NULL,
    model VARCHAR(100),
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('idle', 'busy', 'offline', 'error', 'overheat')),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    battery_temp FLOAT,
    cpu_usage FLOAT,
    memory_usage FLOAT,
    battery_level INTEGER,
    total_tasks INTEGER DEFAULT 0,
    success_tasks INTEGER DEFAULT 0,
    error_tasks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 작업 테이블
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'assigned', 'running', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 5,
    pattern_config JSONB DEFAULT '{}',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 결과 테이블
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id),
    video_id UUID NOT NULL REFERENCES videos(id),
    watch_time INTEGER NOT NULL,
    total_duration INTEGER NOT NULL,
    watch_percent FLOAT,
    liked BOOLEAN DEFAULT FALSE,
    commented BOOLEAN DEFAULT FALSE,
    comment_text TEXT,
    search_type INTEGER CHECK (search_type IN (1, 2, 3, 4)),
    search_rank INTEGER DEFAULT 0,
    screenshot_url VARCHAR(500),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 패턴 로그 테이블
CREATE TABLE IF NOT EXISTS pattern_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL,
    pattern_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_priority ON videos(priority DESC);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_pc_id ON devices(pc_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_video_id ON tasks(video_id);
CREATE INDEX IF NOT EXISTS idx_tasks_device_id ON tasks(device_id);
CREATE INDEX IF NOT EXISTS idx_results_task_id ON results(task_id);
CREATE INDEX IF NOT EXISTS idx_results_video_id ON results(video_id);
CREATE INDEX IF NOT EXISTS idx_results_device_id ON results(device_id);
CREATE INDEX IF NOT EXISTS idx_results_created_at ON results(created_at DESC);

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
DROP TRIGGER IF EXISTS videos_updated_at ON videos;
CREATE TRIGGER videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS devices_updated_at ON devices;
CREATE TRIGGER devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 뷰: 일별 통계
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_results,
    COUNT(*) FILTER (WHERE liked = TRUE) as likes,
    COUNT(*) FILTER (WHERE commented = TRUE) as comments,
    SUM(watch_time) as total_watch_time,
    AVG(watch_percent) as avg_watch_percent
FROM results
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 뷰: 영상별 통계
CREATE OR REPLACE VIEW video_stats AS
SELECT 
    v.id as video_id,
    v.title,
    v.status,
    COUNT(r.id) as result_count,
    COUNT(r.id) FILTER (WHERE r.liked = TRUE) as like_count,
    COUNT(r.id) FILTER (WHERE r.commented = TRUE) as comment_count,
    AVG(r.watch_percent) as avg_watch_percent,
    SUM(r.watch_time) as total_watch_time
FROM videos v
LEFT JOIN results r ON v.id = r.video_id
GROUP BY v.id, v.title, v.status;

-- 초기 테스트 데이터 (선택적)
-- INSERT INTO videos (url, title, keyword, duration, priority) VALUES
-- ('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '테스트 영상 1', '테스트', 213, 5),
-- ('https://www.youtube.com/watch?v=9bZkp7q19f0', '테스트 영상 2', '테스트', 252, 5);

COMMENT ON TABLE videos IS '시청 대상 YouTube 영상 정보';
COMMENT ON TABLE devices IS '연결된 Android 기기 정보';
COMMENT ON TABLE tasks IS '작업 큐 및 상태 관리';
COMMENT ON TABLE results IS '시청 결과 및 통계';
COMMENT ON TABLE pattern_logs IS '적용된 휴먼 패턴 로그';

