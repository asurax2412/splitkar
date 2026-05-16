"use client";

import { useState, useTransition } from "react";
import { addMemberByEmail, createGroupInvite } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Marker for the specific "no profile" path so we know to offer the invite UI.
const NO_USER_MSG = "No splitkar user with that email. Ask them to sign up first.";

type InvitePrompt = { email: string; url: string; copied: boolean };

export function AddMemberForm({ groupId }: { groupId: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invitePrompt, setInvitePrompt] = useState<InvitePrompt | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isInviting, startInvite] = useTransition();

  function generateInviteFor(targetEmail: string) {
    setError(null);
    startInvite(async () => {
      const result = await createGroupInvite(groupId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setInvitePrompt({ email: targetEmail, url: result.url, copied: false });
    });
  }

  async function copyLink() {
    if (!invitePrompt) return;
    try {
      await navigator.clipboard.writeText(invitePrompt.url);
      setInvitePrompt({ ...invitePrompt, copied: true });
    } catch {
      setError("Could not copy — select the link and copy manually.");
    }
  }

  const mailtoHref = invitePrompt
    ? `mailto:${encodeURIComponent(invitePrompt.email)}` +
      `?subject=${encodeURIComponent("Join me on splitkar")}` +
      `&body=${encodeURIComponent(
        `Hey! Join my group on splitkar to track shared expenses:\n\n${invitePrompt.url}\n`,
      )}`
    : "";

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setInvitePrompt(null);
          const fd = new FormData();
          fd.set("email", email);
          startTransition(async () => {
            const result = await addMemberByEmail(groupId, fd);
            if ("error" in result) {
              if (result.error === NO_USER_MSG) {
                generateInviteFor(email);
                return;
              }
              setError(result.error);
              return;
            }
            setEmail("");
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
          <Button type="submit" size="sm" disabled={isPending || isInviting}>
            {isPending || isInviting ? "Working…" : "Add"}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>

      {invitePrompt && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-sm">
            <span className="font-medium">{invitePrompt.email}</span> isn&apos;t on splitkar yet.
            Send them this invite link:
          </p>
          <Input
            value={invitePrompt.url}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="flex gap-2 flex-wrap">
            <a href={mailtoHref}>
              <Button size="sm" type="button">Email invite</Button>
            </a>
            <Button size="sm" variant="outline" type="button" onClick={copyLink}>
              {invitePrompt.copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => {
                setInvitePrompt(null);
                setEmail("");
              }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
