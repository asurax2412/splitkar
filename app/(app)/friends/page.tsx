import { createClient } from "@/lib/supabase/server";
import { computeMyBalances } from "@/lib/balances";
import { formatMoney } from "@/lib/money";
import { Card } from "@/components/ui/card";
import type { Expense, ExpenseShare, Payment, Profile } from "@/lib/types";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: expenses }, { data: shares }, { data: payments }, { data: profiles }] =
    await Promise.all([
      supabase.from("expenses").select("*").is("deleted_at", null),
      supabase.from("expense_shares").select("expense_id, user_id, share_cents"),
      supabase.from("payments").select("*"),
      supabase.from("profiles").select("*"),
    ]);

  const balances = computeMyBalances(
    user.id,
    (expenses ?? []) as Expense[],
    (shares ?? []) as ExpenseShare[],
    (payments ?? []) as Payment[],
  );
  const profileMap = new Map<string, Profile>((profiles ?? []).map((p: Profile) => [p.id, p]));

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Friends</h1>
      {balances.length === 0 ? (
        <Card>
          <p className="text-center text-muted-foreground py-6">
            No balances with anyone yet. Add a friend to a group to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {balances.map((b) => {
            const p = profileMap.get(b.counterpartyId);
            return (
              <Card key={b.counterpartyId} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{p?.full_name ?? "Someone"}</p>
                  <p className="text-xs text-muted-foreground">{p?.email}</p>
                </div>
                <div className={b.amountCents > 0 ? "text-positive font-medium" : "text-negative font-medium"}>
                  {b.amountCents > 0
                    ? `owes you ${formatMoney(b.amountCents)}`
                    : `you owe ${formatMoney(-b.amountCents)}`}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
