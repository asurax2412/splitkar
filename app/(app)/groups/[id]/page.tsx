import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getCurrentUser, getGroupData } from "@/lib/queries";
import { computeMyBalances } from "@/lib/balances";
import { formatMoney } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddMemberForm } from "@/components/add-member-form";
import { InviteLinkButton } from "@/components/invite-link-button";
import { Plus, Receipt, ArrowRightLeft } from "lucide-react";

export default async function GroupDetailPage({
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
  const total = myBalances.reduce((s, b) => s + b.amountCents, 0);

  const profileMap = new Map(members.map((m) => [m.user_id, m.profile]));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {group.type} · {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/groups/${id}/expenses/new`}>
            <Button size="sm"><Plus className="h-4 w-4" /> Add expense</Button>
          </Link>
          <Link href={`/groups/${id}/settle`}>
            <Button size="sm" variant="outline"><ArrowRightLeft className="h-4 w-4" /> Settle</Button>
          </Link>
        </div>
      </div>

      <Card>
        <p className="text-sm text-muted-foreground">Your balance in this group</p>
        <p
          className={`text-2xl font-bold ${
            total > 0 ? "text-positive" : total < 0 ? "text-negative" : ""
          }`}
        >
          {total >= 0 ? formatMoney(total) : "− " + formatMoney(-total)}
        </p>
        {myBalances.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm">
            {myBalances.map((b) => {
              const name = profileMap.get(b.counterpartyId)?.full_name ?? "Someone";
              return (
                <li key={b.counterpartyId} className="flex justify-between">
                  <span>
                    {b.amountCents > 0 ? `${name} owes you` : `You owe ${name}`}
                  </span>
                  <span className={b.amountCents > 0 ? "text-positive" : "text-negative"}>
                    {formatMoney(Math.abs(b.amountCents))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Members</h2>
        <ul className="space-y-2 mb-4">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between text-sm">
              <span>
                {m.profile?.full_name}
                {m.user_id === user.id && <span className="text-muted-foreground"> (you)</span>}
              </span>
              <span className="text-xs text-muted-foreground">{m.profile?.email}</span>
            </li>
          ))}
        </ul>
        <AddMemberForm groupId={id} />
        <div className="mt-4 pt-4 border-t border-border">
          <InviteLinkButton groupId={id} />
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Expenses</h2>
        {expenses.length === 0 ? (
          <div className="text-center py-6">
            <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No expenses yet.</p>
            <Link href={`/groups/${id}/expenses/new`}>
              <Button size="sm">Add the first expense</Button>
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {expenses.map((e) => {
              const payer = profileMap.get(e.paid_by);
              const myShare = shares.find((s) => s.expense_id === e.id && s.user_id === user.id);
              return (
                <li key={e.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{e.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {payer?.full_name ?? "Someone"} paid {formatMoney(e.amount_cents, e.currency)}
                      {" · "}
                      {format(new Date(e.expense_date), "d MMM yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    {e.paid_by === user.id ? (
                      <p className="text-positive text-sm font-medium">
                        you lent {formatMoney(e.amount_cents - (myShare?.share_cents ?? 0))}
                      </p>
                    ) : myShare ? (
                      <p className="text-negative text-sm font-medium">
                        you owe {formatMoney(myShare.share_cents)}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm">not involved</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {payments.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-3">Payments</h2>
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="py-2 flex justify-between text-sm">
                <span>
                  {profileMap.get(p.from_user)?.full_name ?? "Someone"}
                  {" paid "}
                  {profileMap.get(p.to_user)?.full_name ?? "Someone"}
                </span>
                <span>
                  {formatMoney(p.amount_cents, p.currency)}
                  {" · "}
                  <span className="text-muted-foreground">
                    {format(new Date(p.paid_at), "d MMM")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
