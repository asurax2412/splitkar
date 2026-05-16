import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, getGroupData } from "@/lib/queries";
import { computeMyBalances } from "@/lib/balances";
import { formatMoney, paiseToRupees } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createPayment } from "@/app/actions/payments";

export default async function SettlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const { group, members, expenses, shares, payments } = await getGroupData(id);
  if (!group) notFound();

  const myBalances = computeMyBalances(user.id, expenses, shares, payments);
  // People I owe (amountCents < 0) — natural candidates for me to pay.
  const iOwe = myBalances.filter((b) => b.amountCents < 0);
  const owedToMe = myBalances.filter((b) => b.amountCents > 0);
  const profileMap = new Map(members.map((m) => [m.user_id, m.profile]));
  const today = new Date().toISOString().slice(0, 10);

  const defaultTarget = iOwe[0] ?? owedToMe[0];

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settle up</h1>
        <Link href={`/groups/${id}`}>
          <Button variant="ghost" size="sm">Back</Button>
        </Link>
      </div>

      {myBalances.length === 0 ? (
        <Card>
          <p className="text-center text-muted-foreground py-6">
            All settled in this group. 🎉
          </p>
        </Card>
      ) : (
        <Card>
          <form action={createPayment} className="space-y-4">
            <input type="hidden" name="groupId" value={id} />
            <input type="hidden" name="currency" value={group.default_currency} />

            <div>
              <Label>Direction</Label>
              <Select name="fromUser" defaultValue={user.id}>
                <option value={user.id}>You paid</option>
                {owedToMe.map((b) => (
                  <option key={b.counterpartyId} value={b.counterpartyId}>
                    {profileMap.get(b.counterpartyId)?.full_name ?? "Someone"} paid you
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="toUser">To / from</Label>
              <Select id="toUser" name="toUser" defaultValue={defaultTarget?.counterpartyId ?? ""}>
                {members
                  .filter((m) => m.user_id !== user.id)
                  .map((m) => {
                    const bal = myBalances.find((b) => b.counterpartyId === m.user_id);
                    const tag = bal
                      ? bal.amountCents > 0
                        ? `(owes you ${formatMoney(bal.amountCents, group.default_currency)})`
                        : `(you owe ${formatMoney(-bal.amountCents, group.default_currency)})`
                      : "";
                    return (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profile?.full_name} {tag}
                      </option>
                    );
                  })}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  defaultValue={defaultTarget ? paiseToRupees(Math.abs(defaultTarget.amountCents)).toFixed(2) : ""}
                  required
                />
              </div>
              <div>
                <Label htmlFor="paidAt">Date</Label>
                <Input id="paidAt" name="paidAt" type="date" defaultValue={today} required />
              </div>
            </div>

            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" name="note" placeholder="UPI ref / cash" />
            </div>

            <Button type="submit" className="w-full">Record payment</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
