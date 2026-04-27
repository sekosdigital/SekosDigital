import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { formatRupiah, GRADE_LABEL } from "@/lib/format";
import { toast } from "sonner";
import {
  ShieldCheck,
  MapPin,
  MessageCircle,
  ShoppingCart,
  ArrowLeft,
  ShoppingBag,
} from "lucide-react";

export const Route = createFileRoute("/product/$id")({ component: ProductDetail });

interface ProductFull {
  id: string;
  title: string;
  description: string | null;
  price: number;
  grade: string;
  image_url: string | null;
  location: string | null;
  seller_id: string;
  seller: {
    id: string;
    display_name: string;
    username: string;
    is_verified: boolean;
    rating: number;
    avatar_url: string | null;
  } | null;
  category: { name: string } | null;
}

function ProductDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("products")
      .select(
        "id, title, description, price, grade, image_url, location, seller_id, seller:profiles!products_seller_id_fkey(id, display_name, username, is_verified, rating, avatar_url), category:categories(name)",
      )
      .eq("id", id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        // #region agent log
        fetch("http://127.0.0.1:7410/ingest/1bad6591-db48-487e-a518-f50e865918d8", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "186559" },
          body: JSON.stringify({
            sessionId: "186559",
            runId: "visibility-debug",
            hypothesisId: "V3",
            location: "src/routes/product.$id.tsx:41",
            message: "product detail query resolved",
            data: {
              attempt: "primary",
              requestedId: id,
              hasError: Boolean(error),
              errorCode: error?.code ?? null,
              errorMessage: error?.message ?? null,
              hasData: Boolean(data),
              dataId: data?.id ?? null,
              dataTitle: data?.title ?? null,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        let finalData = data as unknown as ProductFull | null;
        if (
          error?.code === "PGRST200" &&
          error.message.includes("between 'products' and 'profiles'")
        ) {
          const fallback = await supabase
            .from("products")
            .select("id, title:name, description, price, image_url")
            .eq("id", id)
            .maybeSingle();
          // #region agent log
          fetch("http://127.0.0.1:7410/ingest/1bad6591-db48-487e-a518-f50e865918d8", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "186559" },
            body: JSON.stringify({
              sessionId: "186559",
              runId: "visibility-debug",
              hypothesisId: "V4",
              location: "src/routes/product.$id.tsx:50",
              message: "product detail fallback query resolved",
              data: {
                attempt: "fallback-no-relations",
                requestedId: id,
                hasError: Boolean(fallback.error),
                errorCode: fallback.error?.code ?? null,
                errorMessage: fallback.error?.message ?? null,
                hasData: Boolean(fallback.data),
                dataId: fallback.data?.id ?? null,
                dataTitle: (fallback.data as { title?: string } | null)?.title ?? null,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          finalData = fallback.data
            ? {
                id: fallback.data.id,
                title: (fallback.data as { title?: string }).title ?? "Produk",
                description: (fallback.data as { description?: string | null }).description ?? null,
                price: (fallback.data as { price?: number }).price ?? 0,
                grade: "bekas_baik",
                image_url: (fallback.data as { image_url?: string | null }).image_url ?? null,
                location: null,
                seller_id: "",
                seller: null,
                category: null,
              }
            : null;
        }
        setProduct(finalData);
        setLoading(false);
      });
  }, [id]);

  const addToCart = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!product) return;
    if (product.seller_id === user.id) {
      toast.error("Tidak bisa membeli produk sendiri");
      return;
    }
    setAdding(true);
    const { error } = await supabase
      .from("cart_items")
      .upsert(
        { user_id: user.id, product_id: product.id, quantity: 1 },
        { onConflict: "user_id,product_id" },
      );
    // #region agent log
    fetch("http://127.0.0.1:7410/ingest/1bad6591-db48-487e-a518-f50e865918d8", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "186559" },
      body: JSON.stringify({
        sessionId: "186559",
        runId: "cart-debug",
        hypothesisId: "K1",
        location: "src/routes/product.$id.tsx:82",
        message: "add to cart upsert resolved",
        data: {
          productId: product.id,
          hasError: Boolean(error),
          errorCode: error?.code ?? null,
          errorMessage: error?.message ?? null,
          errorDetails: error?.details ?? null,
          errorHint: error?.hint ?? null,
          targetTable: "cart_items",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    let finalError = error;
    if (error?.code === "PGRST205" && error.message.includes("public.cart_items")) {
      const fallback = await supabase
        .from("chart_items")
        .upsert({ user_id: user.id, product_id: product.id, quantity: 1 } as never, {
          onConflict: "user_id,product_id",
        });
      finalError = fallback.error;
      // #region agent log
      fetch("http://127.0.0.1:7410/ingest/1bad6591-db48-487e-a518-f50e865918d8", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "186559" },
        body: JSON.stringify({
          sessionId: "186559",
          runId: "cart-debug",
          hypothesisId: "K4",
          location: "src/routes/product.$id.tsx:90",
          message: "add to cart fallback upsert resolved",
          data: {
            productId: product.id,
            hasError: Boolean(fallback.error),
            errorCode: fallback.error?.code ?? null,
            errorMessage: fallback.error?.message ?? null,
            targetTable: "chart_items",
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    }
    setAdding(false);
    if (finalError) {
      toast.error(finalError.message);
      return;
    }
    toast.success("Ditambahkan ke keranjang!");
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto p-8">
          <div className="h-96 animate-pulse rounded-2xl bg-secondary/60" />
        </div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto p-12 text-center">
          <p className="font-display text-2xl text-primary">Produk tidak ditemukan</p>
          <Button asChild className="mt-4">
            <Link to="/">Kembali</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-gradient-cream text-muted-foreground">
                <ShoppingCart className="h-20 w-20 opacity-30" />
              </div>
            )}
          </div>

          <div className="space-y-5">
            {product.category && (
              <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {product.category.name}
              </span>
            )}
            <h1 className="font-display text-3xl font-bold text-primary md:text-4xl">
              {product.title}
            </h1>
            <p className="font-display text-3xl font-bold text-accent">
              {formatRupiah(product.price)}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-warm/30 px-3 py-1 font-medium text-warm-foreground">
                {GRADE_LABEL[product.grade]}
              </span>
              {product.location && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {product.location}
                </span>
              )}
            </div>

            {product.description && (
              <div>
                <h3 className="font-display text-base font-semibold text-primary">Deskripsi</h3>
                <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">
                  {product.description}
                </p>
              </div>
            )}

            {product.seller && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-warm font-display text-lg font-bold text-accent-foreground">
                    {product.seller.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{product.seller.display_name}</p>
                      {product.seller.is_verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-trust px-2 py-0.5 text-[10px] font-medium text-trust-foreground">
                          <ShieldCheck className="h-3 w-3" /> Terpercaya
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">@{product.seller.username}</p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    <MessageCircle className="h-4 w-4" /> Chat
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                onClick={addToCart}
                disabled={adding}
                size="lg"
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 shadow-warm"
              >
                <ShoppingBag className="h-5 w-5" /> {adding ? "Menambah…" : "Tambah ke Keranjang"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
