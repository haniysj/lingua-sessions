import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { safeUrl } from "@/lib/safe-url";
import { formatOmr, waLink, weeksBetween, totalHours, formatDateAr, formatDateDMY, parseDMYtoISO } from "@/lib/format";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DateField } from "@/components/DateField";
import { useServerFn } from "@tanstack/react-start";
import { createTeacher, updateTeacher, deleteTeacher } from "@/lib/teachers.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw new Error("unauth");
    const { data } = await supabase
      .from("user_roles").select("role").eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
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
  hourly_rate: number;
  hours_per_week: number;
  start_date: string | null;
  end_date: string | null;
  schedule_slots: string[] | unknown;
  meeting_link: string | null;
  seats_total: number;
  teacher_id: string | null;
  teacher_name?: string | null;
};

type Teacher = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type RegRow = {
  id: string;
  user_id: string | null;
  payment_link: string | null;
  slot: string | null;
  status: string;
  created_at: string;
  course_id: string;
  guest_name: string | null;
  guest_civil_id: string | null;
  guest_phone: string | null;
  guest_residence: string | null;
  courses: { title: string; session_type: string; seats_total: number } | null;
  profiles: { full_name: string | null; email: string | null; phone: string | null; level: string | null; level_notes: string | null } | null;
};

const AUDIENCE_LABEL: Record<string, string> = { teachers: "تدريب معلمين", general: "إنجليزية عامة" };
const SESSION_LABEL: Record<string, string> = { private: "خاصة", group: "جماعية" };
const LEVELS = ["A1","A2","B1","B2","C1","C2"];

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  if (loading) return <div className="p-10 text-center text-sm text-brand-navy/50">…</div>;
  if (!isAdmin) return (
    <div className="min-h-screen"><SiteHeader />
      <div className="p-10 text-center text-sm text-brand-navy/60">هذه الصفحة للمشرفين فقط.</div>
    </div>
  );

  return (
    <div className="min-h-screen text-brand-navy">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="font-serif text-3xl">لوحة الإدارة</h1>
          <p className="text-sm text-brand-navy/50">إدارة المنصة والدورات والطلاب</p>
        </header>

        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="bg-brand-sage/50">
            <TabsTrigger value="courses">الدورات</TabsTrigger>
            <TabsTrigger value="teachers">المعلمون</TabsTrigger>
            <TabsTrigger value="regs">التسجيلات والطلاب</TabsTrigger>
            <TabsTrigger value="quizzes">الاختبارات</TabsTrigger>
            <TabsTrigger value="settings">إعدادات المنصة</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="mt-6">
            <CoursesSection qc={qc} />
          </TabsContent>
          <TabsContent value="teachers" className="mt-6">
            <TeachersSection />
          </TabsContent>
          <TabsContent value="regs" className="mt-6">
            <RegistrationsSection qc={qc} />
          </TabsContent>
          <TabsContent value="quizzes" className="mt-6">
            <QuizzesSection />
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <SettingsSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* -------- Settings -------- */
function SettingsSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["site-settings-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", true).maybeSingle();
      return data;
    },
  });
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [bankInfo, setBankInfo] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.site_name ?? "");
      setLogo(data.logo_url ?? "");
      setBankInfo(data.bank_info ?? "");
      setWhatsapp(data.whatsapp_number ?? "");
    }
  }, [data]);

  async function save() {
    if (!name.trim()) { toast.error("اسم المنصة مطلوب"); return; }
    setBusy(true);
    const { error } = await supabase.from("site_settings")
      .upsert({
        id: true,
        site_name: name.trim(),
        logo_url: logo || null,
        bank_info: bankInfo.trim() || null,
        whatsapp_number: whatsapp.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    qc.invalidateQueries({ queryKey: ["site-settings-admin"] });
  }

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("الرجاء اختيار ملف صورة"); return; }
    if (file.size > 300 * 1024) { toast.error("حجم الشعار يجب ألا يتجاوز 300 كيلوبايت"); return; }
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result || ""));
    reader.onerror = () => toast.error("تعذّر قراءة الملف");
    reader.readAsDataURL(file);
  }

  if (isLoading) return <p className="text-sm text-brand-navy/50">…</p>;
  return (
    <div className="bg-white border border-brand-navy/5 rounded-xl p-6 space-y-4 max-w-xl">
      <h2 className="font-serif text-xl">إعدادات المنصة</h2>
      <div className="space-y-2">
        <Label>اسم المنصة</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label>شعار المنصة</Label>
        <div className="flex items-center gap-3">
          {logo && (
            <img src={logo} alt="معاينة الشعار" className="size-16 rounded-md object-cover bg-brand-sage/40 border border-brand-navy/10" />
          )}
          <div className="flex flex-col gap-2">
            <Input type="file" accept="image/*" onChange={onPickLogo} className="text-xs" />
            {logo && (
              <button type="button" onClick={() => setLogo("")} className="text-[11px] text-brand-navy/50 hover:text-brand-navy text-start">إزالة الشعار</button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-brand-navy/40">PNG / JPG / SVG · بحد أقصى ٣٠٠ كيلوبايت</p>
      </div>
      <div className="space-y-2">
        <Label>بيانات الحساب البنكي</Label>
        <Textarea value={bankInfo} onChange={(e) => setBankInfo(e.target.value)} rows={4} maxLength={1000} placeholder="اسم البنك&#10;اسم صاحب الحساب&#10;رقم الحساب / IBAN" />
        <p className="text-[11px] text-brand-navy/40">تظهر للمنتسب في صفحة الدفع.</p>
      </div>
      <div className="space-y-2">
        <Label>رقم واتساب المنصة (لاستلام الإيصالات)</Label>
        <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} dir="ltr" placeholder="+96812345678" maxLength={20} />
      </div>
      <Button onClick={save} disabled={busy} className="bg-brand-navy text-white hover:bg-brand-navy/90">
        {busy ? "…" : "حفظ"}
      </Button>
    </div>
  );
}

