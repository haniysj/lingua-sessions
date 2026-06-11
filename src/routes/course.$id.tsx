import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

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

  async function reserve() {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!course) return;
    setBusy(true);
    const { error } = await supabase.from("registrations").insert({
      user_id: user.id,
      course_id: course.id,
      slot: selectedSlot,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/reserved" });
  }

  if (isLoading) return (
    <div className="min-h-screen bg-brand-cream"><SiteHeader /><div className="p-8 text-center text-brand-navy/50">جارٍ التحميل…</div></div>
  );

  if (!course) return (
    <div className="min-h-screen bg-brand-cream">
      <SiteHeader />
      <div className="p-10 text-center"><p>الدورة غير موجودة.</p>
        <Link to="/" className="text-brand-gold underline text-sm">العودة للدورات</Link>
      </div>
    </div>
  );

  const slots: string[] = Array.isArray(course.schedule_slots) ? (course.schedule_slots as string[]) : [];

  return (
    <div className="min-h-screen bg-brand-cream text-brand-navy">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <Link to="/" className="text-xs text-brand-navy/50">← كل الدورات</Link>
        <article className="bg-white border border-brand-navy/5 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-start gap-3">
            <div>
              <span className="bg-brand-sage text-brand-navy text-[10px] font-bold px-2 py-1 rounded-full">
                {AUDIENCE_LABEL[course.audience] ?? course.audience}
              </span>
              <h1 className="font-serif text-3xl mt-3">{course.title}</h1>
              <p className="text-xs text-brand-navy/50 mt-1">{SESSION_LABEL[course.session_type] ?? course.session_type}</p>
            </div>
            <span className="text-brand-gold font-medium text-lg">{Number(course.price).toFixed(2)} $</span>
          </div>
          <p className="text-sm text-brand-navy/70 leading-relaxed whitespace-pre-line">{course.description}</p>

          <div className="pt-2">
            <h2 className="font-serif text-lg mb-3">المواعيد المتاحة</h2>
            {slots.length === 0 ? (
              <p className="text-xs text-brand-navy/40">لا توجد مواعيد منشورة — تواصل مع المدرب لتحديد موعد.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSlot(s)}
                    className={`px-3 py-2 rounded-lg text-xs border ${
                      selectedSlot === s ? "bg-brand-navy text-white border-brand-navy" : "bg-white text-brand-navy border-brand-navy/10"
                    }`}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>

          <Button onClick={reserve} disabled={busy} className="w-full bg-brand-navy text-white hover:bg-brand-navy/90 mt-2">
            {busy ? "…" : "احجز مقعدك"}
          </Button>
          <p className="text-[11px] text-center text-brand-navy/40">سيتم إرسال رابط الدفع لاحقًا عبر البريد الإلكتروني.</p>
        </article>
      </main>
    </div>
  );
}
