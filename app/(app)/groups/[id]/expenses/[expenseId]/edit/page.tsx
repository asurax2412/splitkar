import { notFound } from "next/navigation";
import { getCurrentUser, getGroupData } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { ExpenseForm, type ExpenseInitial } from "@/components/expense-form";
import type { SplitType } from "@/lib/types";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const { id, expenseId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const { group, members, expenses, shares } = await getGroupData(id);
  if (!group) notFound();

  const expense = expenses.find((e) => e.id === expenseId);
  if (!expense) notFound();

  const expShares = shares.filter((s) => s.expense_id === expenseId);

  // Derive form values from existing shares (best-effort).
  const initialValues: Record<string, number> = {};
  if (expense.split_type === "exact") {
    for (const s of expShares) initialValues[s.user_id] = s.share_cents;
  } else if (expense.split_type === "percentage" && expense.amount_cents > 0) {
    for (const s of expShares) {
      initialValues[s.user_id] = (s.share_cents * 100) / expense.amount_cents;
    }
  } else if (expense.split_type === "shares") {
    // Use share_cents proportionally as share weights (1 unit ~= 1 share for editing).
    for (const s of expShares) initialValues[s.user_id] = s.share_cents;
  }

  const initial: ExpenseInitial = {
    expenseId: expense.id,
    description: expense.description,
    amountCents: expense.amount_cents,
    paidBy: expense.paid_by,
    expenseDate: expense.expense_date,
    splitType: expense.split_type as SplitType,
    participants: expShares.map((s) => s.user_id),
    values: initialValues,
    notes: expense.notes,
  };

  const memberList = members
    .filter((m) => m.profile)
    .map((m) => ({ id: m.user_id, name: m.profile!.full_name }));

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Edit expense</h1>
      <p className="text-sm text-muted-foreground mb-6">in {group.name}</p>
      <Card>
        <ExpenseForm
          groupId={id}
          members={memberList}
          defaultCurrency={group.default_currency}
          myId={user.id}
          initial={initial}
        />
      </Card>
    </div>
  );
}
