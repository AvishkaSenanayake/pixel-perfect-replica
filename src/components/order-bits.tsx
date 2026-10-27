import { useRef, useState } from "react";
import { Check, Landmark, Upload, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BANK_DETAILS, ORDER_STAGES, PAYMENT_LABELS, deliveryFeeFor, formatLKR } from "@/lib/store";
import { uploadSlip } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function PaymentBadge({ status }: { status: string }) {
  const p = PAYMENT_LABELS[status] ?? { label: status, tone: "secondary" as const };
  return <Badge variant={p.tone}>{p.label}</Badge>;
}

export function StatusTracker({ status }: { status: number }) {
  return (
    <ol className="relative space-y-0">
      {ORDER_STAGES.map((label, i) => {
        const step = i + 1;
        const done = step < status || status === 5;
        const current = step === status && status !== 5;
        return (
          <li key={label} className="flex gap-4 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold",
                  done && "border-success bg-success text-success-foreground",
                  current && "border-primary bg-accent text-primary animate-pulse",
                  !done && !current && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : step}
              </span>
              {step < 5 && <span className={cn("mt-1 w-0.5 flex-1", done ? "bg-success" : "bg-border")} />}
            </div>
            <div className="pt-1">
              <p className={cn("text-sm font-semibold", !done && !current && "text-muted-foreground")}>{label}</p>
              {current && <p className="text-xs text-primary">Current stage</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function BankDetailsCard() {
  const rows = [
    ["Bank", BANK_DETAILS.bankName],
    ["Branch", BANK_DETAILS.branch],
    ["Account No.", BANK_DETAILS.accountNumber],
    ["Account Name", BANK_DETAILS.accountName],
  ];
  return (
    <div className="rounded-xl border border-border bg-secondary p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Landmark className="size-4 text-primary" /> Transfer to this account
      </p>
      <dl className="grid gap-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="flex items-center gap-2 font-semibold">
              {v}
              {k === "Account No." && (
                <button
                  type="button"
                  aria-label="Copy account number"
                  onClick={() => {
                    navigator.clipboard.writeText(v.replace(/\s/g, ""));
                    toast.success("Account number copied");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="size-3.5" />
                </button>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function SlipUploader({
  code,
  phone,
  onDone,
}: {
  code: string;
  phone: string;
  onDone?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handle(file?: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("File must be under 10MB");
    setBusy(true);
    try {
      await uploadSlip(code, phone, file);
      setDone(true);
      toast.success("Slip uploaded — we'll verify it shortly");
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-border p-5 text-center">
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {done ? (
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-success">
          <Check className="size-4" /> Slip received — awaiting verification
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Upload a photo or PDF of your deposit slip / transfer receipt</p>
          <Button type="button" variant="outline" className="mt-3" disabled={busy} onClick={() => ref.current?.click()}>
            {busy ? <Loader2 className="animate-spin" /> : <Upload />} {busy ? "Uploading…" : "Choose file"}
          </Button>
        </>
      )}
    </div>
  );
}

export function OrderSummary({ subtotal }: { subtotal: number }) {
  const fee = deliveryFeeFor(subtotal);
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold">{formatLKR(subtotal)}</dd></div>
      <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd className="font-semibold">{fee === 0 ? <span className="text-success">Free</span> : formatLKR(fee)}</dd></div>
      <div className="flex justify-between border-t border-border pt-3 text-base"><dt className="font-bold">Total</dt><dd className="font-display text-xl font-bold">{formatLKR(subtotal + fee)}</dd></div>
    </dl>
  );
}

