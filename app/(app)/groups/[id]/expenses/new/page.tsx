import { notFound } from "next/navigation";
import { getCurrentUser, getGroupData } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expense-form";

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const { group, members } = await getGroupData(id);
  if (!group) notFound();

  const memberList = members
    .filter((m) => m.profile)
    .map((m) => ({ id: m.user_id, name: m.profile!.full_name }));

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Add expense</h1>
      <p className="text-sm text-muted-foreground mb-6">in {group.name}</p>
      <Card>
        <ExpenseForm
          groupId={id}
          members={memberList}
          defaultCurrency={group.default_currency}
          myId={user.id}
        />
      </Card>
    </div>
  );
}
