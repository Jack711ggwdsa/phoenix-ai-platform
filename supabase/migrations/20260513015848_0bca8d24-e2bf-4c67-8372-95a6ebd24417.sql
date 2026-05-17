
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS business_industry text,
  ADD COLUMN IF NOT EXISTS package_name text,
  ADD COLUMN IF NOT EXISTS telegram_bot_link text,
  ADD COLUMN IF NOT EXISTS whatsapp_link text,
  ADD COLUMN IF NOT EXISTS messenger_link text,
  ADD COLUMN IF NOT EXISTS messenger_status text DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS instagram_link text,
  ADD COLUMN IF NOT EXISTS instagram_status text DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS n8n_workflow_link text,
  ADD COLUMN IF NOT EXISTS renewal_note text,
  ADD COLUMN IF NOT EXISTS internal_admin_note text;

-- Backfill business_industry from old business_type if empty
UPDATE public.clients SET business_industry = business_type WHERE business_industry IS NULL AND business_type IS NOT NULL;
UPDATE public.clients SET telegram_bot_link = telegram_bot WHERE telegram_bot_link IS NULL AND telegram_bot IS NOT NULL;

-- Stop auto-creating profiles on signup; admin will provision accounts.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
