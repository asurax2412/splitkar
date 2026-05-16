import Link from "next/link";
import { getMyGroups } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

const typeIcon: Record<string, string> = {
  trip: "🧳",
  home: "🏠",
  couple: "💑",
  other: "👥",
};

export default async function GroupsPage() {
  const groups = await getMyGroups();
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Link href="/groups/new">
          <Button size="sm"><Plus className="h-4 w-4" /> New group</Button>
        </Link>
      </div>
      {groups.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-semibold mb-1">No groups yet</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Create one to start tracking shared expenses.
            </p>
            <Link href="/groups/new">
              <Button>Create your first group</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`}>
              <Card className="hover:bg-muted transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{typeIcon[g.type] ?? "👥"}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{g.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{g.type}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
