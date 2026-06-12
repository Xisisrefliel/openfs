/* ------------------------------------------------------------------ */
/* Money utilities — all amounts are integer cents.                    */
/*                                                                     */
/* Floats never touch business logic: parsing goes string → cents,     */
/* VAT splits use integer math, formatting goes cents → de-DE string.  */
/* Shared between server (booking engine) and client (forms, tables).  */
/* ------------------------------------------------------------------ */

const centsFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 40983 → "409,83" · 125000 → "1.250,00" · -80000 → "-800,00" */
export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`Ungültiger Centbetrag: ${cents}`);
  }
  const euros = Math.trunc(Math.abs(cents) / 100);
  const rest = Math.abs(cents) % 100;
  const sign = cents < 0 ? "-" : "";
  return sign + centsFormatter.format(euros + rest / 100);
}

/** 40983 → "409,83 EUR" */
export function formatEuro(cents: number): string {
  return `${formatCents(cents)} EUR`;
}

/**
 * Parse a German money input into cents.
 * Accepts "409,83", "1.250,00", "1250", "1.250", "0,5".
 * Returns null for anything else (negative, garbage, English decimals).
 */
export function parseEuroToCents(input: string): number | null {
  const cleaned = input.replace(/\s|€|EUR/gi, "");
  if (!cleaned) return null;
  // German format only: optional dot thousand groups, comma decimals.
  const valid =
    /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned) || /^\d+(,\d{1,2})?$/.test(cleaned);
  if (!valid) return null;
  const [eurosPart, centsPart = ""] = cleaned.replace(/\./g, "").split(",");
  const euros = Number(eurosPart);
  const cents = Number(centsPart.padEnd(2, "0"));
  if (!Number.isSafeInteger(euros * 100 + cents)) return null;
  return euros * 100 + cents;
}

export type VatSplit = {
  grossCents: number;
  netCents: number;
  vatCents: number;
  rate: number;
};

/**
 * Split a gross amount into net + VAT for a given rate (herausrechnen).
 * Integer math: net = round(gross * 100 / (100 + rate)), vat = gross - net,
 * so net + vat === gross always holds.
 */
export function splitVat(grossCents: number, rate: number): VatSplit {
  if (!Number.isInteger(grossCents) || grossCents < 0) {
    throw new Error(`Ungültiger Bruttobetrag: ${grossCents}`);
  }
  if (![0, 7, 19].includes(rate)) {
    throw new Error(`Ungültiger Steuersatz: ${rate}`);
  }
  const netCents = Math.round((grossCents * 100) / (100 + rate));
  return { grossCents, netCents, vatCents: grossCents - netCents, rate };
}
