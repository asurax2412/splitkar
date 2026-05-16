import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { computeMyBalances } from "@/lib/balances";
import type { Expense, ExpenseShare, Payment, Profile } from "@/lib/types";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Pull every visible expense, share, and payment in a single round-trip-ish.
  const [{ data: expenses }, { data: shares }, { data: payments }, { data: profiles }] =
    await Promise.all([
      supabase.from("expenses").select("*").is("deleted_at", null),
      supabase.from("expense_shares").select("expense_id, user_id, share_cents"),
      supabase.from("payments").select("*"),
      supabase.from("profiles").select("id, full_name, email, avatar_url, default_currency, created_at"),
    ]);

  const myBalances = computeMyBalances(
    user.id,
    (expenses ?? []) as Expense[],
    (shares ?? []) as ExpenseShare[],
    (payments ?? []) as Payment[],
  );

  const profileMap = new Map<string, Profile>(
    (profiles ?? []).map((p: Profile) => [p.id, p]),
  );

  const total = myBalances.reduce((s, b) => s + b.amountCents, 0);
  const owedToMe = myBalances.filter((b) => b.amountCents > 0);
  const iOwe = myBalances.filter((b) => b.amountCents < 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <p className="text-sm text-muted-foreground">Your overall balance</p>
        <p
          className={`text-3xl font-bold mt-1 ${
            total > 0 ? "text-positive" : total < 0 ? "text-negative" : ""
          }`}
        >
          {total >= 0 ? formatMoney(total) : "− " + formatMoney(-total)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {total > 0
            ? "Net, others owe you this much."
            : total < 0
              ? "Net, you owe this much."
              : "All settled up."}
        </p>
        <div className="mt-4">
          <Link href="/groups/new">
            <Button size="sm"><Plus className="h-4 w-4" /> New group</Button>
          </Link>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-base font-semibold mb-3">You are owed</h3>
          {owedToMe.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing right now.</p>
          ) : (
            <ul className="space-y-2">
              {owedToMe.map((b) => (
                <li key={b.counterpartyId} className="flex justify-between text-sm">
                  <span>{profileMap.get(b.counterpartyId)?.full_name ?? "Someone"}</span>
                  <span className="text-positive font-medium">{formatMoney(b.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="text-base font-semibold mb-3">You owe</h3>
          {iOwe.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing right now.</p>
          ) : (
            <ul className="space-y-2">
              {iOwe.map((b) => (
                <li key={b.counterpartyId} className="flex justify-between text-sm">
                  <span>{profileMap.get(b.counterpartyId)?.full_name ?? "Someone"}</span>
                  <span className="text-negative font-medium">{formatMoney(-b.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
