-- YouTube Automation System v2
-- Tables for Idle and Queue mode automation

-- 1. persona_youtube_history - Idle mode activity logging
CREATE TABLE IF NOT EXISTS persona_youtube_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID,
  device_serial TEXT NOT NULL,
  search_keyword VARCHAR(200) NOT NULL,
  keyword_source VARCHAR(30) DEFAULT 'ai_generated',
  video_title VARCHAR(500),
  video_channel VARCHAR(255),
  video_url VARCHAR(500),
  watch_duration_seconds INTEGER NOT NULL DEFAULT 0,
  scroll_count INTEGER DEFAULT 0,
  liked BOOLEAN DEFAULT false,
  commented BOOLEAN DEFAULT false,
  comment_content TEXT,
  human_simulation_config JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_persona_youtube_history_device ON persona_youtube_history(device_serial);
CREATE INDEX IF NOT EXISTS idx_persona_youtube_history_created ON persona_youtube_history(created_at DESC);

-- 2. video_assignments - Queue mode device assignments
CREATE TABLE IF NOT EXISTS video_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID,
  device_serial TEXT NOT NULL,
  node_id UUID,
  priority INTEGER DEFAULT 5,
  scheduled_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'pending',
  watch_duration_seconds INTEGER,
  target_duration_seconds INTEGER,
  random_actions JSONB DEFAULT '[]',
  liked BOOLEAN DEFAULT false,
  commented BOOLEAN DEFAULT false,
  comment_content TEXT,
  ad_skipped BOOLEAN DEFAULT false,
  ad_skip_time_seconds INTEGER,
  human_simulation_config JSONB DEFAULT '{}',
  error_message TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_assignments_video ON video_assignments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_assignments_status ON video_assignments(status);

-- 3. device_heartbeats - Connection monitoring
CREATE TABLE IF NOT EXISTS device_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial TEXT NOT NULL,
  node_id UUID,
  status VARCHAR(20) NOT NULL,
  battery_level INTEGER,
  current_mode VARCHAR(20),
  current_task_id UUID,
  latency_ms INTEGER,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_heartbeats_serial ON device_heartbeats(device_serial);
CREATE INDEX IF NOT EXISTS idx_device_heartbeats_last_seen ON device_heartbeats(last_seen_at DESC);

-- 4. automation_queue - Central task queue
CREATE TABLE IF NOT EXISTS automation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type VARCHAR(30) NOT NULL,
  target_device_serial TEXT,
  video_id UUID,
  video_url VARCHAR(500),
  video_title VARCHAR(500),
  search_keyword VARCHAR(200),
  priority INTEGER DEFAULT 5,
  watch_min_seconds INTEGER,
  watch_max_seconds INTEGER,
  like_probability REAL DEFAULT 0.10,
  comment_probability REAL DEFAULT 0.05,
  scheduled_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'pending',
  assigned_device_serial TEXT,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by VARCHAR(50) DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_automation_queue_status ON automation_queue(status);
CREATE INDEX IF NOT EXISTS idx_automation_queue_pending ON automation_queue(priority DESC, created_at ASC) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE persona_youtube_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_queue ENABLE ROW LEVEL SECURITY;

-- Service role access
CREATE POLICY "Service role full access on persona_youtube_history" ON persona_youtube_history FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on video_assignments" ON video_assignments FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on device_heartbeats" ON device_heartbeats FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on automation_queue" ON automation_queue FOR ALL TO service_role USING (true);
