import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES } from "@/lib/store";
import { productsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  sort: z.enum(["featured", "price-asc", "price-desc"]).optional(),
  instock: z.boolean().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Shop all products — VoltHub" },
      { name: "description", content: "Browse TVs, laptops, mobile phones, refrigerators, rice cookers and three-wheelers with live stock." },
      { property: "og:title", content: "Shop all products — VoltHub" },
      { property: "og:description", content: "Filter by category, price and in-stock items." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const { data, isLoading } = useQuery(productsQuery());
  const set = (patch: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ search: (s) => ({ ...s, ...patch }), replace: true });

  let list = data ?? [];
  if (search.category) list = list.filter((p) => p.category === search.category);
  if (search.instock) list = list.filter((p) => p.stock > 0);
  if (search.q) {
    const q = search.q.toLowerCase();
    list = list.filter((p) => `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q));
  }
  if (search.sort === "price-asc") list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
  if (search.sort === "price-desc") list = [...list].sort((a, b) => Number(b.price) - Number(a.price));

  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">{search.category ?? "All products"}</h1>
      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            defaultValue={search.q}
            onChange={(e) => set({ q: e.target.value || undefined })}
            placeholder="Search products or brands"
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={search.sort ?? "featured"}
          onChange={(e) => set({ sort: e.target.value as "featured" })}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={!!search.instock} onChange={(e) => set({ instock: e.target.checked || undefined })} className="size-4 accent-primary" />
          In stock only
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[undefined, ...CATEGORIES.map((c) => c.name)].map((c) => (
          <button
            key={c ?? "all"}
            onClick={() => set({ category: c })}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              search.category === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent",
            )}
          >
            {c ?? "All"}
          </button>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)
          : list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {!isLoading && list.length === 0 && <p className="py-20 text-center text-muted-foreground">No products match your filters.</p>}
    </div>
  );
}
