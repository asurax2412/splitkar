// Money is stored as integer paise (1 rupee = 100 paise) to avoid float issues.

export function rupeesToPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatMoney(paise: number, currency = "INR"): string {
  const value = paiseToRupees(paise);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatSigned(paise: number, currency = "INR"): string {
  const sign = paise < 0 ? "-" : "";
  return sign + formatMoney(Math.abs(paise), currency);
}
