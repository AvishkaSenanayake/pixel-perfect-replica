import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Banknote, Check, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BankDetailsCard, OrderSummary } from "@/components/order-bits";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatLKR, imageFor } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — VoltHub" },
      { name: "description", content: "Enter delivery details and pay by Cash on Delivery or Bank Transfer." },
      { property: "og:title", content: "Checkout — VoltHub" },
      { property: "og:description", content: "Secure checkout with COD or bank transfer." },
    ],
  }),
  component: Checkout,
});

const deliverySchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^\+?[0-9\s]{9,15}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  address: z.string().trim().min(5, "Enter your delivery address").max(300),
  city: z.string().trim().min(2, "Enter your city").max(80),
  notes: z.string().trim().max(500).optional(),
});
type Delivery = z.infer<typeof deliverySchema>;

const STEPS = ["Delivery", "Payment", "Review"];

function Checkout() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Delivery>({ name: "", phone: "", email: "", address: "", city: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<"cod" | "bank">("cod");
  const [busy, setBusy] = useState(false);

  if (items.length === 0)
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Button asChild variant="hero" size="xl" className="mt-6"><Link to="/shop">Browse products</Link></Button>
      </div>
    );

  const field = (k: keyof Delivery, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...props} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  const nextFromDelivery = () => {
    const r = deliverySchema.safeParse(form);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setStep(1);
  };

  const placeOrder = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("place_order", {
      p_customer: form,
      p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      p_payment_method: method,
    });
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Could not place order");
    clear();
    navigate({ to: "/order/$code", params: { code: data }, search: { phone: form.phone.replace(/\s/g, "") } });
  };

  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <ol className="mt-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn("grid size-8 place-items-center rounded-full text-sm font-bold", i < step ? "bg-success text-success-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn("text-sm font-semibold", i > step && "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-2 h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-border bg-card p-6">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", "Full name")}
              {field("phone", "Phone number", { placeholder: "07X XXX XXXX", inputMode: "tel" })}
              <div className="sm:col-span-2">{field("email", "Email (optional)", { type: "email" })}</div>
              <div className="sm:col-span-2">{field("address", "Delivery address")}</div>
              {field("city", "City")}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Delivery notes (optional)</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button variant="hero" size="xl" className="sm:col-span-2" onClick={nextFromDelivery}>Continue to payment</Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {([
                { id: "cod", icon: Banknote, t: "Cash on Delivery", d: "Pay in cash when your item arrives." },
                { id: "bank", icon: Landmark, t: "Direct Bank Transfer", d: "Transfer to our account and upload your deposit slip." },
              ] as const).map((m) => (
                <button key={m.id} type="button" onClick={() => setMethod(m.id)} className={cn("flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition", method === m.id ? "border-primary bg-accent" : "border-border hover:border-primary/40")}>
                  <m.icon className="mt-0.5 size-5 text-primary" />
                  <div>
                    <p className="font-semibold">{m.t}</p>
                    <p className="text-sm text-muted-foreground">{m.d}</p>
                  </div>
                </button>
              ))}
              {method === "bank" && (
                <>
                  <BankDetailsCard />
                  <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning-foreground">
                    After placing the order you can upload your slip right away, or later from Track Order. Your order stays pending until our team verifies the payment.
                  </p>
                </>
              )}
              <div className="flex gap-3">
                <Button variant="outline" size="xl" onClick={() => setStep(0)}>Back</Button>
                <Button variant="hero" size="xl" className="flex-1" onClick={() => setStep(2)}>Review order</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-bold">Deliver to</h2>
                <p className="mt-1 text-sm text-muted-foreground">{form.name} · {form.phone}<br />{form.address}, {form.city}</p>
              </div>
              <div>
                <h2 className="font-bold">Payment</h2>
                <p className="mt-1 text-sm text-muted-foreground">{method === "cod" ? "Cash on Delivery" : "Direct Bank Transfer"}</p>
              </div>
              <ul className="divide-y divide-border">
                {items.map((i) => (
                  <li key={i.product_id} className="flex items-center gap-3 py-3">
                    <img src={imageFor(i.image)} alt="" className="size-12 rounded-lg object-cover" />
                    <span className="flex-1 text-sm">{i.name} × {i.quantity}</span>
                    <span className="text-sm font-semibold">{formatLKR(i.price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                <Button variant="outline" size="xl" onClick={() => setStep(1)}>Back</Button>
                <Button variant="hero" size="xl" className="flex-1" disabled={busy} onClick={placeOrder}>
                  {busy && <Loader2 className="animate-spin" />} Place order
                </Button>
              </div>
            </div>
          )}
        </div>
        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 font-bold">Order summary</h2>
          <OrderSummary subtotal={subtotal} />
        </aside>
      </div>
    </div>
  );
}
