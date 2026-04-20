import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/cart")({ component: CartPage });

interface CartRow {
  id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
  } | null;
}

function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    refresh();
  }, [user, authLoading]);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("cart_items")
      .select("id, quantity, product:products(id, title, price, image_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as unknown as CartRow[]);
    setLoading(false);
  };

  const changeQty = async (rowId: string, qty: number) => {
    if (qty < 1) return;
    await supabase.from("cart_items").update({ quantity: qty }).eq("id", rowId);
    refresh();
  };
  const remove = async (rowId: string) => {
    await supabase.from("cart_items").delete().eq("id", rowId);
    toast.success("Dihapus dari keranjang");
    refresh();
  };

  const total = items.reduce((s, i) => s + (i.product?.price ?? 0) * i.quantity, 0);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-primary">Keranjang Saya</h1>

        {loading ? (
          <div className="mt-6 h-40 animate-pulse rounded-2xl bg-secondary/60" />
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 font-display text-lg text-primary">Keranjang kamu masih kosong</p>
            <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/">Mulai Belanja</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {items.map((row) => (
                <div key={row.id} className="flex gap-4 rounded-2xl border border-border bg-card p-3 shadow-soft">
                  <Link to="/product/$id" params={{ id: row.product?.id ?? "" }} className="shrink-0">
                    {row.product?.image_url ? (
                      <img src={row.product.image_url} alt={row.product.title} className="h-24 w-24 rounded-lg object-cover" />
                    ) : (
                      <div className="h-24 w-24 rounded-lg bg-gradient-cream" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <Link to="/product/$id" params={{ id: row.product?.id ?? "" }}
                      className="line-clamp-2 font-medium text-foreground hover:text-accent">
                      {row.product?.title}
                    </Link>
                    <p className="mt-1 font-display text-lg font-bold text-accent">
                      {formatRupiah(row.product?.price ?? 0)}
                    </p>
                    <div className="mt-auto flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-full border border-border">
                        <button onClick={() => changeQty(row.id, row.quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{row.quantity}</span>
                        <button onClick={() => changeQty(row.id, row.quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => remove(row.id)} className="ml-auto rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-soft md:sticky md:top-24 md:self-start">
              <h3 className="font-display text-lg font-semibold text-primary">Ringkasan</h3>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Item ({items.length})</span>
                <span>{formatRupiah(total)}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-display text-2xl font-bold text-accent">{formatRupiah(total)}</span>
                </div>
              </div>
              <Button className="h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-warm" onClick={() => toast.info("Pembayaran akan tersedia di iterasi berikutnya")}>
                Lanjut ke Pembayaran
              </Button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
