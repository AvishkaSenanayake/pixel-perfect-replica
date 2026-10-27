import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { PackageSearch, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderCard } from "@/components/order-card";
import { trackOrders } from "@/lib/queries";

export const Route = createFileRoute("/track")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Track your order — VoltHub" },
      { name: "description", content: "Track active and past orders with your phone number or order ID." },
      { property: "og:title", content: "Track your order — VoltHub" },
      { property: "og:description", content: "Live order status from placement to delivery." },
    ],
  }),
  component: Track,
});

function Track() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/track" });
  const [value, setValue] = useState(q ?? "");
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["track", q],
    queryFn: () => trackOrders(q!),
    enabled: !!q,
    refetchInterval: 15000,
  });

  const active = (data ?? []).filter((o) => o.status < 5);
  const past = (data ?? []).filter((o) => o.status === 5);

  return (
    <div className="container-x max-w-4xl py-10">
      <div className="text-center">
        <PackageSearch className="mx-auto size-10 text-primary" />
        <h1 className="mt-3 text-3xl font-bold">Track your orders</h1>
        <p className="mt-2 text-muted-foreground">Enter your phone number or order ID (e.g. ORD-1A2B3C)</p>
      </div>
      <form
        className="mx-auto mt-6 flex max-w-lg gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ search: { q: value.trim() || undefined } });
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="07X XXX XXXX or ORD-XXXXXX" className="h-12 w-full rounded-full border border-input bg-card pl-11 pr-4 outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <Button variant="hero" size="xl" type="submit">Track</Button>
      </form>

      <div className="mt-10 space-y-6">
        {isFetching && !data && <Skeleton className="h-80 rounded-2xl" />}
        {q && data && data.length === 0 && <p className="text-center text-muted-foreground">No orders found for “{q}”.</p>}
        {active.length > 0 && <h2 className="text-lg font-bold">Active orders</h2>}
        {active.map((o) => <OrderCard key={o.code} o={o} onChange={() => refetch()} />)}
        {past.length > 0 && <h2 className="pt-4 text-lg font-bold">Past orders</h2>}
        {past.map((o) => <OrderCard key={o.code} o={o} />)}
      </div>
    </div>
  );
}
