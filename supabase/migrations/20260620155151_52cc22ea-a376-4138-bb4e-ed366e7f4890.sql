
-- Teachers feature
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Public RPC: fetch public teacher info for a set of teacher ids
CREATE OR REPLACE FUNCTION public.get_teachers_public(_ids uuid[])
RETURNS TABLE(id uuid, full_name text, avatar_url text, bio text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.bio
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_teachers_public(uuid[]) TO anon, authenticated;

-- Admin RPC: list teachers (those with role 'teacher')
CREATE OR REPLACE FUNCTION public.list_teachers()
RETURNS TABLE(id uuid, full_name text, email text, phone text, avatar_url text, bio text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.phone, p.avatar_url, p.bio
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'teacher'
  ORDER BY p.full_name NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_teachers() TO authenticated;
