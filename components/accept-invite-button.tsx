"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptGroupInvite } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await acceptGroupInvite(token);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            router.push(`/groups/${result.groupId}`);
            router.refresh();
          });
        }}
      >
        {isPending ? "Joining…" : "Join group"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
