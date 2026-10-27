import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StockStatus } from "@/components/product-card";
import { formatLKR, imageFor } from "@/lib/store";
import { productQuery } from "@/lib/queries";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({
    meta: [
      { title: "Product details — VoltHub" },
      { name: "description", content: "Specifications, warranty, price and live store stock." },
      { property: "og:title", content: "Product details — VoltHub" },
      { property: "og:description", content: "Specifications, warranty, price and live store stock." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: p, isLoading } = useQuery(productQuery(slug));
  const [qty, setQty] = useState(1);
  const [view, setView] = useState(0);
  const cart = useCart();
  const navigate = useNavigate();

  if (isLoading) return <div className="container-x grid gap-10 py-10 lg:grid-cols-2"><Skeleton className="aspect-square rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>;
  if (!p) return <div className="container-x py-24 text-center"><h1 className="text-2xl font-bold">Product not found</h1><Link to="/shop" className="mt-4 inline-block text-primary">Back to shop</Link></div>;

  const img = imageFor(p.image);
  const gallery = [
    "object-cover",
    "object-cover scale-150 origin-top-left",
    "object-cover scale-150 origin-bottom-right",
  ];
  const specs = Object.entries((p.specs ?? {}) as Record<string, string>);
  const addItem = () => {
    cart.add({ product_id: p.id, slug: p.slug, name: p.name, price: Number(p.price), image: p.image, stock: p.stock }, qty);
    toast.success("Added to cart");
  };

  return (
    <div className="container-x py-10">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/shop">Shop</Link> / <Link to="/shop" search={{ category: p.category }}>{p.category}</Link> / <span className="text-foreground">{p.name}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-muted">
            <img src={img} alt={p.name} width={816} height={816} className={cn("size-full transition-transform duration-500", gallery[view])} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {gallery.map((g, i) => (
              <button key={i} onClick={() => setView(i)} className={cn("aspect-square overflow-hidden rounded-xl border-2 bg-muted", view === i ? "border-primary" : "border-transparent")}>
                <img src={img} alt="" loading="lazy" className={cn("size-full", g)} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{p.brand}</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{p.name}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold">{formatLKR(p.price)}</span>
            {p.old_price && <span className="text-lg text-muted-foreground line-through">{formatLKR(p.old_price)}</span>}
          </div>
          <div className="mt-4"><StockStatus stock={p.stock} location={p.store_location} /></div>
          <p className="mt-6 text-muted-foreground">{p.description}</p>

          {p.stock > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-full border border-border bg-card">
                <button className="p-3" aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="size-4" /></button>
                <span className="w-8 text-center font-semibold">{qty}</span>
                <button className="p-3" aria-label="Increase" onClick={() => setQty((q) => Math.min(p.stock, q + 1))}><Plus className="size-4" /></button>
              </div>
              <Button variant="hero" size="xl" onClick={addItem}><ShoppingBag /> Add to cart</Button>
              <Button variant="ink" size="xl" onClick={() => { addItem(); navigate({ to: "/checkout" }); }}>Buy now</Button>
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-success-soft p-4 text-sm"><ShieldCheck className="size-5 text-success" /><span className="font-semibold">{p.warranty}</span></div>
            <div className="flex items-center gap-3 rounded-xl bg-secondary p-4 text-sm"><Truck className="size-5 text-primary" /><span className="font-semibold">Delivery island-wide</span></div>
          </div>

          <h2 className="mt-10 text-lg font-bold">Specifications</h2>
          <dl className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
