
-- 1. Extend device_connections
ALTER TABLE public.device_connections
  ADD COLUMN IF NOT EXISTS device_name text,
  ADD COLUMN IF NOT EXISTS qr_code text,
  ADD COLUMN IF NOT EXISTS qr_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS session_health text DEFAULT 'unknown';

-- 2. Realtime
ALTER TABLE public.device_connections REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='device_connections';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.device_connections';
  END IF;
END $$;

-- 3. Inbox contacts
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  device_slot integer NOT NULL,
  phone text NOT NULL,
  display_name text,
  avatar_url text,
  tags text[] DEFAULT '{}',
  assigned_staff text,
  lead_score integer DEFAULT 0,
  notes text,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, device_slot, phone)
);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage whatsapp_contacts" ON public.whatsapp_contacts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients view own whatsapp_contacts" ON public.whatsapp_contacts
  FOR SELECT USING (client_id IN (
    SELECT profiles.client_id FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL
  ));

CREATE POLICY "Clients insert own whatsapp_contacts" ON public.whatsapp_contacts
  FOR INSERT WITH CHECK (client_id IN (
    SELECT profiles.client_id FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL
  ) AND client_is_active(client_id));

CREATE POLICY "Clients update own whatsapp_contacts" ON public.whatsapp_contacts
  FOR UPDATE USING (client_id IN (
    SELECT profiles.client_id FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL
  ) AND client_is_active(client_id));

-- 4. Inbox messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  device_slot integer NOT NULL,
  contact_id uuid REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('incoming','outgoing')),
  message_type text NOT NULL DEFAULT 'text',
  body text,
  media_url text,
  is_ai_reply boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage whatsapp_messages" ON public.whatsapp_messages
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients view own whatsapp_messages" ON public.whatsapp_messages
  FOR SELECT USING (client_id IN (
    SELECT profiles.client_id FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL
  ));

CREATE POLICY "Clients insert own whatsapp_messages" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (client_id IN (
    SELECT profiles.client_id FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL
  ) AND client_is_active(client_id));

-- timestamps
DROP TRIGGER IF EXISTS trg_whatsapp_contacts_updated ON public.whatsapp_contacts;
CREATE TRIGGER trg_whatsapp_contacts_updated BEFORE UPDATE ON public.whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wa_contacts_client_device ON public.whatsapp_contacts(client_id, device_slot, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_contact ON public.whatsapp_messages(contact_id, sent_at);
