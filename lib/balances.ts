import type { Expense, ExpenseShare, Payment } from "./types";

export type PairBalance = {
  // Positive: counterparty owes the user. Negative: user owes counterparty.
  counterpartyId: string;
  amountCents: number;
};

// Compute net balances for a single user against everyone else in a group.
// Convention: positive amount means the OTHER user owes ME.
export function computeMyBalances(
  myUserId: string,
  expenses: Expense[],
  shares: ExpenseShare[],
  payments: Payment[],
): PairBalance[] {
  const net = new Map<string, number>();
  const add = (other: string, delta: number) => {
    net.set(other, (net.get(other) ?? 0) + delta);
  };

  const sharesByExpense = new Map<string, ExpenseShare[]>();
  for (const s of shares) {
    const list = sharesByExpense.get(s.expense_id) ?? [];
    list.push(s);
    sharesByExpense.set(s.expense_id, list);
  }

  for (const e of expenses) {
    if (e.deleted_at) continue;
    const exShares = sharesByExpense.get(e.id) ?? [];
    if (e.paid_by === myUserId) {
      // Others owe me their share.
      for (const s of exShares) {
        if (s.user_id !== myUserId) add(s.user_id, s.share_cents);
      }
    } else {
      // I might owe the payer my share.
      const myShare = exShares.find((s) => s.user_id === myUserId);
      if (myShare) add(e.paid_by, -myShare.share_cents);
    }
  }

  for (const p of payments) {
    if (p.from_user === myUserId) {
      // I paid them → reduces what I owe (or increases what they owe me).
      add(p.to_user, p.amount_cents);
    } else if (p.to_user === myUserId) {
      // They paid me.
      add(p.from_user, -p.amount_cents);
    }
  }

  return [...net.entries()]
    .map(([counterpartyId, amountCents]) => ({ counterpartyId, amountCents }))
    .filter((b) => b.amountCents !== 0);
}

// Compute the full N×N balance matrix for a group (used by debt simplification).
export function computeGroupNet(
  memberIds: string[],
  expenses: Expense[],
  shares: ExpenseShare[],
  payments: Payment[],
): Map<string, number> {
  // Positive = creditor, negative = debtor
  const net = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const sharesByExpense = new Map<string, ExpenseShare[]>();
  for (const s of shares) {
    const list = sharesByExpense.get(s.expense_id) ?? [];
    list.push(s);
    sharesByExpense.set(s.expense_id, list);
  }
  for (const e of expenses) {
    if (e.deleted_at) continue;
    net.set(e.paid_by, (net.get(e.paid_by) ?? 0) + e.amount_cents);
    for (const s of sharesByExpense.get(e.id) ?? []) {
      net.set(s.user_id, (net.get(s.user_id) ?? 0) - s.share_cents);
    }
  }
  for (const p of payments) {
    net.set(p.from_user, (net.get(p.from_user) ?? 0) + p.amount_cents);
    net.set(p.to_user, (net.get(p.to_user) ?? 0) - p.amount_cents);
  }
  return net;
}

export type SettlementTx = { from: string; to: string; amountCents: number };

// Simplify debts: produce the minimum-ish set of transactions that settles the group.
// Uses a greedy max-creditor / max-debtor pairing.
export function simplifyDebts(net: Map<string, number>): SettlementTx[] {
  const debtors: { id: string; amt: number }[] = [];
  const creditors: { id: string; amt: number }[] = [];
  for (const [id, amt] of net.entries()) {
    if (amt < -0) debtors.push({ id, amt: -amt });
    else if (amt > 0) creditors.push({ id, amt });
  }
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const txs: SettlementTx[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0) txs.push({ from: debtors[i].id, to: creditors[j].id, amountCents: pay });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return txs;
}
