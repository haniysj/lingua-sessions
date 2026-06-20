import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { safeUrl } from "@/lib/safe-url";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, level, level_notes").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: regs } = useQuery({
    queryKey: ["my-regs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("registrations")
        .select("id, slot, payment_link, course_id, courses(id, title, session_type, start_date, end_date, hours_per_week, hourly_rate, price)")
        .eq("user_id", user!.id)
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
    queryKey: ["my-quizzes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: qs } = await supabase.from("quizzes").select("id, title, description");
      const { data: attempts } = await supabase.from("quiz_attempts").select("quiz_id, score, total, created_at").eq("user_id", user!.id).order("created_at", { ascending: false });
      const last = new Map<string, { score: number; total: number }>();
      (attempts ?? []).forEach((a) => { if (!last.has(a.quiz_id)) last.set(a.quiz_id, { score: a.score, total: a.total }); });
      return (qs ?? []).map((q) => ({ ...q, last: last.get(q.id) }));
    },
  });

  return (
    <div className="min-h-screen text-brand-navy">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header>
          <h1 className="font-serif text-3xl">أهلاً {profile?.full_name || "بك"}</h1>
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
                return (
                  <li key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-serif text-lg">{r.courses?.title ?? "دورة"}</h3>
                      <p className="text-xs text-white/60">{r.slot ?? "سيتم تحديد الموعد"}</p>
                      <div className="flex gap-2 flex-wrap text-[11px]">
                        <Link to="/pay/$id" params={{ id: r.id }} className="text-brand-gold underline">
                          {r.payment_link ? "إكمال الدفع ←" : "تفاصيل الدفع"}
                        </Link>
                        {r.courses && <MaterialsButton courseId={r.courses.id} />}
                        {r.courses && <HomeworkButton courseId={r.courses.id} userId={user!.id} qc={qc} />}
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
                  <TakeQuiz quizId={q.id} title={q.title} userId={user!.id} qc={qc} />
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
