import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "تسجيل الدخول" }] }),
  component: AuthPage,
});

const phoneRe = /^\+?[0-9\s-]{7,20}$/;

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "الاسم مطلوب").max(100),
  phone: z.string().trim().regex(phoneRe, "رقم هاتف غير صالح"),
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(255),
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف").max(72),
});

const signinSchema = z.object({
  phone: z.string().trim().regex(phoneRe, "رقم هاتف غير صالح"),
  password: z.string().min(6).max(72),
});

function normPhone(p: string) {
  return p.trim().replace(/\s+/g, "");
}

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const parsed = signinSchema.safeParse({ phone, password });
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const p = normPhone(phone);
        const { data: emailRes, error: rpcErr } = await supabase.rpc("get_email_by_phone", { _phone: p });
        if (rpcErr) throw rpcErr;
        if (!emailRes) throw new Error("لا يوجد حساب بهذا الرقم");
        const { error } = await supabase.auth.signInWithPassword({ email: emailRes, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول");
        navigate({ to: "/dashboard" });
      } else {
        const parsed = signupSchema.safeParse({ fullName, phone, email, password });
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const p = normPhone(phone);
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
            data: { full_name: fullName, phone: p },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب");
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="bg-card border border-brand-navy/10 rounded-2xl p-6 shadow-lg shadow-brand-navy/5">
          <div className="flex gap-2 mb-6 p-1 bg-brand-sage/60 rounded-lg">
            <button type="button" onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-md text-sm font-bold transition ${mode === "signin" ? "bg-white text-brand-navy shadow-sm" : "text-brand-navy/60"}`}>تسجيل دخول</button>
            <button type="button" onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-md text-sm font-bold transition ${mode === "signup" ? "bg-white text-brand-navy shadow-sm" : "text-brand-navy/60"}`}>حساب جديد</button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required dir="ltr" placeholder="+968 9XXX XXXX" maxLength={20} />
            </div>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني (لاستعادة كلمة المرور)</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} dir="ltr" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={72} dir="ltr" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-brand-navy text-white hover:bg-brand-navy/90">
              {busy ? "…" : mode === "signin" ? "دخول" : "إنشاء حساب"}
            </Button>
            {mode === "signin" && (
              <div className="text-center">
                <Link to="/forgot-password" className="text-xs text-brand-gold underline">نسيت كلمة المرور؟</Link>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
