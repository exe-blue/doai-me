-- ============================================================
-- DoAi.Me: Device Status Check Feature (Task 14)
-- File: supabase/migrations/018_device_status_check.sql
-- Description: RPC to store detailed device status.
-- ============================================================

CREATE OR REPLACE FUNCTION update_device_details(
    p_device_serial TEXT,
    p_details JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE personas
    SET 
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('details', p_details, 'details_last_updated', now()),
        updated_at = NOW()
    WHERE device_serial = p_device_serial;
END;
$$;