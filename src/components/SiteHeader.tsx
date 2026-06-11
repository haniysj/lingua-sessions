import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-50 bg-brand-cream/85 backdrop-blur-md border-b border-brand-navy/5">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-9 bg-brand-navy rounded-md flex items-center justify-center text-white font-serif text-xl">ل</div>
          <span className="font-serif font-bold text-lg tracking-tight text-brand-navy">لينغويست</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/" className="px-2 py-1 text-brand-navy/70 hover:text-brand-navy">الدورات</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="px-2 py-1 text-brand-navy/70 hover:text-brand-navy">لوحتي</Link>
              {isAdmin && (
                <Link to="/admin" className="px-2 py-1 text-brand-gold font-medium">الإدارة</Link>
              )}
              <Button variant="outline" size="sm" onClick={signOut}>خروج</Button>
            </>
          ) : (
            <Button asChild size="sm" className="bg-brand-navy text-white hover:bg-brand-navy/90">
              <Link to="/auth">دخول</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
