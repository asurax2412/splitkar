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
  // RLS on `groups` already filters to groups the current user is a member of,
  // so this returns one row per group (no per-member duplication).
  const { data } = await supabase
    .from("groups")
    .select("id, name, type, default_currency, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []) as {
    id: string;
    name: string;
    type: string;
    default_currency: string;
    created_at: string;
  }[];
}

// All distinct people who share at least one group with the current user.
// Used as the "friends" list. Result excludes the caller themselves.
export async function getMyFriends() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("group_members")
    .select("user_id, group_id, profile:profiles(id, full_name, email, avatar_url)");

  const seen = new Set<string>();
  const friends: Array<{
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    shared_group_ids: string[];
  }> = [];
  const groupsByUser = new Map<string, Set<string>>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const userId = row.user_id as string;
    const groupId = row.group_id as string;
    const rawProfile = row.profile;
    const profile = Array.isArray(rawProfile)
      ? (rawProfile[0] as
          | { id: string; full_name: string; email: string; avatar_url: string | null }
          | undefined)
      : (rawProfile as
          | { id: string; full_name: string; email: string; avatar_url: string | null }
          | null);
    if (!profile || userId === user.id) continue;
    const set = groupsByUser.get(userId) ?? new Set<string>();
    set.add(groupId);
    groupsByUser.set(userId, set);
    if (!seen.has(userId)) {
      seen.add(userId);
      friends.push({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        shared_group_ids: [],
      });
    }
  }
  for (const f of friends) {
    f.shared_group_ids = [...(groupsByUser.get(f.id) ?? [])];
  }
  return friends.sort((a, b) => a.full_name.localeCompare(b.full_name));
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
