"use client";

import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";

type ExpenseLite = {
  id: string;
  paid_by: string;
  amount_cents: number;
  expense_date: string;
  category: string | null;
};

type Granularity = "week" | "month" | "year";

const COLORS = [
  "#22c55e", // green
  "#0ea5e9", // sky
  "#a855f7", // purple
  "#f59e0b", // amber
  "#ef4444", // red
  "#14b8a6", // teal
  "#ec4899", // pink
  "#84cc16", // lime
];

function bucketKey(dateStr: string, g: Granularity): string {
  const d = new Date(dateStr);
  if (g === "year") return String(d.getFullYear());
  if (g === "month") {
    return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
  }
  // week — ISO week starting Monday
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() - day + 1);
  return `${tmp.getUTCMonth() + 1}/${tmp.getUTCDate()}`;
}

export function DashboardCharts({
  expenses,
  myUserId,
}: {
  expenses: ExpenseLite[];
  myUserId: string;
}) {
  const [g, setG] = useState<Granularity>("month");
  const [scope, setScope] = useState<"all" | "mine">("all");

  const filtered = useMemo(
    () =>
      scope === "mine" ? expenses.filter((e) => e.paid_by === myUserId) : expenses,
    [expenses, scope, myUserId],
  );

  const timeSeries = useMemo(() => {
    const buckets = new Map<string, number>();
    const order: string[] = [];
    const sorted = [...filtered].sort(
      (a, b) => +new Date(a.expense_date) - +new Date(b.expense_date),
    );
    for (const e of sorted) {
      const k = bucketKey(e.expense_date, g);
      if (!buckets.has(k)) {
        order.push(k);
        buckets.set(k, 0);
      }
      buckets.set(k, buckets.get(k)! + e.amount_cents);
    }
    return order.map((k) => ({
      label: k,
      total: buckets.get(k)! / 100,
    }));
  }, [filtered, g]);

  const categoryData = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of filtered) {
      const k = e.category?.trim() || "Uncategorized";
      m.set(k, (m.get(k) ?? 0) + e.amount_cents);
    }
    return [...m.entries()]
      .map(([name, value]) => ({ name, value: value / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filtered]);

  const grandTotal = filtered.reduce((s, e) => s + e.amount_cents, 0);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold">Spending insights</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            {(["week", "month", "year"] as Granularity[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setG(opt)}
                className={`px-3 py-1 capitalize ${
                  g === opt ? "bg-foreground text-background" : "bg-background"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            {(["all", "mine"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setScope(opt)}
                className={`px-3 py-1 ${
                  scope === opt ? "bg-foreground text-background" : "bg-background"
                }`}
              >
                {opt === "all" ? "All" : "Paid by me"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Total tracked: <span className="font-medium text-foreground">{formatMoney(grandTotal)}</span>
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No expenses yet. Add some to see charts.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium mb-2 capitalize">By {g}</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    formatter={(value) => formatMoney(Math.round(Number(value) * 100))}
                  />
                  <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">By category</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={(entry) => String(entry.name ?? "")}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatMoney(Math.round(Number(value) * 100))}
                  />
                  <Legend fontSize={11} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
