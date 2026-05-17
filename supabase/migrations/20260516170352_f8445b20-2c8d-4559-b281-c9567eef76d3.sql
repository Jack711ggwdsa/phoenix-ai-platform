ALTER TABLE public.device_connections
  DROP CONSTRAINT IF EXISTS device_connections_connection_status_check;

ALTER TABLE public.device_connections
  ADD CONSTRAINT device_connections_connection_status_check
  CHECK (
    connection_status IN (
      'empty',
      'pending',
      'connecting',
      'connected',
      'disconnected',
      'session_expired',
      'connection_error',
      'reconnecting'
    )
  );

CREATE INDEX IF NOT EXISTS idx_device_connections_client_platform_slot
  ON public.device_connections (client_id, platform, device_slot);