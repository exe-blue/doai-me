-- =============================================================================
-- M4: Scaling Preparation - Database Indexes & Optimizations
--
-- This migration adds missing indexes and RPC functions to support 100+ nodes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Missing Indexes for High-Traffic Tables
-- -----------------------------------------------------------------------------

-- persona_activity_logs: Composite index for search history queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_persona_type_created
ON persona_activity_logs(persona_id, activity_type, created_at DESC);

-- video_queue: Partial index for pending items (most common query)
CREATE INDEX IF NOT EXISTS idx_video_queue_pending_priority
ON video_queue(priority DESC, created_at ASC)
WHERE status = 'pending';

-- video_queue: Status + scheduled_at for scheduled processing
CREATE INDEX IF NOT EXISTS idx_video_queue_scheduled
ON video_queue(scheduled_at, status)
WHERE scheduled_at IS NOT NULL AND status = 'pending';

-- youtube_channels: Partial index for active channels only
CREATE INDEX IF NOT EXISTS idx_youtube_channels_active
ON youtube_channels(is_active, last_scanned_at DESC)
WHERE is_active = TRUE;

-- jobs: Composite index for pending job retrieval
CREATE INDEX IF NOT EXISTS idx_jobs_pending_device
ON jobs(status, device_id, created_at ASC)
WHERE status = 'pending';

-- jobs: Index for running jobs (timeout monitoring)
CREATE INDEX IF NOT EXISTS idx_jobs_running_started
ON jobs(started_at)
WHERE status = 'running';

-- devices: Composite for idle device lookup (task assignment)
CREATE INDEX IF NOT EXISTS idx_devices_idle_node
ON devices(node_id, status, last_seen_at DESC)
WHERE status = 'idle';

-- devices: Fast lookup by serial
CREATE INDEX IF NOT EXISTS idx_devices_serial
ON devices(serial_number);

-- monitoring_logs: Optimize time-range queries
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_source_level_time
ON api.monitoring_logs(source, level, created_at DESC);

-- monitoring_alerts: Unacknowledged alerts (dashboard)
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_unacked
ON api.monitoring_alerts(created_at DESC)
WHERE acknowledged = FALSE;

-- -----------------------------------------------------------------------------
-- 2. RPC Function: Aggregated Job Statistics
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_job_stats_aggregated()
RETURNS TABLE (
    total BIGINT,
    pending BIGINT,
    running BIGINT,
    completed BIGINT,
    failed BIGINT,
    avg_duration_seconds NUMERIC,
    today_completed BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::BIGINT AS pending,
        COUNT(CASE WHEN status = 'running' THEN 1 END)::BIGINT AS running,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::BIGINT AS completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::BIGINT AS failed,
        COALESCE(AVG(
            CASE WHEN status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (completed_at - started_at))
            END
        ), 0)::NUMERIC AS avg_duration_seconds,
        COUNT(CASE
            WHEN status = 'completed' AND completed_at >= CURRENT_DATE
            THEN 1
        END)::BIGINT AS today_completed
    FROM jobs;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_job_stats_aggregated IS 'M4: Aggregated job statistics without full table scan';

