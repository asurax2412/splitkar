"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPayment(formData: FormData) {
  const groupId = String(formData.get("groupId"));
  const fromUser = String(formData.get("fromUser"));
  const toUser = String(formData.get("toUser"));
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  const note = String(formData.get("note") ?? "") || null;
  const paidAt = String(formData.get("paidAt") ?? new Date().toISOString().slice(0, 10));
  const currency = String(formData.get("currency") ?? "INR");

  if (!groupId || !fromUser || !toUser) throw new Error("Missing fields");
  if (fromUser === toUser) throw new Error("Cannot pay yourself");
  const amountCents = Math.round(amount * 100);
  if (amountCents <= 0) throw new Error("Amount must be positive");

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    group_id: groupId,
    from_user: fromUser,
    to_user: toUser,
    amount_cents: amountCents,
    currency,
    note,
    paid_at: paidAt,
  });
  if (error) throw error;

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  redirect(`/groups/${groupId}`);
}
