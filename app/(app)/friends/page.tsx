import { createClient } from "@/lib/supabase/server";
import { computeMyBalances } from "@/lib/balances";
import { getMyFriends } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import type { Expense, ExpenseShare, Payment } from "@/lib/types";
import { FriendsList } from "@/components/friends-list";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const friends = await getMyFriends();

  const [{ data: expenses }, { data: shares }, { data: payments }] = await Promise.all([
    supabase.from("expenses").select("*").is("deleted_at", null),
    supabase.from("expense_shares").select("expense_id, user_id, share_cents"),
    supabase.from("payments").select("*"),
  ]);

  const balances = computeMyBalances(
    user.id,
    (expenses ?? []) as Expense[],
    (shares ?? []) as ExpenseShare[],
    (payments ?? []) as Payment[],
  );
  const balanceMap = new Map(balances.map((b) => [b.counterpartyId, b.amountCents]));

  const items = friends.map((f) => ({
    id: f.id,
    full_name: f.full_name,
    email: f.email,
    balanceCents: balanceMap.get(f.id) ?? 0,
    sharedGroups: f.shared_group_ids.length,
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Friends</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Everyone you share a group with. Select multiple to start a new group together.
      </p>

      {items.length === 0 ? (
        <Card>
          <p className="text-center text-muted-foreground py-6">
            No friends yet. Add a member to any group to see them here.
          </p>
        </Card>
      ) : (
        <FriendsList friends={items} />
      )}
    </div>
  );
}
