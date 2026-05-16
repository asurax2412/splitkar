import Link from "next/link";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { Profile } from "@/lib/types";

export default async function ActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: expenses }, { data: payments }, { data: profiles }, { data: groups }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("profiles").select("*"),
    supabase.from("groups").select("id, name"),
  ]);

  const profileMap = new Map<string, Profile>((profiles ?? []).map((p: Profile) => [p.id, p]));
  const groupMap = new Map<string, string>((groups ?? []).map((g: { id: string; name: string }) => [g.id, g.name]));

  type Event =
    | { kind: "expense"; id: string; date: string; description: string; amount: number; payer: string; group: string; currency: string }
    | { kind: "payment"; id: string; date: string; amount: number; from: string; to: string; group: string; currency: string };

  const events: Event[] = [
    ...((expenses ?? []) as Array<{
      id: string;
      created_at: string;
      description: string;
      amount_cents: number;
      paid_by: string;
      group_id: string;
      currency: string;
    }>).map((e) => ({
      kind: "expense" as const,
      id: `e-${e.id}`,
      date: e.created_at,
      description: e.description,
      amount: e.amount_cents,
      payer: profileMap.get(e.paid_by)?.full_name ?? "Someone",
      group: groupMap.get(e.group_id) ?? "Group",
      currency: e.currency,
    })),
    ...((payments ?? []) as Array<{
      id: string;
      created_at: string;
      amount_cents: number;
      from_user: string;
      to_user: string;
      group_id: string | null;
      currency: string;
    }>).map((p) => ({
      kind: "payment" as const,
      id: `p-${p.id}`,
      date: p.created_at,
      amount: p.amount_cents,
      from: profileMap.get(p.from_user)?.full_name ?? "Someone",
      to: profileMap.get(p.to_user)?.full_name ?? "Someone",
      group: p.group_id ? groupMap.get(p.group_id) ?? "Group" : "—",
      currency: p.currency,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Activity</h1>
      {events.length === 0 ? (
        <Card>
          <p className="text-center text-muted-foreground py-6">No activity yet.</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li key={ev.id}>
              <Card className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm">
                    {ev.kind === "expense" ? (
                      <>
                        <span className="font-medium">{ev.payer}</span> added{" "}
                        <span className="font-medium">{ev.description}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">{ev.from}</span> paid{" "}
                        <span className="font-medium">{ev.to}</span>
                      </>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      in {ev.group} · {format(parseISO(ev.date), "d MMM, h:mm a")}
                    </div>
                  </div>
                  <div className="text-sm font-medium whitespace-nowrap">
                    {formatMoney(ev.amount, ev.currency)}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        Showing recent activity. <Link className="underline" href="/dashboard">Back to dashboard</Link>
      </p>
    </div>
  );
}
