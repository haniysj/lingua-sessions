
REVOKE SELECT ON public.registrations FROM anon;

CREATE OR REPLACE FUNCTION public.course_seats_taken(_course_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.registrations
   WHERE course_id = _course_id AND status <> 'cancelled';
$$;

REVOKE EXECUTE ON FUNCTION public.course_seats_taken(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.course_seats_taken(uuid) TO anon, authenticated;
