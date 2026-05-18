"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createGroup, type ActionState } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function NewGroupForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createGroup,
    null,
  );
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Group name</Label>
        <Input id="name" name="name" placeholder="Goa Trip" required />
      </div>
      <div>
        <Label htmlFor="type">Type</Label>
        <Select id="type" name="type" defaultValue="other">
          <option value="trip">🧳 Trip</option>
          <option value="home">🏠 Home</option>
          <option value="couple">💑 Couple</option>
          <option value="other">👥 Other</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="currency">Default currency</Label>
        <Select id="currency" name="currency" defaultValue="INR">
          <option value="INR">INR — Indian Rupee</option>
          <option value="USD">USD — US Dollar</option>
          <option value="EUR">EUR — Euro</option>
          <option value="GBP">GBP — British Pound</option>
        </Select>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create group"}
        </Button>
        <Link href="/groups">
          <Button type="button" variant="outline">Cancel</Button>
        </Link>
      </div>
    </form>
  );
}
