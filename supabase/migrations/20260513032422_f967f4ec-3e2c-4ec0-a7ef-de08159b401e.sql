
-- 1. Stop field-by-field activity logging
DROP TRIGGER IF EXISTS log_client_changes ON public.clients;
DROP TRIGGER IF EXISTS trg_log_client_changes ON public.clients;

-- 2. Stop auto-seeding the separate checklist table; we move checklist into the submission row
DROP TRIGGER IF EXISTS trg_seed_checklist ON public.client_submissions;
DROP TRIGGER IF EXISTS seed_submission_checklist ON public.client_submissions;

-- 3. Extend client_submissions with denormalized client info, archive flag, and 5 checklist flags
ALTER TABLE public.client_submissions
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS checklist_info_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_prompt_updated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_n8n_updated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_ai_tested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_confirmation_sent boolean NOT NULL DEFAULT false;

-- 4. Backfill client_name / client_email
UPDATE public.client_submissions s
SET client_name = c.client_name, client_email = c.email
FROM public.clients c
WHERE s.client_id = c.id AND (s.client_name IS NULL OR s.client_email IS NULL);

-- 5. Auto-complete submission when all checklist boxes ticked
CREATE OR REPLACE FUNCTION public.auto_complete_submission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.checklist_info_reviewed
     AND NEW.checklist_prompt_updated
     AND NEW.checklist_n8n_updated
     AND NEW.checklist_ai_tested
     AND NEW.checklist_confirmation_sent
     AND NEW.status <> 'completed' THEN
    NEW.status := 'completed';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_complete_submission ON public.client_submissions;
CREATE TRIGGER trg_auto_complete_submission
BEFORE UPDATE ON public.client_submissions
FOR EACH ROW EXECUTE FUNCTION public.auto_complete_submission();
