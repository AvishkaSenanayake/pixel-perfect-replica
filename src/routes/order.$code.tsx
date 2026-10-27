import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { PartyPopper } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderCard } from "@/components/order-card";
import { trackOrders } from "@/lib/queries";

export const Route = createFileRoute("/order/$code")({
  validateSearch: z.object({ phone: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Order placed — VoltHub" },
      { name: "description", content: "Your order confirmation and live status." },
      { property: "og:title", content: "Order placed — VoltHub" },
      { property: "og:description", content: "Your order confirmation and live status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { code } = Route.useParams();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["order", code],
    queryFn: () => trackOrders(code),
    refetchInterval: 15000,
  });
  const order = data?.[0];

  return (
    <div className="container-x max-w-4xl py-10">
      <div className="mb-8 rounded-2xl bg-success-soft p-6 text-center">
        <PartyPopper className="mx-auto size-8 text-success" />
        <h1 className="mt-2 text-2xl font-bold">Thank you! Your order is placed.</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save your order ID <strong className="text-foreground">{code}</strong> — track it anytime from{" "}
          <Link to="/track" className="font-semibold text-primary">Track Order</Link> using this ID or your phone number.
        </p>
      </div>
      {isLoading ? <Skeleton className="h-96 rounded-2xl" /> : order ? <OrderCard o={order} onChange={() => refetch()} /> : <p className="text-center text-muted-foreground">Order not found.</p>}
    </div>
  );
}
