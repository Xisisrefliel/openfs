/* ------------------------------------------------------------------ */
/* German amount-in-words for Quittungen ("Betrag in Worten").         */
/*                                                                     */
/* Classic receipt style: cents are written as a fraction, e.g.        */
/* 40983 → "vierhundertneun Euro 83/100". Supports 0 … 999.999,99 EUR. */
/* ------------------------------------------------------------------ */

const UNITS = [
  "",
  "ein",
  "zwei",
  "drei",
  "vier",
  "fünf",
  "sechs",
  "sieben",
  "acht",
  "neun",
];
const TEENS = [
  "zehn",
  "elf",
  "zwölf",
  "dreizehn",
  "vierzehn",
  "fünfzehn",
  "sechzehn",
  "siebzehn",
  "achtzehn",
  "neunzehn",
];
const TENS = [
  "",
  "",
  "zwanzig",
  "dreißig",
  "vierzig",
  "fünfzig",
  "sechzig",
  "siebzig",
  "achtzig",
  "neunzig",
];

/** 0-999 as German words; 1 stays "ein" (caller decides ein/eins). */
function belowThousand(n: number): string {
  let words = "";
  const hundreds = Math.trunc(n / 100);
  const rest = n % 100;
  if (hundreds > 0) words += `${UNITS[hundreds]}hundert`;
  if (rest === 0) return words;
  if (rest < 10) return words + UNITS[rest];
  if (rest < 20) return words + TEENS[rest - 10];
  const unit = rest % 10;
  const ten = Math.trunc(rest / 10);
  return words + (unit > 0 ? `${UNITS[unit]}und` : "") + TENS[ten];
}

/**
 * Whole number 0 … 999.999 as German words.
 * `finalEin: false` (default) renders a trailing standalone 1 as "eins"
 * (counting style); `finalEin: true` keeps "ein" (before a noun, "ein Euro").
 */
export function numberToGermanWords(
  n: number,
  { finalEin = false }: { finalEin?: boolean } = {},
): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) {
    throw new Error(`Zahl außerhalb des Wortbereichs: ${n}`);
  }
  if (n === 0) return "null";
  const thousands = Math.trunc(n / 1000);
  const rest = n % 1000;
  let words = "";
  if (thousands > 0) words += `${belowThousand(thousands)}tausend`;
  if (rest > 0) words += belowThousand(rest);
  // belowThousand renders 1 as "ein"; a word-final "ein" becomes "eins"
  // unless the caller needs the attributive form ("ein Euro").
  if (words.endsWith("ein") && !finalEin) words += "s";
  return words;
}

/** 40983 → "vierhundertneun Euro 83/100" · 100 → "ein Euro 00/100" */
export function amountInWords(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0 || cents > 99_999_999) {
    throw new Error(`Betrag außerhalb des Wortbereichs: ${cents}`);
  }
  const euros = Math.trunc(cents / 100);
  const rest = cents % 100;
  const euroWords = numberToGermanWords(euros, { finalEin: true });
  return `${euroWords} Euro ${String(rest).padStart(2, "0")}/100`;
}
