import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await (supabase.rpc as never)("get_public_site_settings");
      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      return row
        ? { site_name: row.site_name as string, logo_url: (row.logo_url as string | null) ?? null }
        : { site_name: "لينغويست", logo_url: null as string | null };
    },
    staleTime: 60_000,
  });
}

export function usePaymentInfo(enabled = true) {
  return useQuery({
    queryKey: ["payment-info"],
    enabled,
    queryFn: async () => {
      const { data } = await (supabase.rpc as never)("get_payment_info");
      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      return row
        ? { bank_info: (row.bank_info as string | null) ?? null, whatsapp_number: (row.whatsapp_number as string | null) ?? null }
        : { bank_info: null as string | null, whatsapp_number: null as string | null };
    },
    staleTime: 60_000,
  });
}
