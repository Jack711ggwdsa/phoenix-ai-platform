
-- New client fields
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS temporary_password text,
  ADD COLUMN IF NOT EXISTS password_note text,
  ADD COLUMN IF NOT EXISTS n8n_workflow_name text,
  ADD COLUMN IF NOT EXISTS n8n_workflow_status text DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS automation_note text,
  ADD COLUMN IF NOT EXISTS ai_business_info text,
  ADD COLUMN IF NOT EXISTS faq text,
  ADD COLUMN IF NOT EXISTS service_pricing text,
  ADD COLUMN IF NOT EXISTS promotion text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_set_updated_at ON public.clients;
CREATE TRIGGER clients_set_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Activity log
CREATE TABLE IF NOT EXISTS public.client_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage activity log" ON public.client_activity_log;
CREATE POLICY "Admins manage activity log" ON public.client_activity_log
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Clients view own activity" ON public.client_activity_log;
CREATE POLICY "Clients view own activity" ON public.client_activity_log
FOR SELECT USING (
  client_id IN (
    SELECT profiles.client_id FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL
  )
);

-- Trigger that logs changes to client-editable fields
CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fields text[] := ARRAY['ai_business_info','ai_prompt','faq','service_pricing','promotion'];
  f text;
  old_v text;
  new_v text;
BEGIN
  FOREACH f IN ARRAY fields LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', f, f)
      INTO old_v, new_v USING OLD, NEW;
    IF old_v IS DISTINCT FROM new_v THEN
      INSERT INTO public.client_activity_log (client_id, user_id, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), f, old_v, new_v);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_log_changes ON public.clients;
CREATE TRIGGER clients_log_changes
AFTER UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.log_client_changes();

-- Allow clients to update only their own client row (RLS UPDATE policy)
DROP POLICY IF EXISTS "Clients update own record" ON public.clients;
CREATE POLICY "Clients update own record" ON public.clients
FOR UPDATE USING (
  id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid() AND client_id IS NOT NULL)
) WITH CHECK (
  id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid() AND client_id IS NOT NULL)
);
