import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav, MobileTopBar, MobileBottomBar } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

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
