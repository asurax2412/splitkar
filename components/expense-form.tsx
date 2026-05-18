"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpense, updateExpense } from "@/app/actions/expenses";
import { rupeesToPaise, formatMoney } from "@/lib/money";
import { resolveSplit } from "@/lib/splits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { SplitType } from "@/lib/types";

type Member = { id: string; name: string };

const today = () => new Date().toISOString().slice(0, 10);

const CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "Uncategorized" },
  { value: "Food", label: "🍔 Food & drink" },
  { value: "Groceries", label: "🛒 Groceries" },
  { value: "Travel", label: "✈️ Travel" },
  { value: "Transport", label: "🚗 Transport" },
  { value: "Lodging", label: "🏨 Lodging" },
  { value: "Entertainment", label: "🎬 Entertainment" },
  { value: "Shopping", label: "🛍️ Shopping" },
  { value: "Utilities", label: "💡 Utilities" },
  { value: "Rent", label: "🏠 Rent" },
  { value: "Health", label: "🏥 Health" },
  { value: "Other", label: "📦 Other" },
];

export type ExpenseInitial = {
  expenseId: string;
  description: string;
  amountCents: number;
  paidBy: string;
  expenseDate: string;
  splitType: SplitType;
  participants: string[];
  values: Record<string, number>;
  notes: string | null;
  category: string | null;
};

export function ExpenseForm({
  groupId,
  members,
  defaultCurrency,
  myId,
  initial,
}: {
  groupId: string;
  members: Member[];
  defaultCurrency: string;
  myId: string;
  initial?: ExpenseInitial;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(
    initial ? (initial.amountCents / 100).toFixed(2) : "",
  );
  const [paidBy, setPaidBy] = useState(initial?.paidBy ?? myId);
  const [expenseDate, setExpenseDate] = useState(initial?.expenseDate ?? today());
  const [splitType, setSplitType] = useState<SplitType>(initial?.splitType ?? "equal");
  const [participants, setParticipants] = useState<string[]>(
    initial?.participants ?? members.map((m) => m.id),
  );
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (!initial) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial.values)) {
      out[k] = initial.splitType === "exact" ? (v / 100).toFixed(2) : String(v);
    }
    return out;
  });
  const [category, setCategory] = useState(initial?.category ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const amountCents = rupeesToPaise(amount);

  const numericValues: Record<string, number> = useMemo(() => {
    const out: Record<string, number> = {};
    for (const id of participants) {
      const v = parseFloat(values[id] ?? "");
      if (Number.isFinite(v)) {
        out[id] = splitType === "exact" ? Math.round(v * 100) : v;
      } else {
        out[id] = 0;
      }
    }
    return out;
  }, [values, participants, splitType]);

  const preview = useMemo(() => {
    if (amountCents <= 0 || participants.length === 0) return null;
    try {
      return resolveSplit({
        type: splitType,
        amountCents,
        participants,
        values: numericValues,
      });
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Invalid split" };
    }
  }, [splitType, amountCents, participants, numericValues]);

  function toggleParticipant(id: string) {
    setParticipants((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (amountCents <= 0) {
      setError("Enter an amount.");
      return;
    }
    if (participants.length === 0) {
      setError("Pick at least one participant.");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          groupId,
          description,
          amountCents,
          currency: defaultCurrency,
          paidBy,
          expenseDate,
          category: category || null,
          notes: notes || null,
          splitType,
          participants,
          values: numericValues,
        };
        if (isEdit && initial) {
          await updateExpense({ ...payload, expenseId: initial.expenseId });
        } else {
          await createExpense(payload);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  const valueLabel: Record<SplitType, string> = {
    equal: "",
    exact: "Amount",
    percentage: "%",
    shares: "Shares",
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="desc">Description</Label>
        <Input
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Dinner at Mainland China"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
        </div>
      </div>

      <div>
        <Label htmlFor="paidBy">Paid by</Label>
        <Select id="paidBy" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === myId ? `${m.name} (you)` : m.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="splitType">Split</Label>
        <Select id="splitType" value={splitType} onChange={(e) => setSplitType(e.target.value as SplitType)}>
          <option value="equal">Equally</option>
          <option value="exact">By exact amounts</option>
          <option value="percentage">By percentages</option>
          <option value="shares">By shares</option>
        </Select>
      </div>

      <div>
        <Label>Participants</Label>
        <div className="space-y-2 rounded-md border border-border p-3">
          {members.map((m) => {
            const checked = participants.includes(m.id);
            return (
              <div key={m.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`p-${m.id}`}
                  checked={checked}
                  onChange={() => toggleParticipant(m.id)}
                  className="h-4 w-4"
                />
                <label htmlFor={`p-${m.id}`} className="flex-1 text-sm">
                  {m.id === myId ? `${m.name} (you)` : m.name}
                </label>
                {splitType !== "equal" && checked && (
                  <Input
                    type="number"
                    inputMode="decimal"
                    step={splitType === "shares" ? "1" : "0.01"}
                    placeholder={valueLabel[splitType]}
                    value={values[m.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
                    className="w-24"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {preview && "error" in preview ? (
        <p className="text-sm text-destructive">{preview.error}</p>
      ) : preview ? (
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-medium mb-1">Split preview</p>
          <ul className="space-y-0.5">
            {preview.map((s) => {
              const name = members.find((m) => m.id === s.user_id)?.name ?? s.user_id;
              return (
                <li key={s.user_id} className="flex justify-between">
                  <span>{name}</span>
                  <span>{formatMoney(s.share_cents, defaultCurrency)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Save expense"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
