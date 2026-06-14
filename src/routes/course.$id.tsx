import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { formatOmr, weeksBetween, totalHours, formatDateAr } from "@/lib/format";

export const Route = createFileRoute("/course/$id")({
  component: CourseDetail,
});

const AUDIENCE_LABEL: Record<string, string> = { teachers: "تدريب معلمين", general: "إنجليزية عامة" };
const SESSION_LABEL: Record<string, string> = { private: "خاصة (فردية)", group: "جماعية" };

function CourseDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function reserve(goToPayment: boolean) {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!course) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("registrations")
      .insert({ user_id: user.id, course_id: course.id, slot: selectedSlot })
      .select("id")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حجز مقعدك");
    if (goToPayment && data?.id) {
      navigate({ to: "/pay/$id", params: { id: data.id } });
    } else {
      navigate({ to: "/reserved" });
    }
  }

  if (isLoading) return <div className="min-h-screen"><SiteHeader /><div className="p-8 text-center text-brand-navy/50">…</div></div>;
  if (!course) return (
    <div className="min-h-screen"><SiteHeader />
      <div className="p-10 text-center"><p>الدورة غير موجودة.</p><Link to="/" className="text-brand-gold underline text-sm">العودة</Link></div>
    </div>
  );

  const slots: string[] = Array.isArray(course.schedule_slots) ? (course.schedule_slots as string[]) : [];
  const weeks = weeksBetween(course.start_date, course.end_date);
  const hours = totalHours(weeks, course.hours_per_week);
  const total = hours * Number(course.hourly_rate ?? 0) || Number(course.price ?? 0);

  return (
    <div className="min-h-screen text-brand-navy">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <Link to="/" className="text-xs text-brand-navy/50">← كل الدورات</Link>
        <article className="bg-white border border-brand-navy/5 rounded-2xl p-6 space-y-4">
          <div>
            <span className="bg-brand-sage text-brand-navy text-[10px] font-bold px-2 py-1 rounded-full">
              {AUDIENCE_LABEL[course.audience] ?? course.audience}
            </span>
            <h1 className="font-serif text-3xl mt-3">{course.title}</h1>
            <p className="text-xs text-brand-navy/50 mt-1">{SESSION_LABEL[course.session_type] ?? course.session_type}</p>
          </div>
          <p className="text-sm text-brand-navy/70 leading-relaxed whitespace-pre-line">{course.description}</p>

          {(course.start_date || course.hours_per_week > 0) && (
            <div className="bg-brand-sage/40 rounded-xl p-4 space-y-2 text-sm">
              <h3 className="font-serif text-base">تفاصيل الدورة</h3>
              <Row label="من" value={formatDateAr(course.start_date)} />
              <Row label="إلى" value={formatDateAr(course.end_date)} />
              <Row label="عدد الأسابيع" value={`${weeks} أسبوع`} />
              <Row label="ساعات الأسبوع" value={`${course.hours_per_week} ساعة`} />
              <Row label="إجمالي الساعات" value={`${hours} ساعة`} />
              <div className="h-px bg-brand-navy/10 my-2" />
              <Row label="سعر الساعة" value={formatOmr(course.hourly_rate)} />
              <div className="flex justify-between items-center pt-1">
                <span className="text-brand-navy/60 text-xs">{hours} × {formatOmr(course.hourly_rate)}</span>
                <span className="font-serif text-xl text-brand-gold">{formatOmr(total)}</span>
              </div>
            </div>
          )}

          <div className="pt-2">
            <h2 className="font-serif text-lg mb-3">المواعيد المتاحة</h2>
            {slots.length === 0 ? (
              <p className="text-xs text-brand-navy/40">لا توجد مواعيد منشورة.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button key={s} type="button" onClick={() => setSelectedSlot(s)}
                    className={`px-3 py-2 rounded-lg text-xs border ${selectedSlot === s ? "bg-brand-navy text-white border-brand-navy" : "bg-white text-brand-navy border-brand-navy/10"}`}>{s}</button>
                ))}
              </div>
            )}
          </div>

          <Button onClick={reserve} disabled={busy} className="w-full bg-brand-navy text-white hover:bg-brand-navy/90 mt-2">
            {busy ? "…" : "احجز مقعدك"}
          </Button>
        </article>
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
