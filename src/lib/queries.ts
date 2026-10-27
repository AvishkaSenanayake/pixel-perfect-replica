import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const productsQuery = () =>
  queryOptions({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("featured", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export type TrackedOrder = {
  code: string;
  customer_name: string;
  phone: string;
  city: string;
  payment_method: "cod" | "bank";
  payment_status: string;
  status: number;
  has_slip: boolean;
  total: number;
  subtotal: number;
  delivery_fee: number;
  created_at: string;
  updated_at: string;
  items: { name: string; quantity: number; unit_price: number }[] | null;
};

export async function trackOrders(q: string): Promise<TrackedOrder[]> {
  const { data, error } = await supabase.rpc("track_orders", { p_query: q });
  if (error) throw error;
  return (data as unknown as TrackedOrder[]) ?? [];
}

export async function uploadSlip(code: string, phone: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${code}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("slips")
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data, error: e2 } = await supabase.rpc("attach_slip", {
    p_code: code,
    p_phone: phone,
    p_path: path,
  });
  if (e2) throw e2;
  if (!data) throw new Error("Order and phone number do not match.");
}
