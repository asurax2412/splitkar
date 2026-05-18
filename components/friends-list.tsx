"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { createGroupWithFriends } from "@/app/actions/groups";
import { Users, X } from "lucide-react";

type Friend = {
  id: string;
  full_name: string;
  email: string;
  balanceCents: number;
  sharedGroups: number;
};

export function FriendsList({ friends }: { friends: Friend[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem("splitkar:hiddenFriends");
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const [showForm, setShowForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState("trip");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = friends.filter((f) => !hidden.has(f.id));

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function hide(id: string) {
    setHidden((h) => {
      const next = new Set(h);
      next.add(id);
      try {
        localStorage.setItem("splitkar:hiddenFriends", JSON.stringify([...next]));
      } catch {}
      return next;
    });
    setSelected((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  function unhideAll() {
    setHidden(new Set());
    try {
      localStorage.removeItem("splitkar:hiddenFriends");
    } catch {}
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selected.size === 0) {
      setError("Select at least one friend.");
      return;
    }
    startTransition(async () => {
      const res = await createGroupWithFriends({
        name: groupName,
        type: groupType,
        currency: "INR",
        memberIds: [...selected],
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push(`/groups/${res.groupId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <Card className="border-primary/40">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">
              {selected.size} selected
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="ml-2 text-muted-foreground hover:underline text-xs"
              >
                clear
              </button>
            </p>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Users className="h-4 w-4" /> Create group
              </Button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label htmlFor="g-name">Group name</Label>
                <Input
                  id="g-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Weekend Goa"
                  required
                />
              </div>
              <div>
                <Label htmlFor="g-type">Type</Label>
                <Select
                  id="g-type"
                  value={groupType}
                  onChange={(e) => setGroupType(e.target.value)}
                >
                  <option value="trip">🧳 Trip</option>
                  <option value="home">🏠 Home</option>
                  <option value="couple">💑 Couple</option>
                  <option value="other">👥 Other</option>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Creating…" : `Create with ${selected.size} friend${selected.size > 1 ? "s" : ""}`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      <div className="space-y-2">
        {visible.map((f) => {
          const isSel = selected.has(f.id);
          return (
            <Card
              key={f.id}
              className={`transition cursor-pointer ${isSel ? "ring-2 ring-primary" : "hover:bg-muted"}`}
              onClick={() => toggle(f.id)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => toggle(f.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{f.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {f.email} · {f.sharedGroups} shared group{f.sharedGroups !== 1 ? "s" : ""}
                  </p>
                </div>
                <div
                  className={`text-sm font-medium whitespace-nowrap ${
                    f.balanceCents > 0
                      ? "text-positive"
                      : f.balanceCents < 0
                        ? "text-negative"
                        : "text-muted-foreground"
                  }`}
                >
                  {f.balanceCents === 0
                    ? "settled"
                    : f.balanceCents > 0
                      ? `owes ${formatMoney(f.balanceCents)}`
                      : `you owe ${formatMoney(-f.balanceCents)}`}
                </div>
                <button
                  type="button"
                  aria-label="Hide from friends"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      f.balanceCents !== 0 &&
                      !confirm(
                        "This friend has unsettled balances. Hiding only removes them from your friends list — settle up and leave shared groups to fully remove. Continue?",
                      )
                    )
                      return;
                    hide(f.id);
                  }}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {hidden.size > 0 && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          {hidden.size} hidden ·{" "}
          <button
            type="button"
            onClick={unhideAll}
            className="underline hover:text-foreground"
          >
            show all
          </button>
        </p>
      )}
    </div>
  );
}
