"use client";

import { useState, useTransition } from "react";
import { addMemberByEmail } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddMemberForm({ groupId }: { groupId: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData();
        fd.set("email", email);
        startTransition(async () => {
          try {
            await addMemberByEmail(groupId, fd);
            setEmail("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add");
          }
        });
      }}
      className="space-y-2"
    >
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="friend@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding…" : "Add"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
