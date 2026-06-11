import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { safeUrl } from "@/lib/safe-url";
import { formatOmr, waLink } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw new Error("unauth");
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) {
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPage,
});

type Course = {
  id: string;
  title: string;
  description: string;
  audience: "teachers" | "general";
  session_type: "private" | "group";
  price: number;
  schedule_slots: string[] | unknown;
  meeting_link: string | null;
};

type RegRow = {
  id: string;
  user_id: string;
  payment_link: string | null;
  slot: string | null;
  created_at: string;
  courses: { title: string; session_type: string } | null;
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null;
};

const AUDIENCE_LABEL: Record<string, string> = { teachers: "تدريب معلمين", general: "إنجليزية عامة" };
const SESSION_LABEL: Record<string, string> = { private: "خاصة", group: "جماعية" };

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const courses = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const ids = rows.map((r) => r.id);
      const meetings = new Map<string, string | null>();
      if (ids.length) {
        const { data: m } = await supabase.from("course_meetings").select("course_id, meeting_link").in("course_id", ids);
        (m ?? []).forEach((row) => meetings.set(row.course_id, row.meeting_link));
      }
      return rows.map((r) => ({ ...r, meeting_link: meetings.get(r.id) ?? null })) as Course[];
    },
  });

  const regs = useQuery({
    queryKey: ["admin-regs"],
    queryFn: async () => {
      // Join via two queries because profile RLS only allows self read; admins bypass via service? No.
      // Profiles RLS allows self read only. We'll fetch registrations, then look up profiles via service is not available.
      // Workaround: add admin profile read policy — but for simplicity, we'll fetch what we can via two-step using user_roles admin status.
      const { data, error } = await supabase
        .from("registrations")
        .select("id, user_id, payment_link, slot, created_at, courses(title, session_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = Array.from(new Set((data ?? []).map((r) => r.user_id)));
      let profilesById = new Map<string, { full_name: string | null; email: string | null; phone: string | null }>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, email, phone").in("id", userIds);
        profilesById = new Map((profs ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email, phone: p.phone }]));
      }
      return (data ?? []).map((r) => ({
        ...r,
        profiles: profilesById.get(r.user_id) ?? null,
      })) as unknown as RegRow[];
    },
  });

  const totalStudents = useMemo(() => {
    const s = new Set(regs.data?.map((r) => r.user_id) ?? []);
    return s.size;
  }, [regs.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return regs.data ?? [];
    return (regs.data ?? []).filter((r) =>
      (r.profiles?.full_name ?? "").toLowerCase().includes(q) ||
      (r.profiles?.email ?? "").toLowerCase().includes(q) ||
      (r.courses?.title ?? "").toLowerCase().includes(q),
    );
  }, [regs.data, search]);

  if (loading) return <div className="p-10 text-center text-sm text-brand-navy/50">…</div>;
  if (!isAdmin) return (
    <div className="min-h-screen bg-brand-cream">
      <SiteHeader />
      <div className="p-10 text-center text-sm text-brand-navy/60">هذه الصفحة للمشرفين فقط.</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-cream text-brand-navy">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-10">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="font-serif text-3xl">لوحة الإدارة</h1>
            <p className="text-sm text-brand-navy/50">إدارة الدورات والطلاب والمدفوعات</p>
          </div>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-brand-navy text-white p-5 rounded-xl space-y-1">
            <span className="text-[10px] uppercase tracking-widest opacity-70">إجمالي الطلاب المسجلين</span>
            <p className="text-4xl font-serif">{totalStudents}</p>
          </div>
          <div className="bg-brand-sage p-5 rounded-xl border border-brand-navy/5 space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-brand-navy/60">الدورات النشطة</span>
            <p className="text-4xl font-serif">{courses.data?.length ?? 0}</p>
          </div>
        </section>

        {/* Courses CRUD */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h2 className="font-serif text-2xl">الدورات</h2>
            <CourseDialog onSaved={() => qc.invalidateQueries({ queryKey: ["admin-courses"] })} />
          </div>
          <div className="space-y-3">
            {(courses.data ?? []).map((c) => (
              <div key={c.id} className="bg-white border border-brand-navy/5 p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-brand-sage text-brand-navy text-[9px] font-bold px-2 py-0.5 rounded-full">
                      {AUDIENCE_LABEL[c.audience]}
                    </span>
                    <span className="text-[10px] text-brand-navy/50">{SESSION_LABEL[c.session_type]}</span>
                    <span className="text-brand-gold text-xs font-medium">{Number(c.price).toFixed(2)} $</span>
                  </div>
                  <h3 className="font-medium">{c.title}</h3>
                  <p className="text-xs text-brand-navy/50 line-clamp-1">{c.description}</p>
                </div>
                <div className="flex gap-2">
                  <CourseDialog course={c} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-courses"] })} />
                  <DeleteCourseButton id={c.id} onDeleted={() => qc.invalidateQueries({ queryKey: ["admin-courses"] })} />
                </div>
              </div>
            ))}
            {courses.data?.length === 0 && (
              <p className="text-xs text-brand-navy/40 text-center py-6">لا توجد دورات بعد. أضِف أول دورة.</p>
            )}
          </div>
        </section>

        {/* Registrations */}
        <section className="space-y-4">
          <div className="flex justify-between items-end gap-3">
            <h2 className="font-serif text-2xl">التسجيلات</h2>
            <Input
              placeholder="بحث بالاسم أو البريد أو الدورة"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="bg-white border border-brand-navy/5 rounded-xl divide-y divide-brand-navy/5">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-xs text-brand-navy/40">لا توجد تسجيلات.</p>
            ) : filtered.map((r) => (
              <RegistrationRow key={r.id} reg={r} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-regs"] })} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function RegistrationRow({ reg, onSaved }: { reg: RegRow; onSaved: () => void }) {
  const [link, setLink] = useState(reg.payment_link ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    const cleaned = link.trim();
    if (cleaned && !safeUrl(cleaned)) { toast.error("الرابط يجب أن يبدأ بـ http(s)"); return; }
    setBusy(true);
    const { error } = await supabase.from("registrations").update({ payment_link: cleaned || null }).eq("id", reg.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ الرابط");
    onSaved();
  }

  function sendEmail() {
    if (!link) { toast.error("أضِف رابط الدفع أولاً"); return; }
    const subject = encodeURIComponent(`رابط الدفع — ${reg.courses?.title ?? "دورتك"}`);
    const body = encodeURIComponent(`أهلاً ${reg.profiles?.full_name ?? ""}\n\nيرجى إكمال الدفع عبر الرابط التالي:\n${link}\n\nشكرًا.`);
    window.location.href = `mailto:${reg.profiles?.email ?? ""}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="p-4 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{reg.profiles?.full_name || "—"}</p>
        <p className="text-[11px] text-brand-navy/50" dir="ltr">{reg.profiles?.email ?? ""}</p>
        <p className="text-[11px] text-brand-navy/60 mt-1">
          {reg.courses?.title ?? "دورة"} · {SESSION_LABEL[reg.courses?.session_type ?? ""] ?? ""}
          {reg.slot ? ` · ${reg.slot}` : ""}
        </p>
      </div>
      <div className="flex gap-2 items-center">
        <Input
          placeholder="رابط الدفع"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-56 text-xs"
          dir="ltr"
        />
        <Button size="sm" variant="outline" onClick={save} disabled={busy}>حفظ</Button>
        <Button size="sm" onClick={sendEmail} className="bg-brand-gold text-white hover:bg-brand-gold/90">إرسال</Button>
      </div>
    </div>
  );
}

function CourseDialog({ course, onSaved }: { course?: Course; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [audience, setAudience] = useState<"teachers" | "general">(course?.audience ?? "general");
  const [sessionType, setSessionType] = useState<"private" | "group">(course?.session_type ?? "group");
  const [price, setPrice] = useState<string>(course?.price ? String(course.price) : "0");
  const [slotsText, setSlotsText] = useState(
    Array.isArray(course?.schedule_slots) ? (course!.schedule_slots as string[]).join("\n") : "",
  );
  const [meetingLink, setMeetingLink] = useState(course?.meeting_link ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open && !course) {
      setTitle(""); setDescription(""); setAudience("general"); setSessionType("group");
      setPrice("0"); setSlotsText(""); setMeetingLink("");
    }
  }, [open, course]);

  async function save() {
    if (!title.trim()) { toast.error("العنوان مطلوب"); return; }
    const link = meetingLink.trim() || null;
    if (link && !safeUrl(link)) { toast.error("رابط الاجتماع يجب أن يبدأ بـ https://"); return; }
    setBusy(true);
    const slots = slotsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      audience, session_type: sessionType,
      price: Number(price) || 0,
      schedule_slots: slots,
    };
    let courseId = course?.id;
    let error;
    if (course) {
      ({ error } = await supabase.from("courses").update(payload).eq("id", course.id));
    } else {
      const ins = await supabase.from("courses").insert(payload).select("id").single();
      error = ins.error;
      courseId = ins.data?.id;
    }
    if (!error && courseId) {
      const { error: mErr } = await supabase
        .from("course_meetings")
        .upsert({ course_id: courseId, meeting_link: link }, { onConflict: "course_id" });
      error = mErr ?? error;
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(course ? "تم التحديث" : "تمت الإضافة");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {course ? (
          <Button size="sm" variant="outline">تعديل</Button>
        ) : (
          <button className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold border-b border-brand-gold/30 pb-0.5">
            + دورة جديدة
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{course ? "تعديل الدورة" : "دورة جديدة"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>العنوان</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>الفئة</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as "teachers" | "general")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">إنجليزية عامة</SelectItem>
                  <SelectItem value="teachers">تدريب معلمين</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نوع الجلسة</Label>
              <Select value={sessionType} onValueChange={(v) => setSessionType(v as "private" | "group")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">جماعية</SelectItem>
                  <SelectItem value="private">خاصة (فردية)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>السعر (USD)</Label>
            <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label>المواعيد المتاحة (موعد في كل سطر)</Label>
            <Textarea
              value={slotsText}
              onChange={(e) => setSlotsText(e.target.value)}
              rows={4}
              placeholder={"السبت 6 م\nالاثنين 8 م"}
            />
          </div>
          <div className="space-y-2">
            <Label>رابط الاجتماع (Zoom / Meet / Teams)</Label>
            <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} dir="ltr" placeholder="https://" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={save} disabled={busy} className="bg-brand-navy text-white hover:bg-brand-navy/90">حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCourseButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  async function del() {
    setBusy(true);
    const { error } = await supabase.from("courses").delete().eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    onDeleted();
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">حذف</Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم حذف الدورة وجميع التسجيلات المرتبطة بها نهائيًا. هل أنت متأكد؟
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={del} disabled={busy} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
