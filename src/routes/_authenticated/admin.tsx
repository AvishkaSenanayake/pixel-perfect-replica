import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, LogOut, XCircle, ClipboardCheck, Package, Boxes } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentBadge } from "@/components/order-bits";
import { supabase } from "@/integrations/supabase/client";
import { ORDER_STAGES, formatLKR } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — VoltHub" },
      { name: "description", content: "Verify bank slips, manage web orders and inventory." },
      { property: "og:title", content: "Admin — VoltHub" },
      { property: "og:description", content: "Manage web orders and inventory." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const ordersQuery = {
  queryKey: ["admin-orders"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
};
type AdminOrder = Awaited<ReturnType<typeof ordersQuery.queryFn>>[number];

function Admin() {
  const qc = useQueryClient();
  const role = useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role");
      return data?.[0]?.role ?? null;
    },
  });
  const orders = useQuery({ ...ordersQuery, enabled: !!role.data, refetchInterval: 20000 });
  const products = useQuery({
    queryKey: ["admin-products"],
    enabled: !!role.data,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("category");
      if (error) throw error;
      return data;
    },
  });
  const [open, setOpen] = useState<AdminOrder | null>(null);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (role.isLoading) return <div className="container-x py-20 text-center"><Loader2 className="mx-auto animate-spin" /></div>;
  if (!role.data)
    return (
      <div className="container-x py-20 text-center">
        <h1 className="text-2xl font-bold">No staff access</h1>
        <p className="mt-2 text-muted-foreground">Your account isn't a staff account yet. Ask the shop owner to grant access.</p>
        <Button variant="outline" className="mt-6" onClick={signOut}><LogOut /> Sign out</Button>
      </div>
    );

  const all = orders.data ?? [];
  const queue = all.filter((o) => o.payment_status === "awaiting_verification");
  const codPending = all.filter((o) => o.payment_method === "cod" && o.status === 1);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Store admin</h1>
          <p className="text-sm text-muted-foreground">Signed in as {role.data === "admin" ? "Owner" : "Cashier"}</p>
        </div>
        <Button variant="outline" onClick={signOut}><LogOut /> Sign out</Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Slips awaiting approval" value={queue.length} tone="warning" />
        <Stat label="COD orders to confirm" value={codPending.length} tone="secondary" />
        <Stat label="Active orders" value={all.filter((o) => o.status < 5).length} tone="success" />
      </div>

      <Tabs defaultValue="queue" className="mt-8">
        <TabsList>
          <TabsTrigger value="queue"><ClipboardCheck className="size-4" /> Verification queue</TabsTrigger>
          <TabsTrigger value="orders"><Package className="size-4" /> All orders</TabsTrigger>
          <TabsTrigger value="stock"><Boxes className="size-4" /> Inventory</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="mt-4">
          <OrderTable rows={[...queue, ...codPending]} onOpen={setOpen} empty="Nothing waiting for verification." />
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <OrderTable rows={all} onOpen={setOpen} empty="No orders yet." />
        </TabsContent>
        <TabsContent value="stock" className="mt-4">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left"><tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Location</th><th className="p-3">Price</th><th className="p-3">Stock</th></tr></thead>
              <tbody>
                {(products.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.category}</td>
                    <td className="p-3">{p.store_location}</td>
                    <td className="p-3">{formatLKR(p.price)}</td>
                    <td className="p-3"><Badge variant={p.stock === 0 ? "destructive" : p.stock <= 3 ? "warning" : "success"}>{p.stock}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <OrderDialog order={open ? all.find((o) => o.id === open.id) ?? open : null} onClose={() => setOpen(null)} onChanged={refresh} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "warning" | "success" | "secondary" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-2"><span className="font-display text-3xl font-bold">{value}</span><Badge variant={tone}>{tone === "warning" ? "Pending" : tone === "success" ? "Live" : "To do"}</Badge></div>
    </div>
  );
}

