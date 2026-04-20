import { Link } from "@tanstack/react-router";
import { ShoppingCart, MapPin, ShieldCheck, Heart } from "lucide-react";
import { formatRupiah, GRADE_LABEL } from "@/lib/format";

export interface ProductCardData {
  id: string;
  title: string;
  price: number;
  grade: string;
  image_url: string | null;
  location: string | null;
  seller?: { display_name: string; is_verified: boolean } | null;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  return (
    <Link
      to="/product/$id"
      params={{ id: p.id }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-warm"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary/40">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-cream text-muted-foreground">
            <ShoppingCart className="h-10 w-10 opacity-40" />
          </div>
        )}

        {/* badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {p.seller?.is_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-trust/95 px-2 py-0.5 text-[10px] font-semibold text-trust-foreground shadow-soft backdrop-blur">
              <ShieldCheck className="h-3 w-3" /> Terpercaya
            </span>
          )}
          <span className="inline-flex w-fit items-center rounded-full bg-card/95 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-soft backdrop-blur">
            {GRADE_LABEL[p.grade] ?? p.grade}
          </span>
        </div>

        {/* heart */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); }}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-card/90 text-muted-foreground shadow-soft backdrop-blur transition hover:bg-card hover:text-accent"
          aria-label="Suka"
        >
          <Heart className="h-4 w-4" />
        </button>

        {/* hover overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-primary/85 to-transparent p-3 text-card transition-transform duration-300 group-hover:translate-y-0">
          <span className="text-xs font-medium text-card">Lihat detail →</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{p.title}</h3>
        <p className="font-display text-lg font-bold text-accent">{formatRupiah(p.price)}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
          {p.location ? (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {p.location}
            </span>
          ) : <span />}
          {p.seller?.display_name && (
            <span className="truncate">{p.seller.display_name}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
