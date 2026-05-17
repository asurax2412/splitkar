"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { leaveGroup, deleteGroup } from "@/app/actions/groups";

export function GroupDangerActions({
  groupId,
  isAdmin,
}: {
  groupId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLeave() {
    if (!confirm("Leave this group? You can rejoin only via a new invite.")) return;
    setError(null);
    startTransition(async () => {
      const res = await leaveGroup(groupId);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push("/groups");
      router.refresh();
    });
  }

  function handleDelete() {
    if (
      !confirm(
        "Delete this group permanently? All expenses, shares, payments, and invites will be removed. This cannot be undone.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await deleteGroup(groupId);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push("/groups");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {isAdmin ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
            {isPending ? "Deleting…" : "Delete group"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLeave}
            disabled={isPending}
          >
            <LogOut className="h-4 w-4" />
            {isPending ? "Leaving…" : "Leave group"}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
