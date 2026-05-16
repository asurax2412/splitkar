import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AcceptInviteButton } from "@/components/accept-invite-button";

type Preview = {
  group_id: string;
  group_name: string;
  group_type: string;
  member_count: number;
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: previewRows } = await supabase.rpc("preview_group_invite", {
    invite_token: token,
  });
  const preview = (previewRows as Preview[] | null)?.[0];

  if (!preview) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">Invite not found</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This invite link is invalid, revoked, or has expired. Ask the group
            admin for a new one.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Go to splitkar</Button>
          </Link>
        </Card>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already a member? Take them straight in.
  if (user) {
    const { data: existing } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", preview.group_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) redirect(`/groups/${preview.group_id}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center">
        <p className="text-sm text-muted-foreground mb-1">You&apos;ve been invited to join</p>
        <h1 className="text-2xl font-bold mb-1">{preview.group_name}</h1>
        <p className="text-sm text-muted-foreground capitalize mb-6">
          {preview.group_type} · {preview.member_count} member
          {preview.member_count !== 1 ? "s" : ""}
        </p>

        {user ? (
          <AcceptInviteButton token={token} />
        ) : (
          <div className="space-y-2">
            <Link href={`/login?next=/invite/${token}`} className="block">
              <Button className="w-full">Log in to join</Button>
            </Link>
            <Link href={`/signup?next=/invite/${token}`} className="block">
              <Button variant="outline" className="w-full">
                Create an account
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </main>
  );
}