function OrderTable({ rows, onOpen, empty }: { rows: AdminOrder[]; onOpen: (o: AdminOrder) => void; empty: string }) {
  if (rows.length === 0) return <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left"><tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Stage</th><th className="p-3" /></tr></thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-t border-border">
              <td className="p-3"><p className="font-semibold">{o.code}</p><p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p></td>
              <td className="p-3"><p>{o.customer_name}</p><p className="text-xs text-muted-foreground">{o.phone} · {o.city}</p></td>
              <td className="p-3 font-semibold">{formatLKR(o.total)}</td>
              <td className="p-3"><PaymentBadge status={o.payment_status} /></td>
              <td className="p-3 text-xs">{o.status}. {ORDER_STAGES[o.status - 1]}</td>
              <td className="p-3"><Button size="sm" variant="outline" onClick={() => onOpen(o)}>Manage</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderDialog({ order, onClose, onChanged }: { order: AdminOrder | null; onClose: () => void; onChanged: () => void }) {
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serials, setSerials] = useState<Record<string, string>>({});

  useEffect(() => {
    setSlipUrl(null);
    if (!order) return;
    setSerials(Object.fromEntries(order.order_items.map((i) => [i.id, i.serial_numbers ?? ""])));
    if (order.slip_path)
      supabase.storage.from("slips").createSignedUrl(order.slip_path, 600).then(({ data }) => setSlipUrl(data?.signedUrl ?? null));
  }, [order?.id, order?.slip_path]);

  if (!order) return null;

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, msg: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(msg);
    onChanged();
  };

  const canConfirm = order.status === 1 && (order.payment_method === "cod" || order.payment_status === "awaiting_verification");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Order {order.code}</DialogTitle></DialogHeader>
        <div className="grid gap-6 text-sm">
          <div className="grid gap-1">
            <p className="font-semibold">{order.customer_name} · {order.phone}</p>
            <p className="text-muted-foreground">{order.address}, {order.city}</p>
            {order.notes && <p className="text-muted-foreground">Note: {order.notes}</p>}
            <div className="mt-2 flex items-center gap-2"><PaymentBadge status={order.payment_status} />{order.stock_deducted && <Badge variant="success">Stock deducted</Badge>}</div>
          </div>

          {order.payment_method === "bank" && (
            <div className="rounded-xl border border-border p-4">
              <p className="mb-2 font-semibold">Deposit slip</p>
              {!order.slip_path ? (
                <p className="text-muted-foreground">Customer hasn't uploaded a slip yet.</p>
              ) : slipUrl ? (
                order.slip_path.toLowerCase().endsWith(".pdf") ? (
                  <a href={slipUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">Open PDF slip <ExternalLink className="size-3.5" /></a>
                ) : (
                  <a href={slipUrl} target="_blank" rel="noreferrer"><img src={slipUrl} alt="Deposit slip" className="max-h-80 rounded-lg border border-border" /></a>
                )
              ) : (
                <Loader2 className="animate-spin" />
              )}
              <p className="mt-2 text-muted-foreground">Expected amount: <strong className="text-foreground">{formatLKR(order.total)}</strong></p>
            </div>
          )}

          {canConfirm && (
            <div className="flex flex-wrap gap-2">
              <Button variant="success" disabled={busy} onClick={() => run(() => supabase.rpc("confirm_order", { p_order: order.id }), "Order confirmed & stock deducted")}>
                <CheckCircle2 /> {order.payment_method === "bank" ? "Approve slip & confirm" : "Confirm order"}
              </Button>
              {order.payment_method === "bank" && (
                <Button variant="destructive" disabled={busy} onClick={() => run(() => supabase.rpc("reject_slip", { p_order: order.id }), "Slip rejected")}>
                  <XCircle /> Reject slip
                </Button>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 font-semibold">Items & serial / IMEI numbers</p>
            <div className="space-y-3">
              {order.order_items.map((i) => (
                <div key={i.id} className="rounded-xl border border-border p-3">
                  <div className="flex justify-between"><span>{i.product_name} × {i.quantity}</span><span className="font-semibold">{formatLKR(Number(i.unit_price) * i.quantity)}</span></div>
                  <div className="mt-2 flex gap-2">
                    <Input placeholder="Serial / IMEI (comma separated)" value={serials[i.id] ?? ""} onChange={(e) => setSerials({ ...serials, [i.id]: e.target.value })} />
                    <Button variant="outline" disabled={busy} onClick={() => run(() => supabase.from("order_items").update({ serial_numbers: serials[i.id] || null }).eq("id", i.id), "Serial saved")}>Save</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 font-semibold">Order stage</p>
            <div className="grid gap-2">
              {ORDER_STAGES.map((s, idx) => {
                const step = idx + 1;
                const locked = !order.stock_deducted && step > 1;
                return (
                  <Button
                    key={s}
                    variant={order.status === step ? "default" : "outline"}
                    className="justify-start"
                    disabled={busy || locked || order.status === step}
                    onClick={() => run(() => supabase.from("orders").update({ status: step, updated_at: new Date().toISOString() }).eq("id", order.id), "Stage updated")}
                  >
                    {step}. {s}
                  </Button>
                );
              })}
              {!order.stock_deducted && <p className="text-xs text-muted-foreground">Confirm the order first to move it past stage 1.</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
