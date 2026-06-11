import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/reserved")({ component: Reserved });

function Reserved() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="border border-brand-gold/30 p-8 rounded-2xl text-center space-y-4 bg-card shadow-lg shadow-brand-navy/5">
          <div className="size-14 bg-brand-sage rounded-full mx-auto flex items-center justify-center">
            <div className="size-3 bg-brand-gold rounded-full" />
          </div>
          <h1 className="font-serif text-2xl">تم حجز مقعدك!</h1>
          <p className="text-sm text-brand-navy/70 leading-relaxed">
            تم تأكيد تسجيلك. ستجد ملخص الدفع ورابطه في لوحتك بمجرد إضافته من قِبَل المدرب، وسيتم إعلامك عبر البريد الإلكتروني أو الواتساب.
          </p>
          <Link to="/dashboard" className="inline-block text-sm font-semibold text-brand-navy underline">
            الذهاب إلى لوحتي
          </Link>
        </div>
      </main>
    </div>
  );
}
