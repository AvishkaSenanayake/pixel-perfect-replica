import tv from "@/assets/p-tv.jpg";
import laptop from "@/assets/p-laptop.jpg";
import phone from "@/assets/p-phone.jpg";
import fridge from "@/assets/p-fridge.jpg";
import ricecooker from "@/assets/p-ricecooker.jpg";
import threewheeler from "@/assets/p-threewheeler.jpg";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];

export const STORE_NAME = "VoltHub";

export const productImages: Record<string, string> = {
  tv,
  laptop,
  phone,
  fridge,
  ricecooker,
  threewheeler,
};

export const imageFor = (key: string) => productImages[key] ?? tv;

export const CATEGORIES = [
  { name: "TVs", image: "tv" },
  { name: "Laptops", image: "laptop" },
  { name: "Mobile Phones", image: "phone" },
  { name: "Refrigerators", image: "fridge" },
  { name: "Rice Cookers", image: "ricecooker" },
  { name: "Vehicles", image: "threewheeler" },
] as const;

// Placeholder bank details — replace with the store's real account.
export const BANK_DETAILS = {
  bankName: "Commercial Bank of Ceylon",
  branch: "Colombo Main Branch",
  accountNumber: "8001 2345 6789",
  accountName: "VoltHub Electronics (Pvt) Ltd",
};

export const FREE_DELIVERY_FROM = 100000;
export const DELIVERY_FEE = 1500;

export function deliveryFeeFor(subtotal: number) {
  return subtotal >= FREE_DELIVERY_FROM || subtotal === 0 ? 0 : DELIVERY_FEE;
}

export function formatLKR(value: number | string) {
  return "Rs. " + Number(value).toLocaleString("en-LK", { maximumFractionDigits: 0 });
}

export const ORDER_STAGES = [
  "Order Placed & Awaiting Payment / Verification",
  "Order Confirmed & Item Reserved in Store",
  "Processing & Packaging at Store",
  "Out for Delivery / Dispatched",
  "Delivered Successfully",
];

export const PAYMENT_LABELS: Record<string, { label: string; tone: "success" | "warning" | "destructive" | "secondary" }> = {
  cod: { label: "Cash on Delivery", tone: "secondary" },
  pending: { label: "Slip not uploaded", tone: "warning" },
  awaiting_verification: { label: "Slip pending approval", tone: "warning" },
  verified: { label: "Payment verified", tone: "success" },
  rejected: { label: "Slip rejected – re-upload", tone: "destructive" },
};
