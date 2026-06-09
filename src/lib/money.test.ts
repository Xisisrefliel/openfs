import { describe, expect, test } from "bun:test";

import { formatCents, formatEuro, parseEuroToCents, splitVat } from "./money";

describe("parseEuroToCents", () => {
  test("parses plain German decimals", () => {
    expect(parseEuroToCents("409,83")).toBe(40983);
    expect(parseEuroToCents("0,5")).toBe(50);
    expect(parseEuroToCents("0,05")).toBe(5);
    expect(parseEuroToCents("100")).toBe(10000);
  });

  test("parses thousand separators", () => {
    expect(parseEuroToCents("1.250,00")).toBe(125000);
    expect(parseEuroToCents("1.250")).toBe(125000);
    expect(parseEuroToCents("12.345.678,90")).toBe(1234567890);
  });

  test("tolerates whitespace and currency suffixes", () => {
    expect(parseEuroToCents(" 409,83 € ")).toBe(40983);
    expect(parseEuroToCents("409,83 EUR")).toBe(40983);
  });

  test("rejects garbage, negatives and English decimals", () => {
    expect(parseEuroToCents("")).toBeNull();
    expect(parseEuroToCents("abc")).toBeNull();
    expect(parseEuroToCents("-5,00")).toBeNull();
    expect(parseEuroToCents("409.83")).toBeNull(); // dot is not a decimal sep
    expect(parseEuroToCents("1,234.56")).toBeNull();
    expect(parseEuroToCents("1,999")).toBeNull(); // 3 decimal digits
    expect(parseEuroToCents("1..0")).toBeNull();
  });
});

describe("formatCents / formatEuro", () => {
  test("formats de-DE", () => {
    expect(formatCents(40983)).toBe("409,83");
    expect(formatCents(125000)).toBe("1.250,00");
    expect(formatCents(5)).toBe("0,05");
    expect(formatCents(0)).toBe("0,00");
    expect(formatCents(-80000)).toBe("-800,00");
    expect(formatEuro(40983)).toBe("409,83 EUR");
  });

  test("round-trips with parse", () => {
    for (const cents of [0, 1, 99, 100, 40983, 125000, 99999999]) {
      expect(parseEuroToCents(formatCents(cents))).toBe(cents);
    }
  });

  test("rejects non-integer cents", () => {
    expect(() => formatCents(1.5)).toThrow();
  });
});

describe("splitVat", () => {
  test("splits 19% out of gross", () => {
    // 409,83 brutto @19% → 344,39 netto + 65,44 USt
    expect(splitVat(40983, 19)).toEqual({
      grossCents: 40983,
      netCents: 34439,
      vatCents: 6544,
      rate: 19,
    });
    // 100,00 brutto @19% → 84,03 + 15,97
    expect(splitVat(10000, 19)).toEqual({
      grossCents: 10000,
      netCents: 8403,
      vatCents: 1597,
      rate: 19,
    });
  });

  test("splits 7% and 0%", () => {
    expect(splitVat(10700, 7)).toEqual({
      grossCents: 10700,
      netCents: 10000,
      vatCents: 700,
      rate: 7,
    });
    expect(splitVat(10000, 0)).toEqual({
      grossCents: 10000,
      netCents: 10000,
      vatCents: 0,
      rate: 0,
    });
  });

  test("net + vat always equals gross", () => {
    for (let gross = 0; gross <= 5000; gross++) {
      for (const rate of [0, 7, 19]) {
        const { netCents, vatCents } = splitVat(gross, rate);
        expect(netCents + vatCents).toBe(gross);
      }
    }
  });

  test("rejects invalid input", () => {
    expect(() => splitVat(-1, 19)).toThrow();
    expect(() => splitVat(10.5, 19)).toThrow();
    expect(() => splitVat(100, 16)).toThrow();
  });
});
