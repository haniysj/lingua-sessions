
-- Roll back the SECURITY DEFINER view approach
DROP VIEW IF EXISTS public.public_courses;
DROP POLICY IF EXISTS "registered users read courses" ON public.courses;

-- Move meeting_link to its own restricted table
CREATE TABLE public.course_meetings (
  course_id uuid PRIMARY KEY REFERENCES public.courses(id) ON DELETE CASCADE,
  meeting_link text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill existing meeting links
INSERT INTO public.course_meetings (course_id, meeting_link)
SELECT id, meeting_link FROM public.courses WHERE meeting_link IS NOT NULL;

-- Drop the sensitive column from courses
ALTER TABLE public.courses DROP COLUMN meeting_link;

-- Restore public read of courses (now contains no sensitive data)
CREATE POLICY "anyone can read courses"
ON public.courses
FOR SELECT
TO anon, authenticated
USING (true);

-- Grants for course_meetings
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_meetings TO authenticated;
GRANT ALL ON public.course_meetings TO service_role;

ALTER TABLE public.course_meetings ENABLE ROW LEVEL SECURITY;

-- Only admins manage meeting links
CREATE POLICY "admins manage course meetings"
ON public.course_meetings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Registered users (and admins) can read the meeting link for their course
CREATE POLICY "registered users read meeting link"
ON public.course_meetings
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.course_id = course_meetings.course_id AND r.user_id = auth.uid()
  )
);
