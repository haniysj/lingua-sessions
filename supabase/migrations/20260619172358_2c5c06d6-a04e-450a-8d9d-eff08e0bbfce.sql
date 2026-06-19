
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS seats_total integer NOT NULL DEFAULT 0;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.registrations ADD CONSTRAINT registrations_status_check CHECK (status IN ('pending','confirmed','cancelled'));
GRANT SELECT ON public.registrations TO anon;
