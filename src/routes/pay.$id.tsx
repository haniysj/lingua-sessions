import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { formatOmr, weeksBetween, totalHours, formatDateAr } from "@/lib/format";

export const Route = createFileRoute("/pay/$id")({
  head: () => ({ meta: [{ title: "تعليمات الدفع" }] }),
  component: PayPage,
});

const SESSION_LABEL: Record<string, string> = { private: "خاصة (فردية)", group: "جماعية" };

function PayPage() {
  const { id } = Route.useParams();
  const { data: settings } = useSiteSettings();

  const { data: course, isLoading } = useQuery({
    queryKey: ["pay-course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("title, description, price, hourly_rate, hours_per_week, start_date, end_date, session_type")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="min-h-screen"><SiteHeader /><div className="p-10 text-center text-brand-navy/50">…</div></div>;
  if (!course) return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16 text-center space-y-3">
        <p className="text-sm text-brand-navy/60">لم نعثر على الدورة.</p>
        <Link to="/" className="text-brand-gold underline text-sm">العودة</Link>
      </main>
    </div>
  );

  const weeks = weeksBetween(course.start_date, course.end_date);
  const hours = totalHours(weeks, course.hours_per_week);
  const total = hours * Number(course.hourly_rate ?? 0) || Number(course.price ?? 0);

  const waNumber = (settings?.whatsapp_number ?? "").replace(/[^\d+]/g, "");
  const waMsg = encodeURIComponent(
    `السلام عليكم،\nأودّ إرسال إيصال الدفع لدورة: ${course.title}\nالمبلغ: ${formatOmr(total)}`
  );
  const waUrl = waNumber ? `https://wa.me/${waNumber.replace(/^\+/, "")}?text=${waMsg}` : null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <Link to="/" className="text-xs text-brand-navy/50">← الرجوع</Link>
        <div className="bg-card border border-brand-navy/10 rounded-2xl p-6 mt-4 shadow-lg space-y-5">
          <header className="text-center space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-gold">تعليمات الدفع</p>
            <h1 className="font-serif text-2xl">{course.title}</h1>
            <p className="text-xs text-brand-navy/55">{SESSION_LABEL[course.session_type] ?? course.session_type}</p>
          </header>

          <div className="bg-brand-sage/40 rounded-xl p-4 space-y-2 text-sm">
            {course.start_date && <Row label="من" value={formatDateAr(course.start_date)} />}
            {course.end_date && <Row label="إلى" value={formatDateAr(course.end_date)} />}
            <Row label="عدد الأسابيع" value={`${weeks}`} />
            <Row label="إجمالي الساعات" value={`${hours}`} />
            <Row label="سعر الساعة" value={formatOmr(course.hourly_rate)} />
            <div className="h-px bg-brand-navy/10 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-brand-navy/60 text-xs">المبلغ الإجمالي</span>
              <span className="font-serif text-2xl text-brand-gold">{formatOmr(total)}</span>
            </div>
          </div>

          <div className="bg-white border border-brand-navy/10 rounded-xl p-4 space-y-2">
            <h3 className="font-serif text-base">بيانات الحساب البنكي</h3>
            {settings?.bank_info ? (
              <pre className="text-xs text-brand-navy/80 whitespace-pre-wrap font-sans leading-relaxed">{settings.bank_info}</pre>
            ) : (
              <p className="text-xs text-brand-navy/40">لم تُضف بيانات الحساب البنكي بعد. تواصل مع الإدارة.</p>
            )}
          </div>

          <div className="bg-brand-blush/60 border border-brand-gold/20 rounded-xl p-4 space-y-3">
            <p className="text-xs text-brand-navy/75 leading-relaxed">
              بعد تحويل المبلغ، الرجاء إرسال صورة الإيصال عبر واتساب لتأكيد حجزك.
            </p>
            {waUrl ? (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block text-center bg-emerald-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-emerald-700 transition">
                💬 إرسال الإيصال عبر واتساب
              </a>
            ) : (
              <p className="text-[11px] text-brand-navy/50 text-center">رقم الواتساب غير متاح حاليًا.</p>
            )}
            {settings?.whatsapp_number && (
              <p className="text-[11px] text-brand-navy/55 text-center" dir="ltr">{settings.whatsapp_number}</p>
            )}
          </div>
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
