import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "استعادة كلمة المرور" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = phone.trim().replace(/\s+/g, "");
      const { data: emailRes, error: rpcErr } = await supabase.rpc("get_email_by_phone", { _phone: p });
      if (rpcErr) throw rpcErr;
      if (!emailRes) throw new Error("لا يوجد حساب مرتبط بهذا الرقم");
      const { error } = await supabase.auth.resetPasswordForEmail(emailRes, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("تم إرسال رابط الاستعادة إلى بريدك");
    } catch (err) {
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
          <h1 className="font-serif text-2xl mb-2">استعادة كلمة المرور</h1>
          <p className="text-xs text-brand-navy/55 mb-5">أدخل رقم هاتفك، وسنرسل رابطًا لإعادة تعيين كلمة المرور إلى بريدك الإلكتروني.</p>
          {sent ? (
            <div className="bg-brand-sage/50 rounded-lg p-4 text-sm text-brand-navy/80">
              تحقّق من بريدك الإلكتروني واتبع الرابط لإعادة التعيين.
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required dir="ltr" placeholder="+968 9XXX XXXX" />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-brand-navy text-white hover:bg-brand-navy/90">
                {busy ? "…" : "إرسال الرابط"}
              </Button>
            </form>
          )}
          <div className="text-center mt-4">
            <Link to="/auth" className="text-xs text-brand-navy/60 underline">العودة لتسجيل الدخول</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
