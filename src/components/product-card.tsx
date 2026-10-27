import { Link } from "@tanstack/react-router";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { formatLKR, imageFor, type Product } from "@/lib/store";

export function StockStatus({ stock, location }: { stock: number; location: string }) {
  if (stock <= 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive">
        <XCircle className="size-4" /> Out of stock
      </span>
    );
  if (stock <= 3)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warning-foreground">
        <AlertCircle className="size-4 text-warning" /> Only {stock} left at {location}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
      <CheckCircle2 className="size-4" /> In Stock at {location}
    </span>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const off = p.old_price ? Math.round((1 - Number(p.price) / Number(p.old_price)) * 100) : 0;
  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-elegant"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={imageFor(p.image)}
          alt={p.name}
          loading="lazy"
          width={816}
          height={816}
          className="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        {off > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
            -{off}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.brand} · {p.category}</p>
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">{p.name}</h3>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-display text-lg font-bold">{formatLKR(p.price)}</span>
          {p.old_price && <span className="text-sm text-muted-foreground line-through">{formatLKR(p.old_price)}</span>}
        </div>
        <StockStatus stock={p.stock} location={p.store_location} />
      </div>
    </Link>
  );
}
