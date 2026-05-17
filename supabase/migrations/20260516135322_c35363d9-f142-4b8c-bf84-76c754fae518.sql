CREATE TABLE public.device_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('messenger','telegram','whatsapp','instagram')),
  device_slot INTEGER NOT NULL CHECK (device_slot BETWEEN 1 AND 5),
  connection_status TEXT NOT NULL DEFAULT 'empty' CHECK (connection_status IN ('empty','pending','connected','disconnected')),
  connection_name TEXT,
  provider_session_id TEXT,
  provider_token TEXT,
  last_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, platform, device_slot)
);

CREATE INDEX idx_device_connections_client ON public.device_connections(client_id);

ALTER TABLE public.device_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage device_connections"
ON public.device_connections FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients view own device_connections"
ON public.device_connections FOR SELECT
USING (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL));

CREATE POLICY "Clients insert own device_connections"
ON public.device_connections FOR INSERT
WITH CHECK (
  client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL)
  AND client_is_active(client_id)
);

CREATE POLICY "Clients update own device_connections"
ON public.device_connections FOR UPDATE
USING (
  client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL)
  AND client_is_active(client_id)
)
WITH CHECK (
  client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL)
  AND client_is_active(client_id)
);

CREATE TRIGGER trg_device_connections_updated_at
BEFORE UPDATE ON public.device_connections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();