
DROP FUNCTION IF EXISTS public.get_payment_info(uuid);

CREATE OR REPLACE FUNCTION public.get_payment_info()
RETURNS TABLE(bank_info text, whatsapp_number text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT bank_info, whatsapp_number FROM public.site_settings WHERE id = true LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_payment_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_info() TO anon, authenticated;
