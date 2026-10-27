import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Truck, Landmark, PackageSearch } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES, imageFor } from "@/lib/store";
import { productsQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VoltHub — TVs, Laptops, Phones, Fridges & Three-Wheelers" },
      { name: "description", content: "Shop genuine electronics and appliances with live store stock, Cash on Delivery or Bank Transfer, and real-time order tracking." },
      { property: "og:title", content: "VoltHub — Electronics & Appliances" },
      { property: "og:description", content: "Live store stock, COD or bank transfer, and real-time order tracking." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data, isLoading } = useQuery(productsQuery());
  const featured = (data ?? []).filter((p) => p.featured).slice(0, 8);

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <img src={hero} alt="TV, laptop, phone and refrigerator on display" width={1600} height={800} className="absolute inset-0 size-full object-cover object-right" />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="container-x relative py-20 sm:py-28">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <span className="size-2 rounded-full bg-success" /> Live stock from our stores
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              Big brands. <br /> Honest prices.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              TVs, laptops, phones, fridges, kitchen appliances and three-wheelers — with genuine warranty and delivery to your door.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/shop">Shop now <ArrowRight /></Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="rounded-full">
                <Link to="/track"><PackageSearch /> Track order</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x grid gap-4 py-10 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, t: "Genuine warranty", d: "Every item ships with company warranty" },
          { icon: Truck, t: "Island-wide delivery", d: "Free on orders over Rs. 100,000" },
          { icon: Landmark, t: "COD or bank transfer", d: "Upload your slip, we verify fast" },
        ].map((f) => (
          <div key={f.t} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary"><f.icon className="size-5" /></span>
            <div>
              <p className="font-semibold">{f.t}</p>
              <p className="text-sm text-muted-foreground">{f.d}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="container-x py-10">
        <h2 className="text-2xl font-bold sm:text-3xl">Top categories</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <Link key={c.name} to="/shop" search={{ category: c.name }} className="group overflow-hidden rounded-2xl border border-border bg-card text-center transition hover:shadow-elegant">
              <div className="aspect-square overflow-hidden bg-muted">
                <img src={imageFor(c.image)} alt={c.name} loading="lazy" width={816} height={816} className="size-full object-cover transition duration-500 group-hover:scale-110" />
              </div>
              <p className="p-3 text-sm font-semibold">{c.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x py-6">
        <div className="relative overflow-hidden rounded-3xl bg-ink p-8 text-ink-foreground sm:p-12">
          <div className="absolute -right-20 -top-20 size-72 rounded-full bg-gradient-primary opacity-40 blur-3xl" />
          <p className="relative text-sm font-semibold uppercase tracking-widest text-primary-glow">Season sale</p>
          <h2 className="relative mt-2 max-w-lg text-3xl font-bold sm:text-4xl">Up to 15% off refrigerators & TVs</h2>
          <Button asChild variant="hero" size="xl" className="relative mt-6">
            <Link to="/shop" search={{ category: "Refrigerators" }}>See deals <ArrowRight /></Link>
          </Button>
        </div>
      </section>

      <section className="container-x py-10">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold sm:text-3xl">Featured products</h2>
          <Link to="/shop" className="text-sm font-semibold text-primary">View all →</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)
            : featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>
    </>
  );
}
