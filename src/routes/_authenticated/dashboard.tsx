import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { safeUrl } from "@/lib/safe-url";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Reg = {
  id: string;
  slot: string | null;
  payment_link: string | null;
  created_at: string;
  course_id: string;
  courses: { id: string; title: string; session_type: string } | null;
};

function Dashboard() {
  const { user } = useAuth();
  const { data: regs, isLoading } = useQuery({
    queryKey: ["my-regs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, slot, payment_link, created_at, course_id, courses(id, title, session_type)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Reg[];
      const ids = rows.map((r) => r.course_id);
      const meetings = new Map<string, string | null>();
      if (ids.length) {
        const { data: m } = await supabase
          .from("course_meetings")
          .select("course_id, meeting_link")
          .in("course_id", ids);
        (m ?? []).forEach((row) => meetings.set(row.course_id, row.meeting_link));
      }
      return rows.map((r) => ({ ...r, meeting_link: meetings.get(r.course_id) ?? null }));
    },
  });

  return (
    <div className="min-h-screen text-brand-navy">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header>
          <h1 className="font-serif text-3xl">أهلاً بك</h1>
          <p className="text-sm text-brand-navy/50 mt-1">{user?.email}</p>
        </header>

        <section className="bg-brand-navy text-white rounded-2xl p-6 space-y-3 shadow-xl shadow-brand-navy/20">
          <div className="flex items-center gap-3">
            <div className="size-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">جلساتي القادمة</span>
          </div>
          {isLoading ? (
            <p className="text-sm text-white/60">جارٍ التحميل…</p>
          ) : !regs || regs.length === 0 ? (
            <p className="text-sm text-white/60">لا توجد جلسات مسجلة بعد. <Link to="/" className="underline">تصفح الدورات</Link></p>
          ) : (
            <ul className="space-y-3">
              {regs.map((r) => {
                const meet = safeUrl(r.meeting_link);
                return (
                  <li key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-lg">{r.courses?.title ?? "دورة"}</h3>
                      <p className="text-xs text-white/60">{r.slot ?? "سيتم تحديد الموعد"}</p>
                      <Link
                        to="/pay/$id"
                        params={{ id: r.id }}
                        className="text-[11px] text-brand-gold underline mt-1 inline-block"
                      >
                        {r.payment_link ? "عرض ملخص الدفع وإكماله ←" : "عرض تفاصيل الدفع"}
                      </Link>
                    </div>
                    {meet ? (
                      <a
                        href={meet}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-brand-gold text-white py-2 px-4 rounded-lg font-bold text-sm text-center hover:bg-brand-gold/90 transition"
                      >انضم للجلسة المباشرة</a>
                    ) : (
                      <span className="text-[11px] text-white/40">رابط الاجتماع قيد التحضير</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
