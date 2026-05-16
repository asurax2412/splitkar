import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav, MobileTopBar, MobileBottomBar } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Self-heal: the on-auth trigger should create this, but if it didn't,
  // create the row now so foreign-key constraints don't blow up later.
  if (!profile) {
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
    profile = { full_name: fullName };
  }

  const userName = profile?.full_name ?? user.email ?? "You";

  return (
    <div className="flex-1 flex">
      <Nav userName={userName} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar userName={userName} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6">{children}</main>
        <MobileBottomBar />
      </div>
    </div>
  );
}
