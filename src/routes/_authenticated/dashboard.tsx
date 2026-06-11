import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Reg = {
  id: string;
  slot: string | null;
  payment_link: string | null;
  created_at: string;
  courses: { id: string; title: string; meeting_link: string | null; session_type: string } | null;
};

function Dashboard() {
  const { user } = useAuth();
  const { data: regs, isLoading } = useQuery({
    queryKey: ["my-regs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, slot, payment_link, created_at, courses(id, title, meeting_link, session_type)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Reg[];
    },
  });

  return (
    <div className="min-h-screen bg-brand-cream text-brand-navy">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header>
          <h1 className="font-serif text-3xl">أهلاً بك</h1>
          <p className="text-sm text-brand-navy/50 mt-1">{user?.email}</p>
        </header>

        <section className="bg-brand-navy text-white rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">جلساتي القادمة</span>
          </div>
          {isLoading ? (
            <p className="text-sm text-white/60">جارٍ التحميل…</p>
          ) : !regs || regs.length === 0 ? (
            <p className="text-sm text-white/60">لا توجد جلسات مسجلة بعد. <Link to="/" className="underline">تصفح الدورات</Link></p>
          ) : (
            <ul className="space-y-3">
              {regs.map((r) => (
                <li key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-lg">{r.courses?.title ?? "دورة"}</h3>
                    <p className="text-xs text-white/60">{r.slot ?? "سيتم تحديد الموعد"}</p>
                    {r.payment_link && (
                      <a href={r.payment_link} target="_blank" rel="noreferrer" className="text-[11px] text-brand-gold underline mt-1 inline-block">
                        رابط الدفع
                      </a>
                    )}
                  </div>
                  {r.courses?.meeting_link ? (
                    <a
                      href={r.courses.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white text-brand-navy py-2 px-4 rounded-lg font-bold text-sm text-center"
                    >انضم للجلسة المباشرة</a>
                  ) : (
                    <span className="text-[11px] text-white/40">رابط الاجتماع قيد التحضير</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
