import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { SiteHeader } from "@/components/site-header";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import heroImg from "@/assets/sekos-hero.jpg";
import promoImg from "@/assets/sekos-promo.jpg";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Truck,
  BadgeCheck,
  Headphones,
  BookOpen,
  PencilLine,
  Shirt,
  Backpack,
  Cpu,
  Package,
  X,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const searchSchema = z.object({
  q: z.string().optional(),
  kategori: z.string().optional(),
  min: z.coerce.number().int().min(0).optional(),
  max: z.coerce.number().int().min(0).optional(),
  sort: z.enum(["terbaru", "termurah", "termahal"]).optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  component: HomePage,
});

interface Category {
  id: string;
  name: string;
  slug: string;
}

const CAT_ICONS: Record<string, LucideIcon> = {
  buku: BookOpen,
  "alat-tulis": PencilLine,
  seragam: Shirt,
  tas: Backpack,
  elektronik: Cpu,
  lainnya: Package,
};

function HomePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [minInput, setMinInput] = useState(search.min?.toString() ?? "");
  const [maxInput, setMaxInput] = useState(search.max?.toString() ?? "");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, slug")
      .order("name")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from("products")
      .select(
        "id, title, price, grade, image_url, location, category_id, seller:profiles!products_seller_id_fkey(display_name, is_verified)",
      )
      .eq("is_active", true);

    if (search.q) query = query.ilike("title", `%${search.q}%`);
    if (search.min !== undefined) query = query.gte("price", search.min);
    if (search.max !== undefined) query = query.lte("price", search.max);
    if (search.kategori) {
      const cat = categories.find((c) => c.slug === search.kategori);
      if (cat) query = query.eq("category_id", cat.id);
    }
    if (search.sort === "termurah") query = query.order("price", { ascending: true });
    else if (search.sort === "termahal") query = query.order("price", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    query.limit(60).then(async ({ data, error }) => {
      // #region agent log
      fetch("http://127.0.0.1:7410/ingest/1bad6591-db48-487e-a518-f50e865918d8", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "186559" },
        body: JSON.stringify({
          sessionId: "186559",
          runId: "visibility-debug",
          hypothesisId: "V2",
          location: "src/routes/index.tsx:75",
          message: "home products query resolved",
          data: {
            attempt: "primary",
            hasError: Boolean(error),
            errorCode: error?.code ?? null,
            errorMessage: error?.message ?? null,
            rowsCount: (data ?? []).length,
            firstId: data?.[0]?.id ?? null,
            firstTitle: data?.[0]?.title ?? null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      let finalRows = (data ?? []) as unknown as ProductCardData[];
      if (
        error?.code === "PGRST200" &&
        error.message.includes("between 'products' and 'profiles'")
      ) {
        const fallback = await supabase
          .from("products")
          .select("id, title:name, price, image_url")
          .limit(60);
        // #region agent log
        fetch("http://127.0.0.1:7410/ingest/1bad6591-db48-487e-a518-f50e865918d8", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "186559" },
          body: JSON.stringify({
            sessionId: "186559",
            runId: "visibility-debug",
            hypothesisId: "V4",
            location: "src/routes/index.tsx:84",
            message: "home products fallback query resolved",
            data: {
              attempt: "fallback-no-relations",
              hasError: Boolean(fallback.error),
              errorCode: fallback.error?.code ?? null,
              errorMessage: fallback.error?.message ?? null,
              rowsCount: (fallback.data ?? []).length,
              firstId: fallback.data?.[0]?.id ?? null,
              firstTitle: (fallback.data?.[0] as { title?: string } | undefined)?.title ?? null,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        finalRows = (
          (fallback.data ?? []) as Array<{
            id: string;
            title?: string;
            price?: number;
            image_url?: string | null;
          }>
        ).map((row) => ({
          id: row.id,
          title: row.title ?? "Produk",
          price: row.price ?? 0,
          image_url: row.image_url ?? null,
          grade: "bekas_baik",
          location: null,
          seller: null,
        }));
      }
      setProducts(finalRows);
      setLoading(false);
    });
  }, [search.q, search.kategori, search.min, search.max, search.sort, categories]);

  type SearchT = z.infer<typeof searchSchema>;
  const setKategori = (slug: string | undefined) =>
    navigate({ to: "/", search: (prev: SearchT) => ({ ...prev, kategori: slug }) });
  const setSort = (sort: "terbaru" | "termurah" | "termahal") =>
    navigate({ to: "/", search: (prev: SearchT) => ({ ...prev, sort }) });
  const applyPrice = () => {
    navigate({
      to: "/",
      search: (prev: SearchT) => ({
        ...prev,
        min: minInput ? Number(minInput) : undefined,
        max: maxInput ? Number(maxInput) : undefined,
      }),
    });
    setShowFilters(false);
  };
  const resetFilters = () => {
    setMinInput("");
    setMaxInput("");
    navigate({ to: "/", search: {} });
  };

  const activeSort = search.sort ?? "terbaru";
  const showHero = useMemo(
    () => !search.q && !search.kategori && search.min === undefined && search.max === undefined,
    [search],
  );
  const hasFilters = !!(
    search.q ||
    search.kategori ||
    search.min !== undefined ||
    search.max !== undefined
  );

  return (
    <div className="min-h-screen bg-[#FDF6E3]">
      {/* SUNTIKAN WARNA DARI LOGO SEKOS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        :root {
          /* Warna Navy (Utama) */
          --primary: 207 38% 28%; 
          --primary-foreground: 0 0% 100%;
          
          /* Warna Orange (Aksen/Tombol) */
          --accent: 30 72% 63%; 
          --accent-foreground: 0 0% 100%;
          
          /* Background Cream */
          --background: 45 60% 98%; 
          --card: 0 0% 100%;
          
          /* Warna Teal untuk elemen sekunder */
          --secondary: 180 15% 52%; 
          --secondary-foreground: 0 0% 100%;
          --muted-foreground: 207 20% 40%;
          --border: 207 20% 88%;
        }
        
        body {
          background-color: #FDF6E3 !important;
          color: #2D4B63 !important;
        }
      `,
        }}
      />

      <SiteHeader />

      {showHero && (
        <>
          {/* HERO */}
          <section className="container mx-auto px-4 pt-6 md:pt-10">
            <div className="grid items-center gap-6 overflow-hidden rounded-3xl border border-[#2D4B63]/20 bg-white p-6 shadow-md md:grid-cols-[1.1fr_1fr] md:gap-10 md:p-12">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6A05D]/20 px-3 py-1 text-xs font-bold text-[#E6A05D]">
                  <Sparkles className="h-3.5 w-3.5" /> Marketplace pelajar #1 di Indonesia
                </span>
                <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] text-[#2D4B63] md:text-5xl lg:text-6xl">
                  Belanja kebutuhan KOS,{" "}
                  <span className="text-[#E6A05D]">lebih hemat & terpercaya.</span>
                </h1>
                <p className="mt-4 max-w-md text-[#2D4B63]/70 md:text-lg">
                  Buku bekas, alat tulis, meja, hingga elektronik — dari ribuan pelajar/mahasiswa.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="bg-[#E6A05D] text-white hover:bg-[#d48f4d] border-none shadow-md"
                  >
                    <Link to="/register">
                      Mulai Belanja <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-[#2D4B63] text-[#2D4B63] hover:bg-[#2D4B63]/10"
                  >
                    <Link to="/sell">Jual Barangmu</Link>
                  </Button>
                </div>
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#2D4B63]/70">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#709797]" /> Penjual terverifikasi
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-[#E6A05D]" /> Cek COD sekitar
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4 text-[#709797]" /> Harga pelajar
                  </span>
                </div>
              </div>
              <div className="relative">
                <img
                  src={heroImg}
                  alt="Keranjang berisi buku, topi wisuda, dan laptop"
                  width={1280}
                  height={960}
                  className="mx-auto w-full max-w-md drop-shadow-2xl"
                />
              </div>
            </div>
          </section>

          {/* CATEGORY CHIPS */}
          <section className="container mx-auto px-4 pt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[#2D4B63] md:text-2xl">
                Jelajahi Kategori
              </h2>
              <Link to="/" className="text-xs font-medium text-[#E6A05D] hover:underline">
                Lihat semua →
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {categories.map((c) => {
                const Icon = CAT_ICONS[c.slug] ?? Package;
                return (
                  <button
                    key={c.id}
                    onClick={() => setKategori(c.slug)}
                    className="group flex flex-col items-center gap-2 rounded-2xl border border-[#2D4B63]/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#E6A05D] hover:shadow-md"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#709797]/10 text-[#709797] transition group-hover:scale-110 group-hover:bg-[#E6A05D] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-center text-xs font-medium text-[#2D4B63]">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* PROMO BANNER */}
          <section className="container mx-auto px-4 pt-8">
            <div className="relative overflow-hidden rounded-3xl border border-[#2D4B63]/10 shadow-sm">
              <img
                src={promoImg}
                alt="Promo musim sekolah baru"
                className="h-44 w-full object-cover md:h-56"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center bg-gradient-to-r from-[#2D4B63] via-[#2D4B63]/70 to-transparent p-6 md:p-10">
                <div className="max-w-md text-white">
                  <span className="inline-block rounded-full bg-[#E6A05D] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Promo
                  </span>
                  <h3 className="mt-2 font-display text-2xl font-bold text-white md:text-3xl">
                    Musim Sekolah Baru
                  </h3>
                  <p className="mt-1 text-sm text-white/80">
                    Diskon hingga 40% untuk buku & alat tulis pilihan.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="mt-3 bg-[#E6A05D] text-white hover:bg-[#d48f4d] border-none"
                  >
                    <Link to="/" search={{ kategori: "buku" }}>
                      Belanja sekarang
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* INFO BAR */}
          <section className="container mx-auto px-4 pt-8">
            <div className="grid gap-3 rounded-2xl border border-[#2D4B63]/10 bg-white p-4 shadow-sm sm:grid-cols-3">
              <Feature icon={ShieldCheck} title="100% Aman" desc="Penjual terverifikasi" />
              <Feature icon={Truck} title="Bertemu Sekitar" desc="COD lebih hemat ongkir" />
              <Feature icon={Headphones} title="Bantuan 24/7" desc="Tim siap menjawab" />
            </div>
          </section>
        </>
      )}

      {/* PRODUCTS + FILTER */}
      <section className="container mx-auto grid gap-6 px-4 py-10 md:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside
          className={`${showFilters ? "fixed inset-0 z-50 overflow-y-auto bg-[#FDF6E3] p-6 md:static md:z-auto md:bg-transparent md:p-0" : "hidden md:block"} space-y-6 rounded-2xl md:border md:border-[#2D4B63]/10 md:bg-white md:p-5 md:shadow-sm md:sticky md:top-24 md:self-start`}
        >
          <div className="flex items-center justify-between md:hidden">
            <h3 className="font-display text-lg font-bold text-[#2D4B63]">Filter</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <h3 className="font-display text-base font-semibold text-[#2D4B63]">Rentang Harga</h3>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                placeholder="Min"
                className="h-9 w-full rounded-lg border border-[#2D4B63]/20 bg-white px-2 text-sm outline-none focus:border-[#E6A05D]"
              />
              <span className="text-[#2D4B63]/50">→</span>
              <input
                type="number"
                min={0}
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                placeholder="Max"
                className="h-9 w-full rounded-lg border border-[#2D4B63]/20 bg-white px-2 text-sm outline-none focus:border-[#E6A05D]"
              />
            </div>
            <Button
              onClick={applyPrice}
              size="sm"
              className="mt-3 w-full bg-[#2D4B63] text-white hover:bg-[#1a2d3c]"
            >
              Terapkan
            </Button>
          </div>

          <div>
            <h3 className="font-display text-base font-semibold text-[#2D4B63]">Kategori</h3>
            <ul className="mt-3 space-y-1.5">
              <li>
                <button
                  onClick={() => setKategori(undefined)}
                  className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition ${!search.kategori ? "bg-[#E6A05D] text-white font-bold" : "hover:bg-[#FDF6E3]"}`}
                >
                  Semua
                </button>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setKategori(c.slug)}
                    className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition ${search.kategori === c.slug ? "bg-[#E6A05D] text-white font-bold" : "hover:bg-[#FDF6E3]"}`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={resetFilters}
            variant="ghost"
            size="sm"
            className="w-full text-[#2D4B63]"
          >
            Reset Filter
          </Button>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#2D4B63] md:text-3xl">
                {search.q
                  ? `Hasil "${search.q}"`
                  : search.kategori
                    ? `Kategori: ${categories.find((c) => c.slug === search.kategori)?.name ?? ""}`
                    : "Produk Pilihan"}
              </h2>
              {!loading && (
                <p className="text-xs text-[#2D4B63]/60">{products.length} produk ditemukan</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#2D4B63]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#2D4B63] md:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filter
              </button>
              <div className="flex items-center gap-1 rounded-full border border-[#2D4B63]/20 bg-white p-1 text-xs">
                {(["terbaru", "termurah", "termahal"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`rounded-full px-3 py-1.5 capitalize transition ${activeSort === s ? "bg-[#2D4B63] text-white" : "text-[#2D4B63]/60 hover:text-[#2D4B63]"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-[#E6A05D] hover:underline"
            >
              <X className="h-3 w-3" /> Hapus semua filter
            </button>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-[#709797]/20" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2D4B63]/30 bg-white p-12 text-center">
              <p className="font-display text-lg font-bold text-[#2D4B63]">
                Belum ada produk yang cocok
              </p>
              <p className="mt-1 text-sm text-[#2D4B63]/70">
                Coba ubah filter, atau jadilah yang pertama menjual!
              </p>
              <Button asChild className="mt-4 bg-[#E6A05D] text-white hover:bg-[#d48f4d]">
                <Link to="/sell">Jual Sekarang</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="mt-10 border-t border-[#2D4B63]/10 bg-[#709797]/10 py-10">
        <div className="container mx-auto grid gap-6 px-4 md:grid-cols-3">
          <div>
            <span className="font-display text-3xl font-black text-[#2D4B63]">
              SE<span className="text-[#E6A05D]">KOS</span>
            </span>
            <p className="mt-2 max-w-xs text-sm text-[#2D4B63]/80">
              Marketplace pelajar terpercaya — beli, jual, dan saling bantu.
            </p>
          </div>
          <div>
            <h4 className="font-display text-sm font-bold text-[#2D4B63]">Belanja</h4>
            <ul className="mt-3 space-y-1.5 text-sm text-[#2D4B63]/70">
              {categories.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setKategori(c.slug)}
                    className="hover:text-[#E6A05D] font-medium"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-bold text-[#2D4B63]">SEKOS</h4>
            <ul className="mt-3 space-y-1.5 text-sm text-[#2D4B63]/70 font-medium">
              <li>
                <Link to="/sell" className="hover:text-[#E6A05D]">
                  Jadi Penjual
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-[#E6A05D]">
                  Profil Saya
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#E6A05D]">
                  Daftar Akun
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto mt-8 border-t border-[#2D4B63]/10 px-4 pt-4 text-center text-xs text-[#2D4B63]/60 font-medium">
          © {new Date().getFullYear()} SEKOS. Dibuat dengan ❤️ untuk pelajar Indonesia.
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#709797]/10 text-[#709797]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-bold text-[#2D4B63]">{title}</p>
        <p className="text-xs text-[#2D4B63]/70">{desc}</p>
      </div>
    </div>
  );
}
