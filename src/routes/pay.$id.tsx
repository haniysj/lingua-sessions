import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { formatOmr, weeksBetween, totalHours } from "@/lib/format";
import { safeUrl } from "@/lib/safe-url";

export const Route = createFileRoute("/pay/$id")({
  head: () => ({ meta: [{ title: "ملخص الدفع" }] }),
  component: PayPage,
});

const SESSION_LABEL: Record<string, string> = { private: "خاصة (فردية)", group: "جماعية" };

function PayPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["pay-reg", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, slot, payment_link, course_id, user_id, courses(title, description, price, hourly_rate, hours_per_week, start_date, end_date, session_type, audience)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (loading || isLoading) return <div className="min-h-screen"><SiteHeader /><div className="p-10 text-center text-brand-navy/50">…</div></div>;
  if (!user) { navigate({ to: "/auth" }); return null; }
  if (!data) return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16 text-center space-y-3">
        <p className="text-sm text-brand-navy/60">لم نعثر على هذا الحجز.</p>
        <Link to="/dashboard" className="text-brand-gold underline text-sm">العودة</Link>
      </main>
    </div>
  );

  const course = data.courses;
  const pay = safeUrl(data.payment_link);
  const weeks = weeksBetween(course?.start_date, course?.end_date);
  const hours = totalHours(weeks, course?.hours_per_week);
  const total = hours * Number(course?.hourly_rate ?? 0) || Number(course?.price ?? 0);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <Link to="/dashboard" className="text-xs text-brand-navy/50">← الرجوع</Link>
        <div className="bg-card border border-brand-navy/10 rounded-2xl p-6 mt-4 shadow-lg space-y-5">
          <header className="text-center space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-gold">ملخص الدفع</p>
            <h1 className="font-serif text-2xl">{course?.title ?? "دورة"}</h1>
            <p className="text-xs text-brand-navy/55">{SESSION_LABEL[course?.session_type ?? ""] ?? course?.session_type}</p>
          </header>

          <div className="bg-brand-sage/40 rounded-xl p-4 space-y-2 text-sm">
            <Row label="نوع الجلسة" value={SESSION_LABEL[course?.session_type ?? ""] ?? "—"} />
            <Row label="الموعد" value={data.slot ?? "سيتم التنسيق"} />
            <Row label="عدد الأسابيع" value={`${weeks}`} />
            <Row label="ساعات/أسبوع" value={`${course?.hours_per_week ?? 0}`} />
            <Row label="إجمالي الساعات" value={`${hours}`} />
            <Row label="سعر الساعة" value={formatOmr(course?.hourly_rate)} />
            <div className="h-px bg-brand-navy/10 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-brand-navy/60 text-xs">{hours} × {formatOmr(course?.hourly_rate)}</span>
              <span className="font-serif text-xl text-brand-navy">{formatOmr(total)}</span>
            </div>
          </div>

          {pay ? (
            <a href={pay} target="_blank" rel="noopener noreferrer" className="block text-center bg-brand-navy text-white py-3 rounded-lg font-bold text-sm hover:bg-brand-navy/90 transition">
              المتابعة إلى بوابة الدفع ←
            </a>
          ) : (
            <div className="bg-brand-blush border border-brand-gold/30 rounded-lg p-4 text-center text-xs text-brand-navy/70">
              لم يتم إضافة رابط الدفع بعد.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-brand-navy/60">{label}</span>
      <span className="font-medium text-brand-navy">{value}</span>
    </div>
  );
}
