import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { safeUrl } from "@/lib/safe-url";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDateAr } from "@/lib/format";
import { parseSlot } from "@/lib/slots";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, isTeacher, loading } = useAuth();

  if (loading) return <div className="p-10 text-center text-brand-navy/50">…</div>;
  if (!user) return null;

  return isTeacher ? <TeacherDashboard userId={user.id} /> : <StudentDashboard userId={user.id} />;
}

/* ==================== Teacher Dashboard ==================== */

function TeacherDashboard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["teacher-courses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, session_type, start_date, end_date, hours_per_week, schedule_slots")
        .eq("teacher_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((c) => c.id);
      const meetings = new Map<string, string | null>();
      if (ids.length) {
        const { data: m } = await supabase.from("course_meetings").select("course_id, meeting_link").in("course_id", ids);
        (m ?? []).forEach((r) => meetings.set(r.course_id, r.meeting_link));
      }
      return (data ?? []).map((c) => ({ ...c, meeting_link: meetings.get(c.id) ?? null }));
    },
  });

  const name = profile?.full_name?.trim() || "المعلم";

  return (
    <div className="min-h-screen text-brand-navy">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <header>
          <h1 className="font-serif text-3xl">أهلاً المعلم {name} 👋</h1>
          <p className="text-xs text-brand-navy/55 mt-1">هذه الدورات التي ستقوم بتدريسها. يمكنك إدارة رابط المحاضرة والمواد والاختبارات لكل دورة.</p>
        </header>

        {!courses || courses.length === 0 ? (
          <div className="border-2 border-dashed border-brand-navy/10 rounded-2xl p-10 text-center text-sm text-brand-navy/50">
            لم يتم إسناد أي دورة إليك بعد.
          </div>
        ) : (
          <div className="grid gap-4">
            {courses.map((c) => {
              const slots: string[] = Array.isArray(c.schedule_slots) ? (c.schedule_slots as string[]) : [];
              return (
                <article key={c.id} className="bg-white border border-brand-navy/5 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-serif text-xl">{c.title}</h3>
                      <p className="text-[11px] text-brand-navy/55">
                        {c.session_type === "private" ? "خاصة" : "جماعية"}
                        {c.start_date && ` · من ${formatDateAr(c.start_date)}`}
                        {c.end_date && ` إلى ${formatDateAr(c.end_date)}`}
                      </p>
                    </div>
                  </div>
                  {c.description && <p className="text-xs text-brand-navy/60 whitespace-pre-line">{c.description}</p>}

                  {slots.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {slots.map((s) => {
                        const p = parseSlot(s);
                        return (
                          <span key={s} className="text-[11px] px-2 py-1 rounded-full bg-brand-sage/50 text-brand-navy/75 border border-brand-navy/5">
                            {p.label}
                            {p.comingSoon && <span className="ms-1 text-brand-gold font-bold">· قريباً</span>}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-navy/5">
                    <MeetingLinkDialog courseId={c.id} current={c.meeting_link} onSaved={() => qc.invalidateQueries({ queryKey: ["teacher-courses", userId] })} />
                    <TeacherMaterials courseId={c.id} />
                    <TeacherQuizzes courseId={c.id} courseTitle={c.title} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function MeetingLinkDialog({ courseId, current, onSaved }: { courseId: string; current: string | null; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setLink(current ?? ""); }, [open, current]);

  async function save() {
    const cleaned = link.trim() || null;
    if (cleaned && !safeUrl(cleaned)) { toast.error("الرابط غير صالح"); return; }
    setBusy(true);
    const { error } = await supabase.from("course_meetings").upsert({ course_id: courseId, meeting_link: cleaned }, { onConflict: "course_id" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs">🎥 رابط المحاضرة {current ? "" : "(غير مضاف)"}</Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>رابط الاجتماع الأونلاين</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs">Zoom / Meet / Teams …</Label>
          <Input value={link} onChange={(e) => setLink(e.target.value)} dir="ltr" placeholder="https://" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={save} disabled={busy} className="bg-brand-navy text-white">حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeacherMaterials({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["t-materials", courseId],
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
      qc.invalidateQueries({ queryKey: ["t-materials", courseId] });
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
    qc.invalidateQueries({ queryKey: ["t-materials", courseId] });
  }
  async function openFile(path: string) {
    const { data } = await supabase.storage.from("materials").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="text-xs">📎 المواد</Button></DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>مواد الدورة</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">رفع ملف جديد</Label>
            <Input type="file" onChange={upload} disabled={busy} />
          </div>
          <ul className="divide-y divide-brand-navy/5 max-h-64 overflow-auto">
            {(data ?? []).map((m) => (
              <li key={m.id} className="flex justify-between py-2 text-sm gap-2">
                <button onClick={() => openFile(m.storage_path)} className="truncate text-brand-gold underline text-start">{m.title}</button>
                <button onClick={() => del(m.id, m.storage_path)} className="text-red-600 text-xs shrink-0">حذف</button>
              </li>
            ))}
            {(data ?? []).length === 0 && <li className="text-xs text-brand-navy/40 py-3">لا توجد ملفات.</li>}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* Teacher quiz management (scoped to their course) */

type TQuestion = { prompt: string; choices: string[]; correct_index: number };

function TeacherQuizzes({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["t-quizzes", courseId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("id, title, description, quiz_questions(id)").eq("course_id", courseId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function del(id: string) {
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["t-quizzes", courseId] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="text-xs">📝 الاختبارات</Button></DialogTrigger>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader><DialogTitle>اختبارات — {courseTitle}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <TeacherQuizForm courseId={courseId} onSaved={() => qc.invalidateQueries({ queryKey: ["t-quizzes", courseId] })} />
          <ul className="divide-y divide-brand-navy/5 max-h-72 overflow-auto">
            {(data ?? []).map((q: { id: string; title: string; description: string | null; quiz_questions?: { id: string }[] }) => (
              <li key={q.id} className="py-2 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{q.title}</p>
                  <p className="text-[11px] text-brand-navy/50">{q.quiz_questions?.length ?? 0} سؤال</p>
                </div>
                <Button size="sm" variant="outline" className="text-red-600 h-7 text-[11px]" onClick={() => del(q.id)}>حذف</Button>
              </li>
            ))}
            {(data ?? []).length === 0 && <li className="text-xs text-brand-navy/40 py-3">لا توجد اختبارات بعد.</li>}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TeacherQuizForm({ courseId, onSaved }: { courseId: string; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<TQuestion[]>([{ prompt: "", choices: ["", ""], correct_index: 0 }]);
  const [busy, setBusy] = useState(false);

  function update(i: number, patch: Partial<TQuestion>) {
    setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  }

  async function save() {
    if (!title.trim()) { toast.error("العنوان مطلوب"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.from("quizzes").insert({ title: title.trim(), description: description.trim(), course_id: courseId }).select("id").single();
      if (error) throw error;
      const rows = questions.filter((q) => q.prompt.trim()).map((q, i) => ({
        quiz_id: data.id, position: i, prompt: q.prompt, choices: q.choices, correct_index: q.correct_index,
      }));
      if (rows.length) {
        const { error: qErr } = await supabase.from("quiz_questions").insert(rows);
        if (qErr) throw qErr;
      }
      toast.success("تم إنشاء الاختبار");
      setTitle(""); setDescription(""); setQuestions([{ prompt: "", choices: ["", ""], correct_index: 0 }]);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-brand-navy/10 rounded-xl p-3 space-y-2 bg-brand-sage/20">
      <p className="text-xs font-bold text-brand-navy/70">+ اختبار جديد</p>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الاختبار" className="h-8 text-sm" />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="وصف مختصر" className="text-xs" />
      <div className="space-y-2 max-h-52 overflow-auto">
        {questions.map((q, i) => (
          <div key={i} className="bg-white border border-brand-navy/10 p-2 rounded-lg space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-[10px]">سؤال {i + 1}</Label>
              {questions.length > 1 && <button onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))} className="text-red-600 text-[10px]">حذف</button>}
            </div>
            <Input value={q.prompt} onChange={(e) => update(i, { prompt: e.target.value })} placeholder="نص السؤال" className="h-7 text-xs" />
            {q.choices.map((c, ci) => (
              <div key={ci} className="flex gap-1 items-center">
                <input type="radio" checked={q.correct_index === ci} onChange={() => update(i, { correct_index: ci })} />
                <Input value={c} onChange={(e) => update(i, { choices: q.choices.map((x, xi) => xi === ci ? e.target.value : x) })} placeholder={`اختيار ${ci + 1}`} className="h-7 text-xs" />
                {q.choices.length > 2 && <button onClick={() => update(i, { choices: q.choices.filter((_, xi) => xi !== ci), correct_index: 0 })} className="text-red-600 text-[10px]">×</button>}
              </div>
            ))}
            <button onClick={() => update(i, { choices: [...q.choices, ""] })} className="text-[10px] text-brand-gold">+ اختيار</button>
          </div>
        ))}
        <button onClick={() => setQuestions((qs) => [...qs, { prompt: "", choices: ["", ""], correct_index: 0 }])} className="text-[11px] text-brand-navy/60 w-full border border-dashed border-brand-navy/20 py-1.5 rounded">+ سؤال</button>
      </div>
      <Button size="sm" onClick={save} disabled={busy} className="w-full bg-brand-navy text-white h-8 text-xs">{busy ? "…" : "حفظ الاختبار"}</Button>
    </div>
  );
}

/* ==================== Student Dashboard ==================== */

function StudentDashboard({ userId }: { userId: string }) {
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, level, level_notes").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const { data: regs } = useQuery({
    queryKey: ["my-regs", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("registrations")
        .select("id, slot, payment_link, status, course_id, courses(id, title, session_type, start_date, end_date, hours_per_week, hourly_rate, price)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const rows = data ?? [];
      const ids = rows.map((r) => r.course_id);
      const meetings = new Map<string, string | null>();
      if (ids.length) {
        const { data: m } = await supabase.from("course_meetings").select("course_id, meeting_link").in("course_id", ids);
        (m ?? []).forEach((row) => meetings.set(row.course_id, row.meeting_link));
      }
      return rows.map((r) => ({ ...r, meeting_link: meetings.get(r.course_id) ?? null }));
    },
  });

  const { data: quizzes } = useQuery({
    queryKey: ["my-quizzes", userId],
    queryFn: async () => {
      const { data: qs } = await supabase.from("quizzes").select("id, title, description");
      const { data: attempts } = await supabase.from("quiz_attempts").select("quiz_id, score, total, created_at").eq("user_id", userId).order("created_at", { ascending: false });
      const last = new Map<string, { score: number; total: number }>();
      (attempts ?? []).forEach((a) => { if (!last.has(a.quiz_id)) last.set(a.quiz_id, { score: a.score, total: a.total }); });
      return (qs ?? []).map((q) => ({ ...q, last: last.get(q.id) }));
    },
  });

  const name = profile?.full_name?.trim() || "بك";

  return (
    <div className="min-h-screen text-brand-navy">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header>
          <h1 className="font-serif text-3xl">أهلاً {name} 👋</h1>
          {profile?.level && (
            <div className="mt-2 inline-flex items-center gap-2 bg-brand-gold/15 text-brand-gold border border-brand-gold/30 px-3 py-1 rounded-full text-xs">
              <span>📈 مستواك الحالي: <b>{profile.level}</b></span>
            </div>
          )}
          {profile?.level_notes && <p className="text-xs text-brand-navy/55 mt-2">{profile.level_notes}</p>}
        </header>

        <section className="bg-brand-navy text-white rounded-2xl p-6 space-y-3 shadow-xl shadow-brand-navy/20">
          <div className="flex items-center gap-3">
            <div className="size-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">جلساتي القادمة</span>
          </div>
          {!regs || regs.length === 0 ? (
            <p className="text-sm text-white/60">لا توجد جلسات. <Link to="/" className="underline">تصفح الدورات</Link></p>
          ) : (
            <ul className="space-y-3">
              {regs.map((r) => {
                const meet = safeUrl(r.meeting_link);
                const slotLabel = r.slot ? parseSlot(r.slot).label : "سيتم تحديد الموعد";
                return (
                  <li key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-serif text-lg">{r.courses?.title ?? "دورة"}</h3>
                      <p className="text-xs text-white/60">
                        {slotLabel}
                        {r.status === "confirmed" && <span className="ms-2 text-emerald-300">· مؤكد</span>}
                        {r.status === "pending" && <span className="ms-2 text-amber-300">· بانتظار التأكيد</span>}
                        {r.status === "cancelled" && <span className="ms-2 text-red-300">· ملغي</span>}
                      </p>
                      <div className="flex gap-2 flex-wrap text-[11px]">
                        <Link to="/pay/$id" params={{ id: r.course_id }} className="text-brand-gold underline">
                          {r.payment_link ? "إكمال الدفع ←" : "تفاصيل الدفع"}
                        </Link>
                        {r.courses && <MaterialsButton courseId={r.courses.id} />}
                        {r.courses && <HomeworkButton courseId={r.courses.id} userId={userId} qc={qc} />}
                      </div>
                    </div>
                    {meet ? (
                      <a href={meet} target="_blank" rel="noopener noreferrer" className="bg-brand-gold text-white py-2 px-4 rounded-lg font-bold text-sm text-center hover:bg-brand-gold/90 transition">انضم للجلسة</a>
                    ) : (
                      <span className="text-[11px] text-white/40">رابط الاجتماع قيد التحضير</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {quizzes && quizzes.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-serif text-2xl">اختبارات</h2>
            <div className="grid gap-3">
              {quizzes.map((q) => (
                <div key={q.id} className="bg-white border border-brand-navy/5 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-medium">{q.title}</p>
                    {q.description && <p className="text-[11px] text-brand-navy/55">{q.description}</p>}
                    {q.last && <p className="text-[11px] text-brand-gold mt-1">آخر نتيجة: {q.last.score}/{q.last.total}</p>}
                  </div>
                  <TakeQuiz quizId={q.id} title={q.title} userId={userId} qc={qc} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function MaterialsButton({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["my-materials", courseId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("course_materials").select("*").eq("course_id", courseId);
      return data ?? [];
    },
  });
  async function openFile(path: string) {
    const { data } = await supabase.storage.from("materials").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button className="text-white/70 underline">📎 المواد</button></DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>مواد الدورة</DialogTitle></DialogHeader>
        <ul className="divide-y divide-brand-navy/5">
          {(data ?? []).map((m) => (
            <li key={m.id} className="py-2"><button onClick={() => openFile(m.storage_path)} className="text-brand-gold underline text-sm">{m.title}</button></li>
          ))}
          {(data ?? []).length === 0 && <li className="text-xs text-brand-navy/40 py-3">لا توجد مواد بعد.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function HomeworkButton({ courseId, userId, qc }: { courseId: string; userId: string; qc: ReturnType<typeof useQueryClient> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["my-hw", courseId, userId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("homework_submissions").select("*").eq("course_id", courseId).eq("user_id", userId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const path = `${userId}/${courseId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("homework").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("homework_submissions").insert({ user_id: userId, course_id: courseId, title: file.name, storage_path: path });
      if (error) throw error;
      toast.success("تم رفع الواجب");
      qc.invalidateQueries({ queryKey: ["my-hw", courseId, userId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button className="text-white/70 underline">📝 واجباتي</button></DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>الواجبات</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input type="file" onChange={upload} disabled={busy} />
          <ul className="divide-y divide-brand-navy/5">
            {(data ?? []).map((h) => (
              <li key={h.id} className="py-2 text-sm space-y-1">
                <p className="font-medium">{h.title}</p>
                {h.grade && <p className="text-xs text-brand-gold">الدرجة: {h.grade}</p>}
                {h.feedback && <p className="text-xs text-brand-navy/60">{h.feedback}</p>}
              </li>
            ))}
            {(data ?? []).length === 0 && <li className="text-xs text-brand-navy/40 py-3">لم ترفع واجبات بعد.</li>}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TakeQuiz({ quizId, title, userId, qc }: { quizId: string; title: string; userId: string; qc: ReturnType<typeof useQueryClient> }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const { data: questions } = useQuery({
    queryKey: ["quiz-questions", quizId],
    enabled: open,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc("get_quiz_questions_public", { _quiz_id: quizId });
      return (data ?? []) as Array<{ id: string; position: number; prompt: string; choices: string[] }>;
    },
  });

  async function submit() {
    if (!questions) return;
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("submit_quiz_attempt", { _quiz_id: quizId, _answers: answers });
    setBusy(false);
    if (error) { setResult({ score: 0, total: questions.length }); return; }
    const row = Array.isArray(data) && data.length > 0 ? data[0] : { score: 0, total: questions.length };
    setResult({ score: Number(row.score ?? 0), total: Number(row.total ?? questions.length) });
    qc.invalidateQueries({ queryKey: ["my-quizzes", userId] });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setAnswers({}); setResult(null); } }}>
      <DialogTrigger asChild><Button size="sm" className="bg-brand-navy text-white">بدء</Button></DialogTrigger>
      <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {result ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-4xl font-serif text-brand-gold">{result.score}/{result.total}</p>
            <p className="text-sm text-brand-navy/60">شكرًا لإكمال الاختبار</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(questions ?? []).map((q, i) => (
              <div key={q.id} className="space-y-2">
                <p className="font-medium text-sm">{i + 1}. {q.prompt}</p>
                {((q.choices as string[]) ?? []).map((c, ci) => (
                  <label key={ci} className="flex items-center gap-2 text-sm bg-brand-sage/30 p-2 rounded cursor-pointer">
                    <input type="radio" name={q.id} checked={answers[q.id] === ci} onChange={() => setAnswers((a) => ({ ...a, [q.id]: ci }))} />
                    {c}
                  </label>
                ))}
              </div>
            ))}
            <Button onClick={submit} disabled={busy} className="w-full bg-brand-navy text-white">إرسال</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
