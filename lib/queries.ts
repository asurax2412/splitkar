import { createClient } from "@/lib/supabase/server";
import type { Expense, ExpenseShare, GroupMember, Payment, Profile } from "./types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getMyGroups() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("group_id, groups(*)")
    .order("joined_at", { ascending: false });
  return (data ?? [])
    .map((row: { groups: unknown }) => row.groups)
    .filter(Boolean) as {
    id: string;
    name: string;
    type: string;
    default_currency: string;
    created_at: string;
  }[];
}

export async function getGroupData(groupId: string) {
  const supabase = await createClient();

  const [{ data: group }, { data: memberRows }, { data: expenses }, { data: shares }, { data: payments }] =
    await Promise.all([
      supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
      supabase
        .from("group_members")
        .select("group_id, user_id, role, joined_at, profile:profiles(*)")
        .eq("group_id", groupId),
      supabase
        .from("expenses")
        .select("*")
        .eq("group_id", groupId)
        .is("deleted_at", null)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("expense_shares")
        .select("expense_id, user_id, share_cents, expenses!inner(group_id)")
        .eq("expenses.group_id", groupId),
      supabase.from("payments").select("*").eq("group_id", groupId).order("paid_at", { ascending: false }),
    ]);

  const members: GroupMember[] = (memberRows ?? []).map((m: Record<string, unknown>) => {
    const profile = Array.isArray(m.profile) ? (m.profile[0] as Profile) : (m.profile as Profile);
    return {
      group_id: m.group_id as string,
      user_id: m.user_id as string,
      role: m.role as string,
      joined_at: m.joined_at as string,
      profile,
    };
  });

  return {
    group: group as {
      id: string;
      name: string;
      type: string;
      default_currency: string;
      created_by: string;
    } | null,
    members,
    expenses: (expenses ?? []) as Expense[],
    shares: (shares ?? []).map((s: ExpenseShare) => ({
      expense_id: s.expense_id,
      user_id: s.user_id,
      share_cents: s.share_cents,
    })) as ExpenseShare[],
    payments: (payments ?? []) as Payment[],
  };
}
