DROP POLICY IF EXISTS "Anyone can submit registrations" ON public.registrations;
CREATE POLICY "Anyone can submit registrations" ON public.registrations
FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL AND guest_name IS NOT NULL AND guest_civil_id IS NOT NULL AND guest_phone IS NOT NULL)
  OR (user_id = auth.uid())
);

GRANT INSERT ON public.registrations TO anon;