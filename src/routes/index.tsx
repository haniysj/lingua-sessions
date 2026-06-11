import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { formatOmr } from "@/lib/format";

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
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen text-brand-navy">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 space-y-12">
        <section className="text-center space-y-4 py-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand-gold">أكاديمية لينغويست</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight">
            أتقن اللغة الإنجليزية بأسلوب أكاديمي راقٍ.
          </h1>
          <p className="text-sm md:text-base text-brand-navy/60 max-w-xl mx-auto">
            دورات متخصصة لتدريب معلمي اللغة الإنجليزية، ودروس خاصة وجماعية لتطوير مستوى المتعلمين، يقدمها مدربون محترفون عبر جلسات مباشرة.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link to="/auth" className="px-5 py-2.5 rounded-lg bg-brand-navy text-white text-sm font-medium">ابدأ الآن</Link>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-2xl">الدورات المتاحة</h2>
            <span className="text-xs text-brand-navy/50">{courses?.length ?? 0} دورة</span>
          </div>

          {isLoading ? (
            <p className="text-sm text-brand-navy/50">جارٍ التحميل…</p>
          ) : !courses || courses.length === 0 ? (
            <div className="border-2 border-dashed border-brand-navy/10 rounded-2xl p-10 text-center text-sm text-brand-navy/50">
              لا توجد دورات منشورة بعد. تابعونا قريبًا.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((c) => (
                <article key={c.id} className="bg-white border border-brand-navy/5 p-5 rounded-xl shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-brand-sage text-brand-navy text-[10px] font-bold px-2 py-1 rounded-full">
                      {AUDIENCE_LABEL[c.audience] ?? c.audience}
                    </span>
                    <span className="text-brand-gold font-bold text-sm">{formatOmr(c.price)}</span>
                  </div>
                  <h3 className="font-serif text-lg mb-1">{c.title}</h3>
                  <p className="text-xs text-brand-navy/60 mb-3 flex-1">{c.description || "—"}</p>
                  <p className="text-[11px] text-brand-navy/50 mb-4">
                    {SESSION_LABEL[c.session_type] ?? c.session_type} ·{" "}
                    {Array.isArray(c.schedule_slots) ? c.schedule_slots.length : 0} مواعيد متاحة
                  </p>
                  <Link
                    to="/course/$id"
                    params={{ id: c.id }}
                    className="text-center bg-brand-navy text-white py-2 rounded-md text-sm font-medium"
                  >
                    احجز مقعدك
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <footer className="py-10 text-center text-xs text-brand-navy/40">© أكاديمية لينغويست</footer>
    </div>
  );
}