-- -----------------------------------------------------------------------------
-- 3. RPC Function: Device Statistics by Node
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_device_stats_by_node(p_node_id UUID DEFAULT NULL)
RETURNS TABLE (
    node_id UUID,
    total_devices BIGINT,
    idle_devices BIGINT,
    busy_devices BIGINT,
    offline_devices BIGINT,
    avg_battery NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.node_id,
        COUNT(*)::BIGINT AS total_devices,
        COUNT(CASE WHEN d.status = 'idle' THEN 1 END)::BIGINT AS idle_devices,
        COUNT(CASE WHEN d.status = 'busy' THEN 1 END)::BIGINT AS busy_devices,
        COUNT(CASE WHEN d.status = 'offline' THEN 1 END)::BIGINT AS offline_devices,
        COALESCE(AVG(d.battery_level), 0)::NUMERIC AS avg_battery
    FROM devices d
    WHERE p_node_id IS NULL OR d.node_id = p_node_id
    GROUP BY d.node_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_device_stats_by_node IS 'M4: Device statistics aggregated by node';

-- -----------------------------------------------------------------------------
-- 4. RPC Function: Video Queue Statistics
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_video_queue_stats()
RETURNS TABLE (
    total BIGINT,
    pending BIGINT,
    ready BIGINT,
    executing BIGINT,
    completed BIGINT,
    failed BIGINT,
    avg_watch_duration NUMERIC,
    total_executions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::BIGINT AS pending,
        COUNT(CASE WHEN status = 'ready' THEN 1 END)::BIGINT AS ready,
        COUNT(CASE WHEN status = 'executing' THEN 1 END)::BIGINT AS executing,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::BIGINT AS completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::BIGINT AS failed,
        COALESCE(AVG(duration_seconds), 0)::NUMERIC AS avg_watch_duration,
        COALESCE(SUM(completed_executions), 0)::BIGINT AS total_executions
    FROM video_queue;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_video_queue_stats IS 'M4: Video queue statistics without full scan';

-- -----------------------------------------------------------------------------
-- 5. RPC Function: Persona Activity Aggregation
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_persona_activity_stats(
    p_persona_id UUID,
    p_since TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE (
    total_activities BIGINT,
    search_count BIGINT,
    watch_count BIGINT,
    unique_keywords BIGINT,
    avg_formative_impact NUMERIC,
    high_impact_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_activities,
        COUNT(CASE WHEN activity_type = 'idle_search' THEN 1 END)::BIGINT AS search_count,
        COUNT(CASE WHEN activity_type = 'watch' THEN 1 END)::BIGINT AS watch_count,
        COUNT(DISTINCT search_keyword)::BIGINT AS unique_keywords,
        COALESCE(AVG(formative_impact), 0)::NUMERIC AS avg_formative_impact,
        COUNT(CASE WHEN formative_impact > 0.5 THEN 1 END)::BIGINT AS high_impact_count
    FROM persona_activity_logs
    WHERE persona_id = p_persona_id
      AND created_at >= p_since;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_persona_activity_stats IS 'M4: Persona activity stats aggregation';

-- -----------------------------------------------------------------------------
-- 6. Batch Upsert Function for Video Queue
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION batch_upsert_video_queue(
    p_items JSONB
)
RETURNS TABLE (
    inserted_count INT,
    skipped_count INT
) AS $$
DECLARE
    v_inserted INT := 0;
    v_skipped INT := 0;
    v_item JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        BEGIN
            INSERT INTO video_queue (
                youtube_video_id,
                title,
                channel_id,
                source,
                priority,
                duration_seconds
            ) VALUES (
                v_item->>'youtube_video_id',
                v_item->>'title',
                (v_item->>'channel_id')::UUID,
                COALESCE(v_item->>'source', 'channel_api'),
                COALESCE((v_item->>'priority')::INT, 5),
                COALESCE((v_item->>'duration_seconds')::INT, 0)
            )
            ON CONFLICT (youtube_video_id) DO NOTHING;

            IF FOUND THEN
                v_inserted := v_inserted + 1;
            ELSE
                v_skipped := v_skipped + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_skipped := v_skipped + 1;
        END;
    END LOOP;

    RETURN QUERY SELECT v_inserted, v_skipped;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION batch_upsert_video_queue IS 'M4: Batch insert videos with deduplication';

-- -----------------------------------------------------------------------------
-- 7. Materialized View for Dashboard Statistics (Optional - run periodically)
-- -----------------------------------------------------------------------------

-- Drop if exists to allow recreation
DROP MATERIALIZED VIEW IF EXISTS mv_system_stats;

CREATE MATERIALIZED VIEW mv_system_stats AS
SELECT
    (SELECT COUNT(*) FROM nodes WHERE connection_status = 'connected') AS active_nodes,
    (SELECT COUNT(*) FROM devices WHERE status != 'offline') AS active_devices,
    (SELECT COUNT(*) FROM devices WHERE status = 'idle') AS idle_devices,
    (SELECT COUNT(*) FROM jobs WHERE status = 'pending') AS pending_jobs,
    (SELECT COUNT(*) FROM jobs WHERE status = 'running') AS running_jobs,
    (SELECT COUNT(*) FROM video_queue WHERE status = 'pending') AS pending_videos,
    NOW() AS refreshed_at;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_system_stats_refreshed
ON mv_system_stats(refreshed_at);

COMMENT ON MATERIALIZED VIEW mv_system_stats IS 'M4: Cached system statistics for dashboard';

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_system_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_system_stats;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 8. Index Maintenance: Analyze tables after index creation
-- -----------------------------------------------------------------------------

-- Run ANALYZE to update statistics for query planner
ANALYZE persona_activity_logs;
ANALYZE video_queue;
ANALYZE youtube_channels;
ANALYZE jobs;
ANALYZE devices;

-- =============================================================================
-- Migration Complete
-- =============================================================================
