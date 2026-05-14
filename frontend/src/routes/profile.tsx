import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { toast } from "sonner";
import { ShieldCheck, Star, Plus } from "lucide-react";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

interface ProfileData {
  id: string;
  username: string;
  display_name?: string | null;
  bio: string | null;
  location: string | null;
  is_verified: boolean;
  rating: number;
}

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ display_name: "", bio: "", location: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data as ProfileData);
          setForm({
            display_name: data.display_name ?? data.username ?? "",
            bio: data.bio ?? "",
            location: data.location ?? "",
          });
        }
      });
    supabase
      .from("products")
      .select("id, title, price, grade, image_url, location")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProducts((data ?? []) as ProductCardData[]));
  }, [user, authLoading]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil tersimpan!");
    setEditing(false);
    setProfile((p) => (p ? { ...p, ...form } : p));
  };

  if (!profile) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto p-8">
          <div className="h-40 animate-pulse rounded-2xl bg-secondary/60" />
        </div>
      </div>
    );
  }

  const safeDisplayName = (profile.display_name ?? profile.username ?? "").trim();
  const displayNameForUi = safeDisplayName.length > 0 ? safeDisplayName : "User";
  const avatarInitial = displayNameForUi.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-3xl border border-border bg-gradient-cream p-6 shadow-soft md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-warm font-display text-3xl font-bold text-accent-foreground shadow-warm">
              {avatarInitial}
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Hello,</p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-bold text-primary">{displayNameForUi}</h1>
                {profile.is_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-trust px-2 py-0.5 text-xs font-medium text-trust-foreground">
                    <ShieldCheck className="h-3 w-3" /> Terpercaya
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              {profile.rating > 0 && (
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-warm-foreground">
                  <Star className="h-4 w-4 fill-warm text-warm" /> {profile.rating.toFixed(1)}
                </p>
              )}
            </div>
            <Button variant={editing ? "ghost" : "outline"} onClick={() => setEditing((v) => !v)}>
              {editing ? "Batal" : "Kelola Profil"}
            </Button>
          </div>

          {editing ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nama Tampilan</label>
                <input
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Lokasi</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Jakarta Selatan"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={save}
                  disabled={saving}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {saving ? "Menyimpan…" : "Simpan"}
                </Button>
              </div>
            </div>
          ) : profile.bio ? (
            <p className="mt-4 max-w-2xl text-sm text-foreground/80">{profile.bio}</p>
          ) : null}
        </div>

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-primary">Produk Saya</h2>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/sell">
                <Plus className="h-4 w-4" /> Jual Baru
              </Link>
            </Button>
          </div>
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              Belum ada produk. Mulai jual barangmu sekarang!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
