import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [name, setName] = useState("");
  const [civilId, setCivilId] = useState("");
  const [phone, setPhone] = useState("");
  const [residence, setResidence] = useState("");

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: teacher } = useQuery({
    queryKey: ["course-teacher", course?.teacher_id],
    enabled: !!course?.teacher_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_teachers_public", { _ids: [course!.teacher_id!] });
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });

  const { data: seatsTaken = 0, refetch: refetchSeats } = useQuery({
    queryKey: ["course-seats", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("course_seats_taken", { _course_id: id });
      if (error) throw error;
      return Number(data ?? 0);
    },
  });

  const seatsTotal = Number(course?.seats_total ?? 0);
  const seatsRemaining = seatsTotal > 0 ? Math.max(0, seatsTotal - seatsTaken) : null;
  const isFull = seatsTotal > 0 && seatsRemaining === 0;

  async function reserve() {
    if (!course) return;
    if (!selectedSlot) { toast.error("اختر موعدًا"); return; }
    if (isFull) { toast.error("لا توجد مقاعد متاحة"); return; }
    const payload: {
      course_id: string; slot: string;
      user_id?: string;
      guest_name?: string; guest_civil_id?: string; guest_phone?: string; guest_residence?: string;
    } = { course_id: course.id, slot: selectedSlot };
    if (user) {
      payload.user_id = user.id;
    } else {
      if (!name.trim() || !civilId.trim() || !phone.trim() || !residence.trim()) {
        toast.error("الرجاء تعبئة جميع البيانات"); return;
      }
      payload.guest_name = name.trim();
      payload.guest_civil_id = civilId.trim();
      payload.guest_phone = phone.trim();
      payload.guest_residence = residence.trim();
    }
    setBusy(true);
    const { error } = await supabase.from("registrations").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حجز مقعدك");
    refetchSeats();
    try {
      const reg = user
        ? { slot: selectedSlot }
        : { name: payload.guest_name, civilId: payload.guest_civil_id, phone: payload.guest_phone, residence: payload.guest_residence, slot: selectedSlot };
      sessionStorage.setItem(`reg:${course.id}`, JSON.stringify(reg));
    } catch { /* ignore */ }
    navigate({ to: "/pay/$id", params: { id: course.id } });
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

          {teacher && (
            <div className="bg-brand-blush/40 rounded-xl p-4 flex gap-3 items-start">
              {teacher.avatar_url ? (
                <img src={teacher.avatar_url} alt={teacher.full_name ?? ""} className="size-14 rounded-full object-cover bg-brand-sage/40 shrink-0" />
              ) : (
                <div className="size-14 rounded-full bg-brand-sage/60 flex items-center justify-center text-brand-navy/60 shrink-0">👤</div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] text-brand-navy/50 uppercase tracking-wider">معلم الدورة</p>
                <p className="font-medium">{teacher.full_name || "—"}</p>
                {teacher.bio && <p className="text-xs text-brand-navy/60 mt-1 whitespace-pre-line">{teacher.bio}</p>}
              </div>
            </div>
          )}

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
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-lg">المواعيد المتاحة</h2>
              {seatsTotal > 0 && (
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${isFull ? "bg-red-100 text-red-700" : "bg-brand-sage text-brand-navy"}`}>
                  {isFull ? "اكتملت المقاعد" : `متبقي ${seatsRemaining} من ${seatsTotal} مقعد`}
                </span>
              )}
            </div>
            {slots.length === 0 ? (
              <p className="text-xs text-brand-navy/40">لا توجد مواعيد منشورة.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button key={s} type="button" onClick={() => setSelectedSlot(s)} disabled={isFull}
                    className={`px-3 py-2 rounded-lg text-xs border ${selectedSlot === s ? "bg-brand-navy text-white border-brand-navy" : "bg-white text-brand-navy border-brand-navy/10"} ${isFull ? "opacity-50 cursor-not-allowed" : ""}`}>{s}</button>
                ))}
              </div>
            )}
          </div>

          {!user && selectedSlot && !isFull && (
            <div className="pt-2 space-y-3 border-t border-brand-navy/10 pt-4">
              <h2 className="font-serif text-lg">بيانات المنتسب</h2>
              <div className="space-y-2">
                <Label className="text-xs">الاسم الثلاثي</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={150} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">الرقم المدني</Label>
                  <Input value={civilId} onChange={(e) => setCivilId(e.target.value)} maxLength={20} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">رقم الهاتف</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} dir="ltr" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">مكان السكن</Label>
                <Input value={residence} onChange={(e) => setResidence(e.target.value)} maxLength={150} />
              </div>
              <p className="text-[11px] text-brand-navy/50">يمكنك أيضًا <Link to="/auth" className="text-brand-gold underline">تسجيل الدخول</Link> إن كان لديك حساب.</p>
            </div>
          )}

          <div className="pt-2">
            <Button onClick={reserve} disabled={busy || !selectedSlot || isFull} className="w-full bg-brand-navy text-white hover:bg-brand-navy/90">
              {isFull ? "اكتملت المقاعد" : busy ? "…" : "احجز وانتقل للدفع"}
            </Button>
          </div>
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
