"use client";

import { useState, useTransition } from "react";
import { createGroupInvite } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link as LinkIcon, Copy, Check } from "lucide-react";

export function InviteLinkButton({ groupId }: { groupId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function generate() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await createGroupInvite(groupId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setUrl(result.url);
      try {
        await navigator.clipboard.writeText(result.url);
        setCopied(true);
      } catch {
        // Clipboard API can fail (insecure context, permissions) — leave the
        // URL visible so the user can copy manually.
      }
    });
  }

  async function copyAgain() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Could not copy — select the link and copy manually.");
    }
  }

  if (!url) {
    return (
      <div>
        <Button size="sm" variant="outline" onClick={generate} disabled={isPending}>
          <LinkIcon className="h-4 w-4" />
          {isPending ? "Generating…" : "Invite via link"}
        </Button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Share this link with anyone you want in the group. They&apos;ll join after signing in.
      </p>
      <div className="flex gap-2">
        <Input value={url} readOnly onFocus={(e) => e.currentTarget.select()} />
        <Button size="sm" variant="outline" onClick={copyAgain}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
