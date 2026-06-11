import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/reserved")({ component: Reserved });

function Reserved() {
  return (
    <div className="min-h-screen bg-brand-cream">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="border-2 border-dashed border-brand-gold/40 p-8 rounded-2xl text-center space-y-4 bg-white">
          <div className="size-14 bg-brand-sage rounded-full mx-auto flex items-center justify-center">
            <div className="size-3 bg-brand-gold rounded-full" />
          </div>
          <h1 className="font-serif text-2xl">تم حجز مقعدك!</h1>
          <p className="text-sm text-brand-navy/70 leading-relaxed">
            تم تأكيد تسجيلك. سيتم إرسال رابط دفع آمن إلى بريدك الإلكتروني من قِبَل المدرب قريبًا لإتمام الحجز.
          </p>
          <Link to="/dashboard" className="inline-block text-sm font-semibold text-brand-navy underline">
            الذهاب إلى لوحتي
          </Link>
        </div>
      </main>
    </div>
  );
}
