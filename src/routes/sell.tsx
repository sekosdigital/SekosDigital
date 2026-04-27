import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { GRADE_LABEL, formatNumberWithDots } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/sell")({ component: SellPage });

interface Category {
  id: string;
  name: string;
}

const GRADES = ["baru", "seperti_baru", "bekas_baik", "bekas_layak"] as const;
const IMAGE_BUCKET = "product-images";
const PLACEHOLDER_IMAGE_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23e0e0e0' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

function SellPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    priceDisplay: "",
    category_id: "",
    grade: "bekas_baik" as (typeof GRADES)[number],
    image_url: "",
    location: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    supabase
      .from("categories")
      .select("id, name")
      .order("name")
      .then(async ({ data, error }) => {
        const cats = data ?? [];
        if (cats.length === 0) {
          const fallbackName = "Lainnya";
          const fallbackSlug = "lainnya";
          const { data: existing } = await supabase
            .from("categories")
            .select("id, name")
            .eq("slug", fallbackSlug)
            .maybeSingle();

          let fallbackCategory = existing;
          if (!fallbackCategory) {
            const { data: inserted, error: insertError } = await supabase
              .from("categories")
              .insert({ name: fallbackName, slug: fallbackSlug })
              .select("id, name")
              .single();
            fallbackCategory = inserted ?? null;
          }

          if (fallbackCategory) {
            const fallbackList = [fallbackCategory];
            setCategories(fallbackList);
            setForm((f) => ({ ...f, category_id: f.category_id || fallbackCategory.id }));
            return;
          }
        }
        setCategories(cats);
        if (cats.length && !form.category_id) {
          setForm((f) => ({ ...f, category_id: cats[0].id }));
        }
      });
  }, [user, authLoading]);

  const handlePriceChange = (value: string) => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/[^\d]/g, "");
    const numValue = Number(numericValue);

    setForm({
      ...form,
      price: numericValue,
      priceDisplay: numericValue ? formatNumberWithDots(numValue) : "",
    });
  };

  const handleImageChange = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImagePreview("");
      setForm((f) => ({ ...f, image_url: "" }));
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setForm((f) => ({ ...f, image_url: "" }));
  };

  const uploadImageWithRetry = async (
    file: File,
    maxRetries: number = 2,
  ): Promise<string | null> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const fileName = `${user.id}/${Date.now()}-${attempt}-${encodeURIComponent(
          file.name.replace(/\s+/g, "-"),
        )}`;
        console.log(`🔄 Attempt ${attempt + 1}: Uploading to ${fileName}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(IMAGE_BUCKET)
          .upload(fileName, file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          console.error(`❌ Upload error on attempt ${attempt + 1}:`, uploadError);
          console.error("Error details:", {
            code: uploadError.code,
            message: uploadError.message,
            name: uploadError.name,
          });
          if (attempt < maxRetries) {
            console.warn(`Retrying upload (attempt ${attempt + 2}/${maxRetries + 1})...`);
            await new Promise((r) => setTimeout(r, 1000)); // Wait 1 second before retry
            continue;
          }
          return null;
        }

        console.log(`✅ File uploaded to: ${uploadData.path}`);
        const { data: publicUrlData } = supabase.storage
          .from(IMAGE_BUCKET)
          .getPublicUrl(uploadData.path);
          
        if (publicUrlData?.publicUrl) {
          console.log(`✅ Public URL generated: ${publicUrlData.publicUrl}`);
          return publicUrlData.publicUrl;
        }
        console.error("❌ No public URL returned from storage");
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        return null;
      } catch (err) {
        console.error(`❌ Upload attempt ${attempt + 1} exception:`, err);
        if (err instanceof Error) {
          console.error("Error message:", err.message);
          console.error("Error stack:", err.stack);
        }
        if (attempt < maxRetries) {
          console.warn(`Retrying after exception (attempt ${attempt + 2}/${maxRetries + 1})...`);
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        return null;
      }
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const price = Number(form.price);
    if (!form.title.trim()) return toast.error("Judul wajib diisi");
    if (!Number.isFinite(price) || price < 0) return toast.error("Harga tidak valid");
    if (categories.length > 0 && !form.category_id) return toast.error("Kategori wajib dipilih");
    if (!imageFile) return toast.error("Gambar produk wajib diupload");

    setSubmitting(true);

    let uploadedImageUrl: string | null = null;
    const loadingToast = toast.loading("Mengunggah gambar...");
    uploadedImageUrl = await uploadImageWithRetry(imageFile);

    if (!uploadedImageUrl) {
      toast.dismiss(loadingToast);
      toast.warning("Gambar gagal diupload, menggunakan placeholder. Coba upload lagi nanti.");
      uploadedImageUrl = PLACEHOLDER_IMAGE_URL;
    } else {
      toast.dismiss(loadingToast);
      toast.success("Gambar berhasil diupload!");
      console.log("✅ Image uploaded successfully:", uploadedImageUrl);
    }

    const basePayload = {
      seller_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      price,
      category_id: form.category_id || null,
      grade: form.grade,
      image_url: uploadedImageUrl,
      location: form.location.trim() || null,
      is_active: true,
    };

    let attemptPayload = { ...basePayload };
    let finalData: { id: string } | null = null;
    let finalError: { code?: string; message: string } | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const result = await supabase
        .from("products")
        .insert(attemptPayload as never)
        .select("id")
        .single();
      finalData = result.data;
      finalError = result.error;
      if (!finalError) break;

      if (
        attempt === 1 &&
        finalError.code === "PGRST204" &&
        finalError.message.includes("'title' column")
      ) {
        const nextPayload = {
          ...basePayload,
          name: basePayload.title,
        } as Record<string, unknown>;
        delete nextPayload.title;
        attemptPayload = nextPayload as typeof basePayload;
        continue;
      }
      break;
    }

    setSubmitting(false);

    if (finalError || !finalData) {
      toast.error(finalError?.message ?? "Gagal membuat produk");
      return;
    }
    toast.success("Produk berhasil dipasang!");
    navigate({ to: "/product/$id", params: { id: finalData.id } });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-primary">Jual Produk</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Isi detail barang yang ingin kamu jual.
        </p>

        <form
          onSubmit={submit}
          className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <Field label="Judul Produk *">
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Meja kos"
              className={inputCls}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Harga (Rp) *">
              <input
                required
                type="text"
                value={form.priceDisplay}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="20.000"
                className={inputCls}
              />
            </Field>
            <Field label="Kategori">
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Pilih kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Kondisi">
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm({ ...form, grade: g })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${form.grade === g ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background text-muted-foreground hover:border-accent"}`}
                >
                  {GRADE_LABEL[g]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Lokasi">
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Jakarta Selatan"
              className={inputCls}
            />
          </Field>

          <Field label="Unggah Gambar (opsional)">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
              className={inputCls}
            />
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="preview"
                className="mt-2 h-32 w-32 rounded-lg object-cover"
              />
            ) : form.image_url ? (
              <img
                src={form.image_url}
                alt="preview"
                className="mt-2 h-32 w-32 rounded-lg object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : null}
          </Field>

          <Field label="Deskripsi">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Ceritakan kondisi & detail barangmu…"
              className={`${inputCls} h-auto py-2`}
            />
          </Field>

          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-warm"
          >
            {submitting ? "Memasang…" : "Pasang Produk"}
          </Button>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
