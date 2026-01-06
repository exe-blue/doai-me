-- ============================================================
-- DoAi.Me: Screenshot Viewer Feature (Task 13)
-- File: supabase/migrations/017_screenshot_viewer.sql
-- Description: RPC to get the latest screenshot for a device.
-- ============================================================

CREATE OR REPLACE FUNCTION get_latest_screenshot_url(
    p_device_serial TEXT
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT (result->>'url')::TEXT
    FROM job_queue
    WHERE target_device = p_device_serial
      AND job_type = 'DEVICE_SCREENSHOT'
      AND status = 'COMPLETED'
      AND result->>'url' IS NOT NULL
    ORDER BY completed_at DESC
    LIMIT 1;
$$;