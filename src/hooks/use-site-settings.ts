import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("site_name, logo_url, bank_info, whatsapp_number")
        .eq("id", true)
        .maybeSingle();
      return data ?? { site_name: "لينغويست", logo_url: null as string | null, bank_info: null as string | null, whatsapp_number: null as string | null };
    },
    staleTime: 60_000,
  });
}
