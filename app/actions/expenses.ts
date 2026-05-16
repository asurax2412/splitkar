"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveSplit } from "@/lib/splits";
import type { SplitType } from "@/lib/types";

type CreateExpenseInput = {
  groupId: string;
  description: string;
  amountCents: number;
  currency: string;
  paidBy: string;
  expenseDate: string; // yyyy-mm-dd
  category: string | null;
  notes: string | null;
  splitType: SplitType;
  participants: string[];
  values: Record<string, number>;
};

export async function createExpense(input: CreateExpenseInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (!input.description.trim()) throw new Error("Description is required");
  if (input.amountCents <= 0) throw new Error("Amount must be positive");
  if (input.participants.length === 0) throw new Error("Choose at least one participant");

  const shares = resolveSplit({
    type: input.splitType,
    amountCents: input.amountCents,
    participants: input.participants,
    values: input.values,
  });

  const { data: expense, error: expErr } = await supabase
    .from("expenses")
    .insert({
      group_id: input.groupId,
      paid_by: input.paidBy,
      amount_cents: input.amountCents,
      currency: input.currency,
      description: input.description.trim(),
      category: input.category,
      expense_date: input.expenseDate,
      split_type: input.splitType,
      notes: input.notes,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (expErr) throw expErr;

  const { error: shErr } = await supabase.from("expense_shares").insert(
    shares.map((s) => ({
      expense_id: expense.id,
      user_id: s.user_id,
      share_cents: s.share_cents,
    })),
  );
  if (shErr) {
    // best-effort rollback
    await supabase.from("expenses").delete().eq("id", expense.id);
    throw shErr;
  }

  revalidatePath(`/groups/${input.groupId}`);
  revalidatePath("/dashboard");
  redirect(`/groups/${input.groupId}`);
}

export async function deleteExpense(expenseId: string, groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", expenseId);
  if (error) throw error;
  revalidatePath(`/groups/${groupId}`);
}
