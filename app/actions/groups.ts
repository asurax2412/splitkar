"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "other");
  const currency = String(formData.get("currency") ?? "INR");

  if (!name) throw new Error("Name is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name, type, default_currency: currency, created_by: user.id })
    .select("id")
    .single();
  if (error) throw error;

  const { error: memberErr } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "admin" });
  if (memberErr) throw memberErr;

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
