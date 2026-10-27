import { PaymentBadge, SlipUploader, StatusTracker, BankDetailsCard } from "@/components/order-bits";
import { formatLKR } from "@/lib/store";
import type { TrackedOrder } from "@/lib/queries";

export function OrderCard({ o, onChange }: { o: TrackedOrder; onChange?: () => void }) {
  const needsSlip = o.payment_method === "bank" && (o.payment_status === "pending" || o.payment_status === "rejected");
  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Order</p>
          <p className="font-display text-xl font-bold">{o.code}</p>
          <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <PaymentBadge status={o.payment_status} />
          <p className="mt-2 font-display text-lg font-bold">{formatLKR(o.total)}</p>
        </div>
      </header>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <StatusTracker status={o.status} />
        <div className="space-y-4">
          <ul className="space-y-1 text-sm">
            {(o.items ?? []).map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3">
                <span>{i.name} × {i.quantity}</span>
                <span className="font-medium">{formatLKR(i.unit_price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          {needsSlip && (
            <>
              <BankDetailsCard />
              <SlipUploader code={o.code} phone={o.phone} onDone={onChange} />
            </>
          )}
          {o.payment_status === "awaiting_verification" && (
            <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning-foreground">Your slip has been received and is waiting for approval by our cashier.</p>
          )}
        </div>
      </div>
    </article>
  );
}
