-- ============================================================
-- DoAi.Me: Periodic Device Status Checks (Cron Job)
-- File: supabase/migrations/019_periodic_status_checks.sql
-- Description: Periodically create DEVICE_STATUS_CHECK jobs for all online devices.
-- ============================================================

-- 1. Function to create status check jobs for all active devices
CREATE OR REPLACE FUNCTION schedule_device_status_checks()
RETURNS INTEGER AS $$
DECLARE
    v_persona RECORD;
    v_created_count INTEGER := 0;
    v_job_id UUID;
    v_created BOOLEAN;
BEGIN
    FOR v_persona IN
        -- Select active devices connected to online nodes
        SELECT p.device_serial, p.node_id
        FROM personas p
        JOIN node_health nh ON p.node_id = nh.node_id
        WHERE p.existence_state = 'active'
          AND nh.status = 'ONLINE'
          AND p.node_id IS NOT NULL
    LOOP
        -- Create an idempotent job for each active device, once per hour
        SELECT job_id, created INTO v_job_id, v_created
        FROM create_job_idempotent(
            p_idempotency_key := 'status-check-' || v_persona.device_serial || '-' || to_char(NOW(), 'YYYY-MM-DD-HH24'),
            p_target_node := v_persona.node_id,
            p_target_device := v_persona.device_serial,
            p_job_type := 'DEVICE_STATUS_CHECK',
            p_priority := 'BACKGROUND',
            p_created_by := 'SCHEDULER'
        );

        IF v_created THEN
            v_created_count := v_created_count + 1;
        END IF;
    END LOOP;

    RETURN v_created_count;
END;
$$ LANGUAGE plpgsql;

-- 2. Schedule the function to run every hour using pg_cron
-- Ensure the pg_cron extension is enabled in your Supabase project.
SELECT cron.schedule(
    'schedule-device-status-checks',
    '5 * * * *', -- Run at 5 minutes past every hour
    $$SELECT schedule_device_status_checks()$$
);