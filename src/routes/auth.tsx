import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "تسجيل الدخول — لينغويست" }] }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(255),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").max(72),
  fullName: z.string().trim().min(1, "الاسم مطلوب").max(100).optional(),
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, fullName: mode === "signup" ? fullName : undefined });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب");
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white border border-brand-navy/5 rounded-2xl p-6 shadow-sm">
          <div className="flex gap-2 mb-6 p-1 bg-brand-sage/40 rounded-lg">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded text-sm font-medium ${mode === "signin" ? "bg-white text-brand-navy shadow-sm" : "text-brand-navy/60"}`}
            >تسجيل دخول</button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded text-sm font-medium ${mode === "signup" ? "bg-white text-brand-navy shadow-sm" : "text-brand-navy/60"}`}
            >حساب جديد</button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={72} dir="ltr" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-brand-navy text-white hover:bg-brand-navy/90">
              {busy ? "…" : mode === "signin" ? "دخول" : "إنشاء حساب"}
            </Button>
          </form>
          <p className="text-[11px] text-brand-navy/40 text-center mt-4">
            أول حساب يتم إنشاؤه يحصل تلقائيًا على صلاحيات الإدارة.
          </p>
        </div>
      </main>
    </div>
  );
}
