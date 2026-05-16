"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function addMemberByEmail(groupId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) throw new Error("Email required");

  const supabase = await createClient();
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!profile) throw new Error("No splitkar user with that email. Ask them to sign up first.");

  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: profile.id });
  if (error && !error.message.includes("duplicate")) throw error;

  revalidatePath(`/groups/${groupId}`);
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
