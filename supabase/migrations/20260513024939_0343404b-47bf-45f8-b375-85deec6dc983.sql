
-- 1. Extend clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS current_password_admin_only text,
  ADD COLUMN IF NOT EXISTS preferred_language text,
  ADD COLUMN IF NOT EXISTS other_notes text,
  ADD COLUMN IF NOT EXISTS password_updated_at timestamptz;

-- 2. client_submissions
CREATE TABLE IF NOT EXISTS public.client_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  submitted_by uuid,
  ai_business_info text,
  ai_prompt text,
  preferred_language text,
  service_pricing text,
  promotion text,
  faq text,
  other_notes text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage submissions" ON public.client_submissions;
CREATE POLICY "Admins manage submissions" ON public.client_submissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Clients view own submissions" ON public.client_submissions;
CREATE POLICY "Clients view own submissions" ON public.client_submissions
  FOR SELECT USING (
    client_id IN (SELECT profiles.client_id FROM profiles
                  WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Clients insert own submissions" ON public.client_submissions;
CREATE POLICY "Clients insert own submissions" ON public.client_submissions
  FOR INSERT WITH CHECK (
    client_id IN (SELECT profiles.client_id FROM profiles
                  WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL)
  );

CREATE TRIGGER trg_submissions_updated_at
  BEFORE UPDATE ON public.client_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. submission_checklist
CREATE TABLE IF NOT EXISTS public.submission_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.client_submissions(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_label text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  done_by uuid,
  sort_order int NOT NULL DEFAULT 0
);
ALTER TABLE public.submission_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage checklist" ON public.submission_checklist;
CREATE POLICY "Admins manage checklist" ON public.submission_checklist
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed checklist trigger
CREATE OR REPLACE FUNCTION public.seed_submission_checklist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.submission_checklist (submission_id, item_key, item_label, sort_order) VALUES
    (NEW.id, 'received',           'Received client info',           1),
    (NEW.id, 'checked_business',   'Checked business info',          2),
    (NEW.id, 'checked_pricing',    'Checked pricing',                3),
    (NEW.id, 'checked_promotion',  'Checked promotion',              4),
    (NEW.id, 'checked_faq',        'Checked FAQ',                    5),
    (NEW.id, 'prompt_updated',     'Created / updated AI prompt',    6),
    (NEW.id, 'n8n_updated',        'Updated n8n workflow',           7),
    (NEW.id, 'ai_tested',          'Tested AI reply',                8),
    (NEW.id, 'confirmation_sent',  'Sent confirmation to client',    9);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_checklist ON public.client_submissions;
CREATE TRIGGER trg_seed_checklist
  AFTER INSERT ON public.client_submissions
  FOR EACH ROW EXECUTE FUNCTION public.seed_submission_checklist();

-- 4. Extend log_client_changes to include channel + new fields
CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  fields text[] := ARRAY[
    'ai_business_info','ai_prompt','faq','service_pricing','promotion',
    'telegram_bot_link','whatsapp_link','messenger_link','instagram_link',
    'preferred_language','other_notes'
  ];
  f text; old_v text; new_v text;
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

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_log_client_changes ON public.clients;
CREATE TRIGGER trg_log_client_changes
  AFTER UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_client_changes();

-- Ensure updated_at trigger
DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Active-only client update policy
CREATE OR REPLACE FUNCTION public.client_is_active(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = _id
      AND COALESCE(status,'active') <> 'paused'
      AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
  )
$$;

DROP POLICY IF EXISTS "Clients update own record" ON public.clients;
CREATE POLICY "Clients update own record" ON public.clients
  FOR UPDATE USING (
    id IN (SELECT profiles.client_id FROM profiles
           WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL)
    AND public.client_is_active(id)
  )
  WITH CHECK (
    id IN (SELECT profiles.client_id FROM profiles
           WHERE profiles.id = auth.uid() AND profiles.client_id IS NOT NULL)
    AND public.client_is_active(id)
  );
