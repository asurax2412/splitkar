import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Account</h1>
      <Card>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{profile?.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Default currency</dt>
            <dd className="font-medium">{profile?.default_currency ?? "INR"}</dd>
          </div>
        </dl>
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">Sign out</Button>
        </form>
      </Card>
    </div>
  );
}
