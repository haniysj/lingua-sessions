
-- Restrict public access to meeting_link on courses; expose a safe public view
DROP POLICY IF EXISTS "anyone can read courses" ON public.courses;

-- Admins and registered users can read full course rows (including meeting_link)
CREATE POLICY "registered users read courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.course_id = courses.id AND r.user_id = auth.uid()
  )
);

-- Public-safe view: excludes meeting_link
CREATE OR REPLACE VIEW public.public_courses
WITH (security_invoker = true) AS
SELECT id, title, description, audience, session_type, price, schedule_slots, created_at
FROM public.courses;

-- The view runs as invoker but we still need a base-table policy that allows anon to read non-sensitive cols.
-- Easiest: add a separate read policy on the table for the columns the view selects.
CREATE POLICY "public read non-sensitive courses"
ON public.courses
FOR SELECT
TO anon, authenticated
USING (true);

-- Wait — this re-exposes meeting_link. Instead drop and use SECURITY DEFINER view.
DROP POLICY IF EXISTS "public read non-sensitive courses" ON public.courses;
DROP VIEW IF EXISTS public.public_courses;

CREATE VIEW public.public_courses
WITH (security_invoker = false) AS
SELECT id, title, description, audience, session_type, price, schedule_slots, created_at
FROM public.courses;

ALTER VIEW public.public_courses OWNER TO postgres;
GRANT SELECT ON public.public_courses TO anon, authenticated;
