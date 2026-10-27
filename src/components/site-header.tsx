import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBag, PackageSearch, Zap, Store } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { STORE_NAME } from "@/lib/store";

export function SiteHeader() {
  const { count } = useCart();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="bg-ink text-ink-foreground text-xs">
        <div className="container-x flex h-8 items-center justify-between">
          <span>Free island-wide delivery on orders over Rs. 100,000</span>
          <span className="hidden sm:inline">Cash on Delivery · Bank Transfer</span>
        </div>
      </div>
      <div className="container-x flex h-16 items-center gap-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
            <Zap className="size-4" />
          </span>
          {STORE_NAME}
        </Link>
        <form
          className="relative ml-4 hidden flex-1 md:block"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/shop", search: { q: q || undefined } });
          }}
        >
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search TVs, laptops, phones, fridges…"
            className="h-11 w-full rounded-full border border-input bg-card pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        <nav className="ml-auto flex items-center gap-1 text-sm font-medium">
          <Link to="/shop" className="hidden rounded-full px-3 py-2 hover:bg-accent sm:inline-flex items-center gap-1.5">
            <Store className="size-4" /> Shop
          </Link>
          <Link to="/track" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 hover:bg-accent">
            <PackageSearch className="size-4" /> <span className="hidden sm:inline">Track Order</span>
          </Link>
          <Link to="/cart" className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-2 hover:bg-accent" aria-label="Cart">
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-ink text-ink-foreground">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold">{STORE_NAME}</p>
          <p className="mt-2 text-sm opacity-70">
            Electronics, appliances and vehicles — with genuine warranties and live stock from our stores.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Shop</p>
          <ul className="mt-2 space-y-1 opacity-70">
            <li><Link to="/shop">All products</Link></li>
            <li><Link to="/track">Track your order</Link></li>
            <li><Link to="/cart">Cart</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Staff</p>
          <ul className="mt-2 space-y-1 opacity-70">
            <li><Link to="/admin">Admin panel</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
