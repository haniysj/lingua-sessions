import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { usePaymentInfo } from "@/hooks/use-site-settings";
import { useAuth } from "@/hooks/use-auth";
import { formatOmr, weeksBetween, totalHours, formatDateAr } from "@/lib/format";
import { parseSlot } from "@/lib/slots";

export const Route = createFileRoute("/pay/$id")({
  head: () => ({ meta: [{ title: "تعليمات الدفع" }] }),
  component: PayPage,
});

const SESSION_LABEL: Record<string, string> = { private: "خاصة (فردية)", group: "جماعية" };

type StoredReg = { name?: string; civilId?: string; phone?: string; residence?: string; slot?: string };

function PayPage() {
  const { id } = Route.useParams();
  const { data: settings } = usePaymentInfo();
  const { user } = useAuth();
  const [stored, setStored] = useState<StoredReg | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`reg:${id}`);
      if (raw) setStored(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [id]);

  const { data: course, isLoading } = useQuery({
    queryKey: ["pay-course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, price, hourly_rate, hours_per_week, start_date, end_date, session_type, teacher_id")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: teacher } = useQuery({
    queryKey: ["pay-teacher", course?.teacher_id],
    enabled: !!course?.teacher_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_teachers_public", { _ids: [course!.teacher_id!] });
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });

  // For logged-in users, fetch their profile to populate the WhatsApp message
  const { data: profile } = useQuery({
    queryKey: ["pay-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, phone").eq("id", user!.id).maybeSingle();
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

  const studentName = stored?.name ?? profile?.full_name ?? "";
  const studentPhone = stored?.phone ?? profile?.phone ?? "";
  const studentCivil = stored?.civilId ?? "";
  const studentResidence = stored?.residence ?? "";
  const slot = stored?.slot ? parseSlot(stored.slot).label : "";

  const lines = [
    "السلام عليكم،",
    "أرفقت إيصال الدفع الخاص بحجزي في الدورة التالية:",
    "",
    "📚 *تفاصيل الدورة*",
    `• الدورة: ${course.title}`,
    `• نوع الجلسة: ${SESSION_LABEL[course.session_type] ?? course.session_type}`,
    teacher?.full_name ? `• المعلم: ${teacher.full_name}` : "",
    course.start_date ? `• تاريخ البدء: ${formatDateAr(course.start_date)}` : "",
    course.end_date ? `• تاريخ النهاية: ${formatDateAr(course.end_date)}` : "",
    slot ? `• التوقيت: ${slot}` : "",
    `• إجمالي الساعات: ${hours}`,
    `• التكلفة الإجمالية: ${formatOmr(total)}`,
    "",
    "👤 *بيانات المنتسب*",
    studentName ? `• الاسم: ${studentName}` : "",
    studentCivil ? `• الرقم المدني: ${studentCivil}` : "",
    studentPhone ? `• رقم الهاتف: ${studentPhone}` : "",
    studentResidence ? `• مكان السكن: ${studentResidence}` : "",
  ].filter(Boolean);

  const waMsg = encodeURIComponent(lines.join("\n"));
  const waUrl = waNumber ? `https://wa.me/${waNumber.replace(/^\+/, "")}?text=${waMsg}` : null;

  const hasStudentInfo = studentName || studentCivil || studentPhone || studentResidence;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <Link to="/" className="text-xs text-brand-navy/50">← الرجوع</Link>
        <div className="bg-card border border-brand-navy/10 rounded-2xl p-6 mt-4 shadow-lg space-y-5">
          <header className="text-center space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-gold">ملخص الحجز وتعليمات الدفع</p>
            <h1 className="font-serif text-2xl">{course.title}</h1>
            <p className="text-xs text-brand-navy/55">{SESSION_LABEL[course.session_type] ?? course.session_type}</p>
          </header>

          {hasStudentInfo && (
            <div className="bg-white border border-brand-navy/10 rounded-xl p-4 space-y-2">
              <h3 className="font-serif text-base">بيانات المنتسب</h3>
              {studentName && <Row label="الاسم" value={studentName} />}
              {studentCivil && <Row label="الرقم المدني" value={studentCivil} />}
              {studentPhone && <Row label="رقم الهاتف" value={studentPhone} />}
              {studentResidence && <Row label="مكان السكن" value={studentResidence} />}
              {slot && <Row label="الموعد المختار" value={slot} />}
            </div>
          )}

          {teacher && (
            <div className="bg-brand-blush/40 border border-brand-gold/20 rounded-xl p-4 flex gap-3 items-start">
              {teacher.avatar_url ? (
                <img src={teacher.avatar_url} alt="" className="size-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="size-12 rounded-full bg-brand-sage/60 flex items-center justify-center text-brand-navy/60 shrink-0">👤</div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] text-brand-navy/50 uppercase tracking-wider">معلم الدورة</p>
                <p className="font-medium">{teacher.full_name || "—"}</p>
                {teacher.bio && <p className="text-[11px] text-brand-navy/60 mt-1 line-clamp-3">{teacher.bio}</p>}
              </div>
            </div>
          )}

          <div className="bg-brand-sage/40 rounded-xl p-4 space-y-2 text-sm">
            <h3 className="font-serif text-base mb-1">تفاصيل الدورة</h3>
            {course.start_date && <Row label="من" value={formatDateAr(course.start_date)} />}
            {course.end_date && <Row label="إلى" value={formatDateAr(course.end_date)} />}
            {slot && <Row label="التوقيت" value={slot} />}
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
              بعد تحويل المبلغ، الرجاء إرسال صورة الإيصال عبر واتساب. سيتم إرفاق تفاصيل الدورة وبياناتك تلقائيًا، وسيقوم مدير المنصة بتأكيد حجزك بعد التحقق.
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
