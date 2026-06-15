
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS bank_info text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp_number text;

ALTER TABLE public.registrations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_user_id_course_id_key;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_user_id_course_id_key UNIQUE (user_id, course_id);
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS guest_civil_id text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS guest_phone text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS guest_residence text;

GRANT INSERT ON public.registrations TO anon;

DROP POLICY IF EXISTS "anon insert guest registrations" ON public.registrations;
CREATE POLICY "anon insert guest registrations" ON public.registrations
  FOR INSERT TO anon
  WITH CHECK (
    user_id IS NULL
    AND guest_name IS NOT NULL AND length(trim(guest_name)) > 0
    AND guest_phone IS NOT NULL AND length(trim(guest_phone)) > 0
    AND guest_civil_id IS NOT NULL AND length(trim(guest_civil_id)) > 0
  );

DROP POLICY IF EXISTS "users insert own registrations" ON public.registrations;
CREATE POLICY "users insert own registrations" ON public.registrations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR (user_id IS NULL AND guest_name IS NOT NULL));
