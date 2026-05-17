"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { computeMyBalances } from "@/lib/balances";
import type { Expense, ExpenseShare, Payment } from "@/lib/types";

export type ActionState = { error?: string } | null;

export async function createGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "other");
  const currency = String(formData.get("currency") ?? "INR");

  if (!name) return { error: "Group name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  // Self-heal: ensure profile row exists before inserting FK references.
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "User";
  await supabase
    .from("profiles")
    .upsert(
      { id: user.id, email: user.email!, full_name: fullName },
      { onConflict: "id" },
    );

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name, type, default_currency: currency, created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: `Could not create group: ${error.message}` };

  const { error: memberErr } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "admin" });
  if (memberErr) return { error: `Could not add you to the group: ${memberErr.message}` };

  revalidatePath("/groups");
  redirect(`/groups/${group.id}`);
}

export async function addMemberByEmail(
  groupId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email required" };

  const supabase = await createClient();
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (pErr) return { error: pErr.message };
  if (!profile) return { error: "No splitkar user with that email. Ask them to sign up first." };

  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: profile.id });
  if (error && !error.message.includes("duplicate")) return { error: error.message };

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

export async function removeMember(groupId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath(`/groups/${groupId}`);
}

// Leave a group. Only allowed when the caller's net balance in this group is
// fully settled (i.e. zero with every other member). The group creator cannot
// leave their own group — they must delete it instead.
export async function leaveGroup(
  groupId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return { error: "Group not found." };
  if (group.created_by === user.id) {
    return {
      error: "You created this group — you can't leave it. Delete the group instead.",
    };
  }

  const [{ data: expenses }, { data: shares }, { data: payments }] = await Promise.all([
    supabase.from("expenses").select("*").eq("group_id", groupId).is("deleted_at", null),
    supabase
      .from("expense_shares")
      .select("expense_id, user_id, share_cents, expenses!inner(group_id)")
      .eq("expenses.group_id", groupId),
    supabase.from("payments").select("*").eq("group_id", groupId),
  ]);

  const balances = computeMyBalances(
    user.id,
    (expenses ?? []) as Expense[],
    (shares ?? []) as ExpenseShare[],
    (payments ?? []) as Payment[],
  );
  const unsettled = balances.filter((b) => b.amountCents !== 0);
  if (unsettled.length > 0) {
    return {
      error:
        "You still have unsettled balances in this group. Settle up first, then you can leave.",
    };
  }

  const { error: delErr } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);
  if (delErr) return { error: delErr.message };

  revalidatePath("/groups");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Delete a group permanently. Only the group creator (admin) may do this.
// FK constraints cascade to expenses, members, payments, invites, shares.
export async function deleteGroup(
  groupId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return { error: "Group not found." };
  if (group.created_by !== user.id) {
    return { error: "Only the group admin can delete this group." };
  }

  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) return { error: error.message };

  revalidatePath("/groups");
  revalidatePath("/dashboard");
  return { ok: true };
}

// URL-safe random token. 18 bytes → 24 base64url chars; collision-resistant
// without being unwieldy in shared links. Uses Web Crypto so this works on
// both Node and Edge runtimes.
function generateInviteToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function inviteOrigin(): Promise<string> {
  const h = await headers();
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (envOrigin) return envOrigin.replace(/\/+$/, "");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

export async function createGroupInvite(groupId: string): Promise<{ url: string } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You're not signed in." };

    const token = generateInviteToken();
    const { error } = await supabase
      .from("group_invites")
      .insert({ token, group_id: groupId, created_by: user.id });
    if (error) return { error: `Could not create invite: ${error.message}` };

    const origin = await inviteOrigin();
    return { url: `${origin}/invite/${token}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unexpected error creating invite." };
  }
}

export async function acceptGroupInvite(token: string): Promise<{ groupId: string } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You're not signed in." };

    const { data, error } = await supabase.rpc("accept_group_invite", { invite_token: token });
    if (error) return { error: error.message };
    if (!data) return { error: "Invite is invalid, revoked, or expired." };

    revalidatePath("/groups");
    return { groupId: data as string };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unexpected error accepting invite." };
  }
}
