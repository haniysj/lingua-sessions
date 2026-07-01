import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useAuth } from "@/hooks/use-auth";
import { formatOmr, weeksBetween, totalHours } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "أكاديمية لينغويست — دروس إنجليزية احترافية" },
      { name: "description", content: "دورات اللغة الإنجليزية الخاصة والجماعية للمعلمين والمتعلمين، مع جدول مرن ودروس مباشرة." },
    ],
  }),
  component: HomePage,
});

const AUDIENCE_LABEL: Record<string, string> = { teachers: "تدريب معلمين", general: "إنجليزية عامة" };
const SESSION_LABEL: Record<string, string> = { private: "خاصة (فردية)", group: "جماعية" };

function HomePage() {
  const { data: site } = useSiteSettings();
  const { user, isTeacher } = useAuth();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const teacherIds = Array.from(new Set((courses ?? []).map((c) => c.teacher_id).filter((v): v is string => !!v)));
  const { data: teachers } = useQuery({
    queryKey: ["courses-teachers", teacherIds.sort().join(",")],
    enabled: teacherIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_teachers_public", { _ids: teacherIds });
      if (error) throw error;
      return new Map((data ?? []).map((t) => [t.id, t]));
    },
  });

  const courseIds = (courses ?? []).map((c) => c.id);
  const { data: seatsMap } = useQuery({
    queryKey: ["courses-seats", courseIds.sort().join(",")],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_courses_seats_public", { _ids: courseIds });
      if (error) throw error;
      const m = new Map<string, number>();
      (data ?? []).forEach((r: { course_id: string; taken: number }) => m.set(r.course_id, Number(r.taken)));
      return m;
    },
  });

  // Personalized greeting name (student view uses profile, teacher view uses profile too)
  const { data: myProfile } = useQuery({
    queryKey: ["home-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const siteName = site?.site_name || "لينغويست";
  const greetName = myProfile?.full_name?.trim() || user?.email?.split("@")[0] || "بك";
  const greeting = user
    ? (isTeacher ? `أهلاً المعلم ${greetName}` : `أهلاً ${greetName}`)
    : null;

  return (
    <div className="min-h-screen text-brand-navy">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 space-y-12">
        {greeting && (
          <div className="bg-brand-navy text-white rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-brand-navy/20">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-gold">مرحبًا بك مجددًا</p>
              <p className="font-serif text-xl md:text-2xl">{greeting} 👋</p>
            </div>
            <Link to="/dashboard" className="text-[11px] bg-brand-gold text-white px-3 py-1.5 rounded-lg font-bold">لوحتي ←</Link>
          </div>
        )}

        <section className="text-center space-y-4 py-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand-gold">{siteName}</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight">أتقن اللغة الإنجليزية بأسلوب أكاديمي راقٍ.</h1>
          <p className="text-sm md:text-base text-brand-navy/60 max-w-xl mx-auto">
            دورات متخصصة لتدريب معلمي اللغة الإنجليزية، ودروس خاصة وجماعية لتطوير مستوى المتعلمين.
          </p>
          {!user && (
            <div className="flex justify-center gap-3 pt-2">
              <Link to="/auth" className="px-5 py-2.5 rounded-lg bg-brand-navy text-white text-sm font-medium">ابدأ الآن</Link>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-2xl">الدورات المتاحة</h2>
            <span className="text-xs text-brand-navy/50">{courses?.length ?? 0} دورة</span>
          </div>

          {isLoading ? (
            <p className="text-sm text-brand-navy/50">…</p>
          ) : !courses || courses.length === 0 ? (
            <div className="border-2 border-dashed border-brand-navy/10 rounded-2xl p-10 text-center text-sm text-brand-navy/50">
              لا توجد دورات منشورة بعد.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((c) => {
                const weeks = weeksBetween(c.start_date, c.end_date);
                const hours = totalHours(weeks, c.hours_per_week);
                const total = hours * Number(c.hourly_rate ?? 0) || Number(c.price ?? 0);
                const teacher = c.teacher_id ? teachers?.get(c.teacher_id) : null;
                const seatsTotal = Number(c.seats_total ?? 0);
                const taken = seatsMap?.get(c.id) ?? 0;
                const remaining = seatsTotal > 0 ? Math.max(0, seatsTotal - taken) : null;
                const full = seatsTotal > 0 && remaining === 0;
                return (
                  <article key={c.id} className="bg-white border border-brand-navy/5 p-5 rounded-xl shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-brand-sage text-brand-navy text-[10px] font-bold px-2 py-1 rounded-full">{AUDIENCE_LABEL[c.audience] ?? c.audience}</span>
                      <span className="text-brand-gold font-bold text-sm">{formatOmr(total)}</span>
                    </div>
                    <h3 className="font-serif text-lg mb-1">{c.title}</h3>
                    <p className="text-xs text-brand-navy/60 mb-3 flex-1">{c.description || "—"}</p>
                    <p className="text-[11px] text-brand-navy/55 mb-1">{SESSION_LABEL[c.session_type] ?? c.session_type}</p>
                    {weeks > 0 && (
                      <p className="text-[11px] text-brand-navy/55 mb-3">⏱️ {weeks} أسبوع · {c.hours_per_week} س/أسبوع · {hours} ساعة إجمالًا</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px] text-brand-navy/70">
                      {teacher ? (
                        <div className="flex items-center gap-2">
                          {teacher.avatar_url ? (
                            <img src={teacher.avatar_url} alt="" className="size-6 rounded-full object-cover" />
                          ) : (
                            <div className="size-6 rounded-full bg-brand-sage/60 flex items-center justify-center text-[10px]">👤</div>
                          )}
                          <span>المعلم: {teacher.full_name || "—"}</span>
                        </div>
                      ) : (
                        <span className="text-brand-navy/40">المعلم: —</span>
                      )}
                      {seatsTotal > 0 && (
                        <span className={`px-2 py-0.5 rounded-full font-bold ${full ? "bg-red-100 text-red-700" : "bg-brand-blush text-brand-navy/80"}`}>
                          {full ? "اكتملت المقاعد" : `المقاعد: ${remaining} / ${seatsTotal}`}
                        </span>
                      )}
                    </div>
                    <Link to="/course/$id" params={{ id: c.id }} className="text-center bg-brand-navy text-white py-2 rounded-md text-sm font-medium">
                      {full ? "عرض التفاصيل" : "احجز مقعدك"}
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <footer className="py-10 text-center text-xs text-brand-navy/40">© {siteName}</footer>
    </div>
  );
}
