import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ShoppingCart, MapPin, LogOut, User as UserIcon, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const [profile, setProfile] = useState<{ display_name: string; location: string | null } | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setCartCount(0);
      return;
    }
    supabase.from("profiles").select("display_name, location").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
    supabase.from("cart_items").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => setCartCount(count ?? 0));
  }, [user, routerState.location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/", search: { q: search || undefined, kategori: undefined, min: undefined, max: undefined, sort: undefined } });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold tracking-tight text-primary">
            SEKOS
          </span>
        </Link>

        <form onSubmit={handleSearch} className="relative ml-2 hidden flex-1 max-w-md md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari buku, alat tulis, seragam…"
            className="h-10 w-full rounded-full border border-border bg-secondary/50 pl-10 pr-4 text-sm outline-none transition focus:border-accent focus:bg-card"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          {profile?.location && (
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
              <MapPin className="h-3.5 w-3.5" /> {profile.location}
            </span>
          )}

          {user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/sell"><Plus className="h-4 w-4" /> Jual</Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="relative">
                <Link to="/cart" aria-label="Keranjang">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon">
                <Link to="/profile" aria-label="Profil"><UserIcon className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Keluar">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Masuk</Link>
              </Button>
              <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/register">Daftar</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* mobile search */}
      <form onSubmit={handleSearch} className="container mx-auto px-4 pb-3 md:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk…"
            className="h-10 w-full rounded-full border border-border bg-secondary/50 pl-10 pr-4 text-sm outline-none focus:border-accent focus:bg-card"
          />
        </div>
      </form>
    </header>
  );
}
