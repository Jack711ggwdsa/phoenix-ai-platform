
ALTER TABLE public.client_submissions
  ADD COLUMN IF NOT EXISTS business_information text,
  ADD COLUMN IF NOT EXISTS services_products text,
  ADD COLUMN IF NOT EXISTS ai_reply_style text,
  ADD COLUMN IF NOT EXISTS preferred_languages text[],
  ADD COLUMN IF NOT EXISTS lead_collection_rules text[],
  ADD COLUMN IF NOT EXISTS business_hours text,
  ADD COLUMN IF NOT EXISTS important_notes text,
  ADD COLUMN IF NOT EXISTS submission_kind text NOT NULL DEFAULT 'setup';
