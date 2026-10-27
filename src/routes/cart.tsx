import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatLKR, imageFor } from "@/lib/store";
import { OrderSummary } from "@/components/order-bits";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — VoltHub" },
      { name: "description", content: "Review items in your cart before checkout." },
      { property: "og:title", content: "Your cart — VoltHub" },
      { property: "og:description", content: "Review items in your cart before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal } = useCart();

  if (items.length === 0)
    return (
      <div className="container-x py-24 text-center">
        <ShoppingBag className="mx-auto size-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <Button asChild variant="hero" size="xl" className="mt-6"><Link to="/shop">Start shopping</Link></Button>
      </div>
    );

  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">Your cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.product_id} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
              <img src={imageFor(i.image)} alt={i.name} className="size-24 rounded-xl object-cover" />
              <div className="flex flex-1 flex-col">
                <Link to="/product/$slug" params={{ slug: i.slug }} className="font-semibold">{i.name}</Link>
                <p className="text-sm text-muted-foreground">{formatLKR(i.price)} each</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-full border border-border">
                    <button className="p-2" aria-label="Decrease" onClick={() => setQty(i.product_id, i.quantity - 1)}><Minus className="size-3.5" /></button>
                    <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                    <button className="p-2" aria-label="Increase" onClick={() => setQty(i.product_id, i.quantity + 1)}><Plus className="size-3.5" /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{formatLKR(i.price * i.quantity)}</span>
                    <button aria-label="Remove" onClick={() => remove(i.product_id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 font-bold">Order summary</h2>
          <OrderSummary subtotal={subtotal} />
          <Button asChild variant="hero" size="xl" className="mt-6 w-full"><Link to="/checkout">Proceed to checkout</Link></Button>
        </aside>
      </div>
    </div>
  );
}
