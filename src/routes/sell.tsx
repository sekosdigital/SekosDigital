import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { GRADE_LABEL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/sell")({ component: SellPage });

interface Category { id: string; name: string }

const GRADES = ["baru", "seperti_baru", "bekas_baik", "bekas_layak"] as const;

function SellPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", price: "", category_id: "",
    grade: "bekas_baik" as typeof GRADES[number],
    image_url: "", location: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    supabase.from("categories").select("id, name").order("name")
      .then(({ data }) => {
        const cats = data ?? [];
        setCategories(cats);
        if (cats.length && !form.category_id) setForm((f) => ({ ...f, category_id: cats[0].id }));
      });
  }, [user, authLoading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const price = Number(form.price);
    if (!form.title.trim()) return toast.error("Judul wajib diisi");
    if (!Number.isFinite(price) || price < 0) return toast.error("Harga tidak valid");

    setSubmitting(true);
    const { data, error } = await supabase.from("products").insert({
      seller_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      price,
      category_id: form.category_id || null,
      grade: form.grade,
      image_url: form.image_url.trim() || null,
      location: form.location.trim() || null,
    }).select("id").single();
    setSubmitting(false);

    if (error) { toast.error(error.message); return; }
    toast.success("Produk berhasil dipasang!");
    navigate({ to: "/product/$id", params: { id: data.id } });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-primary">Jual Produk</h1>
        <p className="mt-1 text-sm text-muted-foreground">Isi detail barang yang ingin kamu jual.</p>

        <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <Field label="Judul Produk *">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Buku Matematika Kelas 10" className={inputCls} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Harga (Rp) *">
              <input required type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="20000" className={inputCls} />
            </Field>
            <Field label="Kategori">
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={inputCls}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Kondisi">
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <button key={g} type="button" onClick={() => setForm({ ...form, grade: g })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${form.grade === g ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background text-muted-foreground hover:border-accent"}`}>
                  {GRADE_LABEL[g]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Lokasi">
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Jakarta Selatan" className={inputCls} />
          </Field>

          <Field label="URL Gambar (opsional)">
            <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://…/foto.jpg" className={inputCls} />
            {form.image_url && (
              <img src={form.image_url} alt="preview" className="mt-2 h-32 w-32 rounded-lg object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
            )}
          </Field>

          <Field label="Deskripsi">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4} placeholder="Ceritakan kondisi & detail barangmu…" className={`${inputCls} h-auto py-2`} />
          </Field>

          <Button type="submit" disabled={submitting} className="h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-warm">
            {submitting ? "Memasang…" : "Pasang Produk"}
          </Button>
        </form>
      </div>
    </div>
  );
}

const inputCls = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
