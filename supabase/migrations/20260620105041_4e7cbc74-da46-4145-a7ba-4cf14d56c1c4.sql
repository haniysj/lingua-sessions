
DROP POLICY IF EXISTS "anyone reads settings" ON public.site_settings;

CREATE POLICY "admins read settings"
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_public_site_settings()
RETURNS TABLE(site_name text, logo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT site_name, logo_url FROM public.site_settings WHERE id = true LIMIT 1; $$;
REVOKE ALL ON FUNCTION public.get_public_site_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_site_settings() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_payment_info(_registration_id uuid)
RETURNS TABLE(bank_info text, whatsapp_number text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.registrations WHERE id = _registration_id) THEN
    RAISE EXCEPTION 'registration not found';
  END IF;
  RETURN QUERY SELECT s.bank_info, s.whatsapp_number FROM public.site_settings s WHERE s.id = true LIMIT 1;
END; $$;
REVOKE ALL ON FUNCTION public.get_payment_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_info(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "auth read questions" ON public.quiz_questions;
CREATE POLICY "admins read questions"
  ON public.quiz_questions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_quiz_questions_public(_quiz_id uuid)
RETURNS TABLE(id uuid, "position" int, prompt text, choices jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT q.id, q."position", q.prompt, q.choices
  FROM public.quiz_questions q
  WHERE q.quiz_id = _quiz_id
  ORDER BY q."position";
$$;
REVOKE ALL ON FUNCTION public.get_quiz_questions_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions_public(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_quiz_id uuid, _answers jsonb)
RETURNS TABLE(score int, total int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _score int := 0;
  _total int := 0;
  q record;
  ans int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  FOR q IN SELECT qq.id, qq.correct_index FROM public.quiz_questions qq WHERE qq.quiz_id = _quiz_id LOOP
    _total := _total + 1;
    BEGIN
      ans := (_answers ->> q.id::text)::int;
      IF ans = q.correct_index THEN _score := _score + 1; END IF;
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
  INSERT INTO public.quiz_attempts (quiz_id, user_id, score, total, answers)
  VALUES (_quiz_id, _uid, _score, _total, _answers);
  RETURN QUERY SELECT _score, _total;
END; $$;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

DROP POLICY IF EXISTS "registered or admin read materials" ON public.course_materials;
CREATE POLICY "registered or admin read materials"
  ON public.course_materials FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.registrations r
      WHERE r.course_id = course_materials.course_id
        AND r.user_id = auth.uid()
        AND r.status = 'confirmed')
  );

DROP POLICY IF EXISTS "registered users read meeting link" ON public.course_meetings;
CREATE POLICY "registered users read meeting link"
  ON public.course_meetings FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.registrations r
      WHERE r.course_id = course_meetings.course_id
        AND r.user_id = auth.uid()
        AND r.status = 'confirmed')
  );

DROP POLICY IF EXISTS "registered read materials storage" ON storage.objects;
CREATE POLICY "registered read materials storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'materials'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.course_materials cm
        JOIN public.registrations r ON r.course_id = cm.course_id
        WHERE cm.storage_path = objects.name
          AND r.user_id = auth.uid()
          AND r.status = 'confirmed'
      )
    )
  );

DROP POLICY IF EXISTS "Anyone can submit registrations" ON public.registrations;
DROP POLICY IF EXISTS "users insert own registrations" ON public.registrations;
CREATE POLICY "users insert own registrations"
  ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND user_id IS NOT NULL);