/* -------- Courses -------- */
function CoursesSection({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
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
      const tIds = Array.from(new Set(rows.map((r) => r.teacher_id).filter((v): v is string => !!v)));
      const teachers = new Map<string, string | null>();
      if (tIds.length) {
        const { data: ts } = await supabase.rpc("get_teachers_public", { _ids: tIds });
        (ts ?? []).forEach((t) => teachers.set(t.id, t.full_name));
      }
      return rows.map((r) => ({
        ...r,
        meeting_link: meetings.get(r.id) ?? null,
        teacher_name: r.teacher_id ? teachers.get(r.teacher_id) ?? null : null,
      })) as Course[];
    },
  });

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-end">
        <h2 className="font-serif text-2xl">الدورات</h2>
        <CourseDialog onSaved={() => qc.invalidateQueries({ queryKey: ["admin-courses"] })} />
      </div>
      <div className="space-y-3">
        {(courses.data ?? []).map((c) => {
          const weeks = weeksBetween(c.start_date, c.end_date);
          const hours = totalHours(weeks, c.hours_per_week);
          const total = hours * Number(c.hourly_rate ?? 0);
          return (
            <div key={c.id} className="bg-white border border-brand-navy/5 p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="bg-brand-sage text-brand-navy text-[9px] font-bold px-2 py-0.5 rounded-full">{AUDIENCE_LABEL[c.audience]}</span>
                  <span className="text-[10px] text-brand-navy/50">{SESSION_LABEL[c.session_type]}</span>
                  <span className="text-brand-gold text-xs font-bold">{formatOmr(total || c.price)}</span>
                  {Number(c.seats_total) > 0 && (
                    <span className="text-[10px] bg-brand-blush text-brand-navy/70 px-2 py-0.5 rounded-full">🎟️ {c.seats_total} مقعد</span>
                  )}
                  {c.teacher_name && (
                    <span className="text-[10px] bg-brand-navy/5 text-brand-navy/70 px-2 py-0.5 rounded-full">👤 {c.teacher_name}</span>
                  )}
                </div>
                <h3 className="font-medium">{c.title}</h3>
                <p className="text-[11px] text-brand-navy/55">
                  {c.start_date && c.end_date ? (
                    <>
                      <span className="text-brand-navy/70">من</span> <bdi>{formatDateAr(c.start_date)}</bdi> <span className="text-brand-gold font-bold mx-1">إلى</span> <bdi>{formatDateAr(c.end_date)}</bdi> · {weeks} أسبوع · {hours} ساعة
                    </>
                  ) : "بدون فترة محدّدة"}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <ManageMaterials courseId={c.id} />
                <CourseDialog course={c} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-courses"] })} />
                <DeleteCourseButton id={c.id} onDeleted={() => qc.invalidateQueries({ queryKey: ["admin-courses"] })} />
              </div>
            </div>
          );
        })}
        {courses.data?.length === 0 && (
          <p className="text-xs text-brand-navy/40 text-center py-6">لا توجد دورات بعد.</p>
        )}
      </div>
    </section>
  );
}

/* -------- Teachers -------- */
function useTeachers() {
  return useQuery({
    queryKey: ["admin-teachers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_teachers");
      if (error) throw error;
      return (data ?? []) as Teacher[];
    },
  });
}

function TeachersSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useTeachers();
  return (
    <section className="space-y-4">
      <div className="flex justify-between items-end">
        <h2 className="font-serif text-2xl">المعلمون</h2>
        <TeacherDialog onSaved={() => qc.invalidateQueries({ queryKey: ["admin-teachers"] })} />
      </div>
      {isLoading ? (
        <p className="text-xs text-brand-navy/40">…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-xs text-brand-navy/40 text-center py-6 bg-white rounded-xl border border-brand-navy/5">لا يوجد معلمون مسجلون بعد.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data!.map((t) => (
            <div key={t.id} className="bg-white border border-brand-navy/5 p-4 rounded-xl flex gap-3">
              {t.avatar_url ? (
                <img src={t.avatar_url} alt={t.full_name ?? ""} className="size-16 rounded-full object-cover bg-brand-sage/40" />
              ) : (
                <div className="size-16 rounded-full bg-brand-sage/60 flex items-center justify-center text-brand-navy/60 font-serif">👤</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{t.full_name || "—"}</p>
                {t.email && <p className="text-[10px] text-brand-navy/50 truncate" dir="ltr">{t.email}</p>}
                {t.phone && <p className="text-[10px] text-brand-navy/50" dir="ltr">{t.phone}</p>}
                {t.bio && <p className="text-[11px] text-brand-navy/60 mt-1 line-clamp-2">{t.bio}</p>}
                <div className="flex gap-2 mt-2">
                  <TeacherDialog teacher={t} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-teachers"] })} />
                  <DeleteTeacherButton id={t.id} onDeleted={() => {
                    qc.invalidateQueries({ queryKey: ["admin-teachers"] });
                    qc.invalidateQueries({ queryKey: ["admin-courses"] });
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TeacherDialog({ teacher, onSaved }: { teacher?: Teacher; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(teacher?.full_name ?? "");
  const [email, setEmail] = useState(teacher?.email ?? "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(teacher?.phone ?? "");
  const [bio, setBio] = useState(teacher?.bio ?? "");
  const [avatar, setAvatar] = useState(teacher?.avatar_url ?? "");
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createTeacher);
  const update = useServerFn(updateTeacher);

  useEffect(() => {
    if (!open && !teacher) {
      setFullName(""); setEmail(""); setPassword(""); setPhone(""); setBio(""); setAvatar("");
    }
  }, [open, teacher]);

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("صورة فقط"); return; }
    if (file.size > 500 * 1024) { toast.error("حجم الصورة يجب ألا يتجاوز 500 كيلوبايت"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!fullName.trim()) { toast.error("الاسم مطلوب"); return; }
    setBusy(true);
    try {
      if (teacher) {
        await update({ data: { id: teacher.id, full_name: fullName.trim(), phone: phone.trim(), bio: bio.trim(), avatar_url: avatar } });
        toast.success("تم التحديث");
      } else {
        if (!email.trim() || !password.trim()) { toast.error("البريد وكلمة المرور مطلوبة"); setBusy(false); return; }
        if (password.length < 8) { toast.error("كلمة المرور: ٨ أحرف على الأقل"); setBusy(false); return; }
        await create({ data: { email: email.trim(), password, full_name: fullName.trim(), phone: phone.trim(), bio: bio.trim(), avatar_url: avatar } });
        toast.success("تمت إضافة المعلم");
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {teacher
          ? <Button size="sm" variant="outline" className="h-7 text-[11px]">تعديل</Button>
          : <button className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold border-b border-brand-gold/30 pb-0.5">+ معلم جديد</button>}
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md max-h-[85vh] overflow-auto">
        <DialogHeader><DialogTitle>{teacher ? "تعديل معلم" : "إضافة معلم"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {avatar ? (
              <img src={avatar} alt="" className="size-16 rounded-full object-cover bg-brand-sage/40" />
            ) : (
              <div className="size-16 rounded-full bg-brand-sage/60 flex items-center justify-center text-brand-navy/60">👤</div>
            )}
            <div className="flex flex-col gap-1">
              <Input type="file" accept="image/*" onChange={onPickAvatar} className="text-xs" />
              {avatar && <button type="button" onClick={() => setAvatar("")} className="text-[11px] text-brand-navy/50 text-start">إزالة الصورة</button>}
            </div>
          </div>
          <div className="space-y-1"><Label className="text-xs">الاسم الكامل</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={150} /></div>
          {!teacher && (
            <>
              <div className="space-y-1"><Label className="text-xs">البريد الإلكتروني</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" dir="ltr" maxLength={255} /></div>
              <div className="space-y-1"><Label className="text-xs">كلمة المرور المؤقتة</Label><Input value={password} onChange={(e) => setPassword(e.target.value)} type="text" dir="ltr" maxLength={72} /></div>
            </>
          )}
          <div className="space-y-1"><Label className="text-xs">رقم الهاتف</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" maxLength={20} /></div>
          <div className="space-y-1"><Label className="text-xs">السيرة الذاتية</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={2000} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={save} disabled={busy} className="bg-brand-navy text-white hover:bg-brand-navy/90">{busy ? "…" : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTeacherButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const del = useServerFn(deleteTeacher);
  async function go() {
    setBusy(true);
    try {
      await del({ data: { id } });
      toast.success("تم الحذف");
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-[11px] text-red-600 border-red-200 hover:bg-red-50">حذف</Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>حذف المعلم؟</AlertDialogTitle>
          <AlertDialogDescription>سيتم حذف حساب المعلم نهائيًا، وستُلغى ربطه بأي دورات.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={go} disabled={busy} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* -------- Materials -------- */
function ManageMaterials({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["materials", courseId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("course_materials").select("*").eq("course_id", courseId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const [busy, setBusy] = useState(false);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const path = `${courseId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("materials").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("course_materials").insert({ course_id: courseId, title: file.name, storage_path: path });
      if (error) throw error;
      toast.success("تم الرفع");
      qc.invalidateQueries({ queryKey: ["materials", courseId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الرفع");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function del(id: string, path: string) {
    await supabase.storage.from("materials").remove([path]);
    await supabase.from("course_materials").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["materials", courseId] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">📎 المواد</Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>المواد التعليمية</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">رفع ملف جديد</Label>
            <Input type="file" onChange={upload} disabled={busy} />
          </div>
          <ul className="divide-y divide-brand-navy/5 max-h-64 overflow-auto">
            {(data ?? []).map((m) => (
              <li key={m.id} className="flex justify-between py-2 text-sm">
                <span className="truncate">{m.title}</span>
                <button onClick={() => del(m.id, m.storage_path)} className="text-red-600 text-xs">حذف</button>
              </li>
            ))}
            {(data ?? []).length === 0 && <li className="text-xs text-brand-navy/40 py-3">لا توجد ملفات.</li>}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------- Registrations -------- */
function RegistrationsSection({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [search, setSearch] = useState("");
  const regs = useQuery({
    queryKey: ["admin-regs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, user_id, payment_link, slot, status, created_at, course_id, guest_name, guest_civil_id, guest_phone, guest_residence, courses(title, session_type, seats_total)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = Array.from(new Set((data ?? []).map((r) => r.user_id).filter((id): id is string => !!id)));
      let profilesById = new Map<string, RegRow["profiles"]>();
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, email, phone, level, level_notes").in("id", userIds);
        profilesById = new Map((profs ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email, phone: p.phone, level: p.level, level_notes: p.level_notes }]));
      }
      return (data ?? []).map((r) => ({ ...r, profiles: r.user_id ? (profilesById.get(r.user_id) ?? null) : null })) as unknown as RegRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return regs.data ?? [];
    return (regs.data ?? []).filter((r) =>
      ((r.profiles?.full_name ?? r.guest_name ?? "")).toLowerCase().includes(q) ||
      ((r.profiles?.phone ?? r.guest_phone ?? "")).toLowerCase().includes(q) ||
      ((r.profiles?.email ?? "")).toLowerCase().includes(q) ||
      ((r.guest_civil_id ?? "")).toLowerCase().includes(q) ||
      (r.courses?.title ?? "").toLowerCase().includes(q),
    );
  }, [regs.data, search]);

  // Group registrations by course
  const grouped = useMemo(() => {
    const map = new Map<string, { title: string; seatsTotal: number; rows: RegRow[] }>();
    filtered.forEach((r) => {
      const key = r.course_id ?? "—";
      if (!map.has(key)) {
        map.set(key, {
          title: r.courses?.title ?? "بدون دورة",
          seatsTotal: Number(r.courses?.seats_total ?? 0),
          rows: [],
        });
      }
      map.get(key)!.rows.push(r);
    });
    return Array.from(map.entries()).map(([course_id, v]) => ({ course_id, ...v }));
  }, [filtered]);

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-end gap-3">
        <h2 className="font-serif text-2xl">المنتسبون</h2>
        <Input placeholder="بحث بالاسم أو الهاتف أو الرقم المدني" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>
      {grouped.length === 0 ? (
        <p className="p-6 text-center text-xs text-brand-navy/40 bg-white rounded-xl border border-brand-navy/5">لا توجد تسجيلات.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => {
            const confirmedCount = g.rows.filter((r) => r.status === "confirmed").length;
            const activeCount = g.rows.filter((r) => r.status !== "cancelled").length;
            const remaining = g.seatsTotal > 0 ? Math.max(0, g.seatsTotal - activeCount) : null;
            return (
              <div key={g.course_id} className="bg-white border border-brand-navy/5 rounded-xl overflow-hidden">
                <div className="bg-brand-sage/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-brand-navy/5">
                  <h3 className="font-serif text-base">{g.title}</h3>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="bg-white text-brand-navy/70 px-2 py-1 rounded-full border border-brand-navy/10">المسجلون: {g.rows.length}</span>
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">مؤكدون: {confirmedCount}</span>
                    {g.seatsTotal > 0 && (
                      <span className={`px-2 py-1 rounded-full ${remaining === 0 ? "bg-red-100 text-red-700" : "bg-brand-blush text-brand-navy/70"}`}>
                        المتبقي: {remaining} / {g.seatsTotal}
                      </span>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-brand-sage/20 text-brand-navy/70">
                      <tr>
                        <th className="text-start p-3">الاسم</th>
                        <th className="text-start p-3">الرقم المدني</th>
                        <th className="text-start p-3">الهاتف</th>
                        <th className="text-start p-3">مكان السكن</th>
                        <th className="text-start p-3">الموعد</th>
                        <th className="text-start p-3">الحالة</th>
                        <th className="text-start p-3">التاريخ</th>
                        <th className="text-start p-3">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-navy/5">
                      {g.rows.map((r) => {
                        const name = r.profiles?.full_name ?? r.guest_name ?? "—";
                        const phone = r.profiles?.phone ?? r.guest_phone ?? "—";
                        const email = r.profiles?.email ?? "";
                        return (
                          <tr key={r.id} className="hover:bg-brand-sage/20">
                            <td className="p-3">
                              <p className="font-medium">{name}</p>
                              {email && <p className="text-[10px] text-brand-navy/50" dir="ltr">{email}</p>}
                              {r.user_id === null && <span className="text-[9px] bg-brand-blush text-brand-navy/70 px-1.5 py-0.5 rounded-full">زائر</span>}
                            </td>
                            <td className="p-3" dir="ltr">{r.guest_civil_id ?? "—"}</td>
                            <td className="p-3" dir="ltr">{phone}</td>
                            <td className="p-3">{r.guest_residence ?? "—"}</td>
                            <td className="p-3">{r.slot ?? "—"}</td>
                            <td className="p-3"><StatusBadge status={r.status} /></td>
                            <td className="p-3 text-brand-navy/50">{formatDateAr(r.created_at)}</td>
                            <td className="p-3">
                              <RegistrationActions reg={r} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-regs"] })} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "بانتظار التأكيد", cls: "bg-amber-100 text-amber-800" },
    confirmed: { label: "مؤكد", cls: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "ملغي", cls: "bg-red-100 text-red-700" },
  };
  const v = map[status] ?? map.pending;
  return <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${v.cls}`}>{v.label}</span>;
}

function RegistrationActions({ reg, onSaved }: { reg: RegRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState(reg.payment_link ?? "");
  const [level, setLevel] = useState(reg.profiles?.level ?? "");
  const [levelNotes, setLevelNotes] = useState(reg.profiles?.level_notes ?? "");
  const [busy, setBusy] = useState(false);

  async function saveLink() {
    const cleaned = link.trim();
    if (cleaned && !safeUrl(cleaned)) { toast.error("الرابط غير صالح"); return; }
    setBusy(true);
    const { error } = await supabase.from("registrations").update({ payment_link: cleaned || null }).eq("id", reg.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ"); onSaved();
  }

  async function saveLevel() {
    if (!reg.user_id) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ level: level || null, level_notes: levelNotes || null }).eq("id", reg.user_id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم التحديث"); onSaved();
  }

  function sendWhatsApp() {
    const phone = reg.profiles?.phone ?? reg.guest_phone;
    const msg = `أهلاً ${reg.profiles?.full_name ?? reg.guest_name ?? ""} 👋\nبخصوص حجزك في *${reg.courses?.title ?? "دورتك"}*`;
    const url = waLink(phone, msg);
    if (!url) { toast.error("لا يوجد هاتف"); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function setStatus(status: "confirmed" | "pending" | "cancelled") {
    setBusy(true);
    const { error } = await supabase.from("registrations").update({ status }).eq("id", reg.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "confirmed" ? "تم تأكيد الحجز" : status === "cancelled" ? "تم إلغاء الحجز" : "تم");
    onSaved();
  }

  async function del() {
    if (!confirm("حذف التسجيل؟")) return;
    const { error } = await supabase.from("registrations").delete().eq("id", reg.id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف"); onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7 text-[10px]">إدارة</Button></DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>{reg.profiles?.full_name ?? reg.guest_name ?? "—"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="bg-brand-blush/40 p-3 rounded-lg flex items-center justify-between">
            <div className="text-xs">
              <p className="text-brand-navy/60">حالة الحجز</p>
              <StatusBadge status={reg.status} />
            </div>
            <div className="flex gap-2">
              {reg.status !== "confirmed" && (
                <Button size="sm" onClick={() => setStatus("confirmed")} disabled={busy} className="bg-emerald-600 text-white hover:bg-emerald-700 h-8 text-[11px]">✓ تأكيد</Button>
              )}
              {reg.status === "confirmed" && (
                <Button size="sm" variant="outline" onClick={() => setStatus("pending")} disabled={busy} className="h-8 text-[11px]">إعادة للانتظار</Button>
              )}
              {reg.status !== "cancelled" && (
                <Button size="sm" variant="outline" onClick={() => setStatus("cancelled")} disabled={busy} className="h-8 text-[11px] text-red-600">إلغاء</Button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">رابط الدفع (اختياري)</Label>
            <div className="flex gap-2">
              <Input value={link} onChange={(e) => setLink(e.target.value)} dir="ltr" className="text-xs" />
              <Button size="sm" variant="outline" onClick={saveLink} disabled={busy}>حفظ</Button>
            </div>
          </div>
          {reg.user_id && (
            <div className="bg-brand-sage/30 p-3 rounded-lg space-y-2">
              <Label className="text-xs">مستوى الطالب</Label>
              <Select value={level || "none"} onValueChange={(v) => setLevel(v === "none" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={levelNotes} onChange={(e) => setLevelNotes(e.target.value)} placeholder="ملاحظات" className="h-8 text-xs" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={saveLevel} disabled={busy}>تحديث المستوى</Button>
                <HomeworkReview userId={reg.user_id} courseTitle={reg.courses?.title ?? ""} />
              </div>
            </div>
          )}
          <div className="flex justify-between pt-2">
            <Button size="sm" onClick={sendWhatsApp} className="bg-emerald-600 text-white hover:bg-emerald-700">💬 واتساب</Button>
            <Button size="sm" variant="outline" className="text-red-600" onClick={del}>حذف</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HomeworkReview({ userId, courseTitle }: { userId: string; courseTitle: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["hw-admin", userId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("homework_submissions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function openFile(path: string) {
    const { data } = await supabase.storage.from("homework").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function grade(id: string, feedback: string, gradeVal: string) {
    await supabase.from("homework_submissions").update({ feedback, grade: gradeVal }).eq("id", id);
    toast.success("تم التقييم");
    qc.invalidateQueries({ queryKey: ["hw-admin", userId] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">📝 الواجبات</Button></DialogTrigger>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader><DialogTitle>واجبات — {courseTitle}</DialogTitle></DialogHeader>
        <ul className="space-y-3 max-h-96 overflow-auto">
          {(data ?? []).map((h) => (
            <li key={h.id} className="border border-brand-navy/10 p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-xs">
                <button onClick={() => openFile(h.storage_path)} className="text-brand-gold underline">{h.title || "ملف"}</button>
                <span className="text-brand-navy/40">{new Date(h.created_at).toLocaleDateString("ar-u-nu-latn")}</span>
              </div>
              <GradeForm id={h.id} initFeedback={h.feedback ?? ""} initGrade={h.grade ?? ""} onSave={grade} />
            </li>
          ))}
          {(data ?? []).length === 0 && <li className="text-xs text-brand-navy/40">لا توجد واجبات.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function GradeForm({ id, initFeedback, initGrade, onSave }: { id: string; initFeedback: string; initGrade: string; onSave: (id: string, f: string, g: string) => void }) {
  const [f, setF] = useState(initFeedback);
  const [g, setG] = useState(initGrade);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={g} onChange={(e) => setG(e.target.value)} placeholder="الدرجة (مثل 8/10)" className="h-8 text-xs w-32" />
        <Input value={f} onChange={(e) => setF(e.target.value)} placeholder="ملاحظات" className="h-8 text-xs flex-1" />
        <Button size="sm" variant="outline" onClick={() => onSave(id, f, g)}>حفظ</Button>
      </div>
    </div>
  );
}

/* -------- Quizzes -------- */
function QuizzesSection() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-quizzes"],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*, quiz_questions(id)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function del(id: string) {
    await supabase.from("quizzes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-quizzes"] });
  }

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-end">
        <h2 className="font-serif text-2xl">الاختبارات</h2>
        <QuizDialog onSaved={() => qc.invalidateQueries({ queryKey: ["admin-quizzes"] })} />
      </div>
      <div className="space-y-2">
        {(data ?? []).map((q: { id: string; title: string; description: string; quiz_questions?: { id: string }[] }) => (
          <div key={q.id} className="bg-white border border-brand-navy/5 p-3 rounded-xl flex justify-between items-center">
            <div>
              <p className="font-medium text-sm">{q.title}</p>
              <p className="text-[11px] text-brand-navy/50">{q.quiz_questions?.length ?? 0} سؤال</p>
            </div>
            <div className="flex gap-2">
              <QuizDialog quiz={q} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-quizzes"] })} />
              <Button size="sm" variant="outline" className="text-red-600" onClick={() => del(q.id)}>حذف</Button>
            </div>
          </div>
        ))}
        {(data ?? []).length === 0 && <p className="text-xs text-brand-navy/40 text-center py-4">لا اختبارات.</p>}
      </div>
    </section>
  );
}

type QuizQuestion = { prompt: string; choices: string[]; correct_index: number };

function QuizDialog({ quiz, onSaved }: { quiz?: { id: string; title: string; description: string }; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(quiz?.title ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && quiz) {
      supabase.from("quiz_questions").select("*").eq("quiz_id", quiz.id).order("position").then(({ data }) => {
        setQuestions((data ?? []).map((q) => ({ prompt: q.prompt, choices: (q.choices as string[]) ?? [], correct_index: q.correct_index })));
      });
    } else if (open) {
      setQuestions([{ prompt: "", choices: ["", ""], correct_index: 0 }]);
    }
  }, [open, quiz]);

  function updateQ(i: number, patch: Partial<QuizQuestion>) {
    setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  }

  async function save() {
    if (!title.trim()) { toast.error("العنوان مطلوب"); return; }
    setBusy(true);
    try {
      let qid = quiz?.id;
      if (quiz) {
        await supabase.from("quizzes").update({ title, description }).eq("id", quiz.id);
        await supabase.from("quiz_questions").delete().eq("quiz_id", quiz.id);
      } else {
        const { data, error } = await supabase.from("quizzes").insert({ title, description }).select("id").single();
        if (error) throw error;
        qid = data.id;
      }
      if (qid && questions.length) {
        const rows = questions.filter((q) => q.prompt.trim()).map((q, i) => ({
          quiz_id: qid, position: i, prompt: q.prompt, choices: q.choices, correct_index: q.correct_index,
        }));
        if (rows.length) {
          const { error } = await supabase.from("quiz_questions").insert(rows);
          if (error) throw error;
        }
      }
      toast.success("تم الحفظ");
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {quiz ? <Button size="sm" variant="outline">تعديل</Button> :
          <button className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold border-b border-brand-gold/30 pb-0.5">+ اختبار جديد</button>}
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-xl max-h-[85vh] overflow-auto">
        <DialogHeader><DialogTitle>{quiz ? "تعديل اختبار" : "اختبار جديد"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>العنوان</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1"><Label>الوصف</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="border border-brand-navy/10 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">سؤال {i + 1}</Label>
                  <button onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))} className="text-red-600 text-xs">حذف</button>
                </div>
                <Input value={q.prompt} onChange={(e) => updateQ(i, { prompt: e.target.value })} placeholder="نص السؤال" />
                {q.choices.map((c, ci) => (
                  <div key={ci} className="flex gap-2 items-center">
                    <input type="radio" checked={q.correct_index === ci} onChange={() => updateQ(i, { correct_index: ci })} />
                    <Input value={c} onChange={(e) => updateQ(i, { choices: q.choices.map((x, xi) => xi === ci ? e.target.value : x) })} placeholder={`اختيار ${ci + 1}`} className="text-xs" />
                    {q.choices.length > 2 && (
                      <button onClick={() => updateQ(i, { choices: q.choices.filter((_, xi) => xi !== ci), correct_index: 0 })} className="text-red-600 text-xs">×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => updateQ(i, { choices: [...q.choices, ""] })} className="text-xs text-brand-gold">+ اختيار</button>
              </div>
            ))}
            <button onClick={() => setQuestions((qs) => [...qs, { prompt: "", choices: ["", ""], correct_index: 0 }])} className="text-xs text-brand-navy/70 border border-dashed border-brand-navy/20 w-full py-2 rounded">+ سؤال</button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={save} disabled={busy} className="bg-brand-navy text-white">حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------- Course form -------- */
function CourseDialog({ course, onSaved }: { course?: Course; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [audience, setAudience] = useState<"teachers" | "general">(course?.audience ?? "general");
  const [sessionType, setSessionType] = useState<"private" | "group">(course?.session_type ?? "group");
  const [hourlyRate, setHourlyRate] = useState<string>(String(course?.hourly_rate ?? "0"));
  const [hoursPerWeek, setHoursPerWeek] = useState<string>(String(course?.hours_per_week ?? "0"));
  const [startDate, setStartDate] = useState(course?.start_date ? formatDateDMY(course.start_date) : "");
  const [endDate, setEndDate] = useState(course?.end_date ? formatDateDMY(course.end_date) : "");
  const [slotsText, setSlotsText] = useState(Array.isArray(course?.schedule_slots) ? (course!.schedule_slots as string[]).join("\n") : "");
  const [meetingLink, setMeetingLink] = useState(course?.meeting_link ?? "");
  const [seatsTotal, setSeatsTotal] = useState<string>(String(course?.seats_total ?? "0"));
  const [teacherId, setTeacherId] = useState<string>(course?.teacher_id ?? "");
  const [busy, setBusy] = useState(false);
  const teachers = useTeachers();

  useEffect(() => {
    if (!open && !course) {
      setTitle(""); setDescription(""); setAudience("general"); setSessionType("group");
      setHourlyRate("0"); setHoursPerWeek("0"); setStartDate(""); setEndDate("");
      setSlotsText(""); setMeetingLink(""); setSeatsTotal("0"); setTeacherId("");
    }
  }, [open, course]);

  const startISO = parseDMYtoISO(startDate);
  const endISO = parseDMYtoISO(endDate);
  const weeks = weeksBetween(startISO, endISO);
  const hours = totalHours(weeks, Number(hoursPerWeek));
  const totalPrice = hours * Number(hourlyRate);

  async function save() {
    if (!title.trim()) { toast.error("العنوان مطلوب"); return; }
    const link = meetingLink.trim() || null;
    if (link && !safeUrl(link)) { toast.error("رابط الاجتماع غير صالح"); return; }
    setBusy(true);
    const slots = slotsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      audience, session_type: sessionType,
      hourly_rate: Number(hourlyRate) || 0,
      hours_per_week: Number(hoursPerWeek) || 0,
      start_date: startISO || null,
      end_date: endISO || null,
      price: totalPrice,
      schedule_slots: slots,
      seats_total: Math.max(0, Math.floor(Number(seatsTotal) || 0)),
      teacher_id: teacherId || null,
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
      const { error: mErr } = await supabase.from("course_meetings").upsert({ course_id: courseId, meeting_link: link }, { onConflict: "course_id" });
      error = mErr ?? error;
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(course ? "تم التحديث" : "تمت الإضافة");
    setOpen(false); onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {course ? <Button size="sm" variant="outline">تعديل</Button> :
          <button className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold border-b border-brand-gold/30 pb-0.5">+ دورة جديدة</button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto" dir="rtl">
        <DialogHeader><DialogTitle className="font-serif text-2xl">{course ? "تعديل الدورة" : "دورة جديدة"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>العنوان</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></div>
          <div className="space-y-2"><Label>الوصف</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>الفئة</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as "teachers" | "general")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">إنجليزية عامة</SelectItem>
                  <SelectItem value="teachers">تدريب معلمين</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>نوع الجلسة</Label>
              <Select value={sessionType} onValueChange={(v) => setSessionType(v as "private" | "group")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">جماعية</SelectItem>
                  <SelectItem value="private">خاصة (فردية)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>تاريخ البداية</Label><DateField value={startDate} onChange={setStartDate} /></div>
            <div className="space-y-2"><Label>تاريخ النهاية</Label><DateField value={endDate} onChange={setEndDate} minDate={parseDMYtoISO(startDate) || undefined} defaultMonth={parseDMYtoISO(startDate) || undefined} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>ساعات/أسبوع</Label><Input type="number" min="0" step="0.5" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} dir="ltr" /></div>
            <div className="space-y-2"><Label>سعر الساعة (ر.ع.)</Label><Input type="number" min="0" step="0.001" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} dir="ltr" /></div>
          </div>
          <div className="bg-brand-sage/40 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between"><span>عدد الأسابيع</span><span className="font-bold">{weeks}</span></div>
            <div className="flex justify-between"><span>إجمالي الساعات</span><span className="font-bold">{hours}</span></div>
            <div className="flex justify-between text-brand-navy"><span>الإجمالي</span><span className="font-serif text-base font-bold">{formatOmr(totalPrice)}</span></div>
          </div>
          <div className="space-y-2"><Label>المواعيد (موعد في كل سطر)</Label>
            <Textarea value={slotsText} onChange={(e) => setSlotsText(e.target.value)} rows={3} placeholder={"السبت 6 م\nالاثنين 8 م"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>عدد المقاعد الكلي</Label>
              <Input type="number" min="0" step="1" value={seatsTotal} onChange={(e) => setSeatsTotal(e.target.value)} dir="ltr" placeholder="0 = غير محدود" />
            </div>
            <div className="space-y-2"><Label>رابط الاجتماع</Label>
              <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} dir="ltr" placeholder="https://" />
            </div>
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
    toast.success("تم الحذف"); onDeleted();
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">حذف</Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
          <AlertDialogDescription>سيتم حذف الدورة وكل التسجيلات المرتبطة بها.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={del} disabled={busy} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
