
-- Bulk public seats counter for homepage
CREATE OR REPLACE FUNCTION public.get_courses_seats_public(_ids uuid[])
RETURNS TABLE(course_id uuid, taken int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.course_id, COUNT(*)::int
  FROM public.registrations r
  WHERE r.course_id = ANY(_ids) AND r.status <> 'cancelled'
  GROUP BY r.course_id;
$$;

-- Teacher management policies
DROP POLICY IF EXISTS "Teachers manage their meetings" ON public.course_meetings;
CREATE POLICY "Teachers manage their meetings" ON public.course_meetings
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_meetings.course_id AND c.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_meetings.course_id AND c.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers manage their materials" ON public.course_materials;
CREATE POLICY "Teachers manage their materials" ON public.course_materials
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_materials.course_id AND c.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_materials.course_id AND c.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers manage quizzes for their courses" ON public.quizzes;
CREATE POLICY "Teachers manage quizzes for their courses" ON public.quizzes
FOR ALL TO authenticated
USING (course_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid()))
WITH CHECK (course_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers manage quiz questions" ON public.quiz_questions;
CREATE POLICY "Teachers manage quiz questions" ON public.quiz_questions
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id AND c.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id AND c.teacher_id = auth.uid()));

-- Storage policies for teachers on materials bucket
DROP POLICY IF EXISTS "Teachers upload own course materials" ON storage.objects;
CREATE POLICY "Teachers upload own course materials" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'materials'
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id::text = (storage.foldername(name))[1] AND c.teacher_id = auth.uid())
);

DROP POLICY IF EXISTS "Teachers read own course materials" ON storage.objects;
CREATE POLICY "Teachers read own course materials" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'materials'
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id::text = (storage.foldername(name))[1] AND c.teacher_id = auth.uid())
);

DROP POLICY IF EXISTS "Teachers delete own course materials" ON storage.objects;
CREATE POLICY "Teachers delete own course materials" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'materials'
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id::text = (storage.foldername(name))[1] AND c.teacher_id = auth.uid())
);

-- Prevent teachers from registering as students at DB level
DROP POLICY IF EXISTS "Teachers cannot register" ON public.registrations;
CREATE POLICY "Teachers cannot register" ON public.registrations
AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (NOT public.has_role(auth.uid(), 'teacher'));
