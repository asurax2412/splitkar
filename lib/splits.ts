import type { SplitType } from "./types";

export type SplitInput = {
  type: SplitType;
  amountCents: number;
  participants: string[]; // user ids
  // For 'exact': map user_id -> share_cents
  // For 'percentage': map user_id -> percent (0-100)
  // For 'shares': map user_id -> share count
  values?: Record<string, number>;
};

export type ResolvedShare = { user_id: string; share_cents: number };

// Distribute integer paise as evenly as possible, giving the remainder
// to earlier participants. Guarantees sum equals amountCents.
function distributeRemainder(amountCents: number, n: number): number[] {
  const base = Math.floor(amountCents / n);
  const remainder = amountCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function resolveSplit(input: SplitInput): ResolvedShare[] {
  const { type, amountCents, participants, values = {} } = input;
  if (participants.length === 0) return [];

  if (type === "equal") {
    const parts = distributeRemainder(amountCents, participants.length);
    return participants.map((id, i) => ({ user_id: id, share_cents: parts[i] }));
  }

  if (type === "exact") {
    const shares = participants.map((id) => ({
      user_id: id,
      share_cents: Math.round(values[id] ?? 0),
    }));
    const sum = shares.reduce((s, x) => s + x.share_cents, 0);
    if (sum !== amountCents) {
      throw new Error(
        `Exact shares must sum to total. Got ${sum}, expected ${amountCents}.`,
      );
    }
    return shares;
  }

  if (type === "percentage") {
    const pctSum = participants.reduce((s, id) => s + (values[id] ?? 0), 0);
    if (Math.abs(pctSum - 100) > 0.01) {
      throw new Error(`Percentages must sum to 100. Got ${pctSum}.`);
    }
    // Compute floor of each share then distribute remainder to largest fractional parts.
    const raw = participants.map((id) => ({
      id,
      exact: (amountCents * (values[id] ?? 0)) / 100,
    }));
    const floored = raw.map((r) => ({ ...r, floor: Math.floor(r.exact), frac: r.exact - Math.floor(r.exact) }));
    let remainder = amountCents - floored.reduce((s, x) => s + x.floor, 0);
    const order = [...floored].sort((a, b) => b.frac - a.frac);
    const bonus = new Set<string>();
    for (let i = 0; i < remainder; i++) bonus.add(order[i].id);
    return floored.map((f) => ({
      user_id: f.id,
      share_cents: f.floor + (bonus.has(f.id) ? 1 : 0),
    }));
  }

  if (type === "shares") {
    const totalShares = participants.reduce((s, id) => s + (values[id] ?? 0), 0);
    if (totalShares <= 0) throw new Error("Share counts must be positive.");
    const raw = participants.map((id) => ({
      id,
      exact: (amountCents * (values[id] ?? 0)) / totalShares,
    }));
    const floored = raw.map((r) => ({ ...r, floor: Math.floor(r.exact), frac: r.exact - Math.floor(r.exact) }));
    let remainder = amountCents - floored.reduce((s, x) => s + x.floor, 0);
    const order = [...floored].sort((a, b) => b.frac - a.frac);
    const bonus = new Set<string>();
    for (let i = 0; i < remainder; i++) bonus.add(order[i].id);
    return floored.map((f) => ({
      user_id: f.id,
      share_cents: f.floor + (bonus.has(f.id) ? 1 : 0),
    }));
  }

  throw new Error(`Unknown split type: ${type}`);
}
