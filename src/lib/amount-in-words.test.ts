import { describe, expect, test } from "bun:test";

import { amountInWords, numberToGermanWords } from "./amount-in-words";

describe("numberToGermanWords", () => {
  test("digits and teens", () => {
    expect(numberToGermanWords(0)).toBe("null");
    expect(numberToGermanWords(1)).toBe("eins");
    expect(numberToGermanWords(1, { finalEin: true })).toBe("ein");
    expect(numberToGermanWords(7)).toBe("sieben");
    expect(numberToGermanWords(11)).toBe("elf");
    expect(numberToGermanWords(12)).toBe("zwölf");
    expect(numberToGermanWords(16)).toBe("sechzehn");
    expect(numberToGermanWords(17)).toBe("siebzehn");
  });

  test("tens with und-inversion", () => {
    expect(numberToGermanWords(20)).toBe("zwanzig");
    expect(numberToGermanWords(21)).toBe("einundzwanzig");
    expect(numberToGermanWords(30)).toBe("dreißig");
    expect(numberToGermanWords(66)).toBe("sechsundsechzig");
    expect(numberToGermanWords(77)).toBe("siebenundsiebzig");
    expect(numberToGermanWords(99)).toBe("neunundneunzig");
  });

  test("hundreds", () => {
    expect(numberToGermanWords(100)).toBe("einhundert");
    expect(numberToGermanWords(101)).toBe("einhunderteins");
    expect(numberToGermanWords(101, { finalEin: true })).toBe("einhundertein");
    expect(numberToGermanWords(111)).toBe("einhundertelf");
    expect(numberToGermanWords(409)).toBe("vierhundertneun");
    expect(numberToGermanWords(999)).toBe("neunhundertneunundneunzig");
  });

  test("thousands", () => {
    expect(numberToGermanWords(1000)).toBe("eintausend");
    expect(numberToGermanWords(1250)).toBe("eintausendzweihundertfünfzig");
    expect(numberToGermanWords(19999)).toBe(
      "neunzehntausendneunhundertneunundneunzig"
    );
    expect(numberToGermanWords(21000)).toBe("einundzwanzigtausend");
    expect(numberToGermanWords(999999)).toBe(
      "neunhundertneunundneunzigtausendneunhundertneunundneunzig"
    );
  });

  test("rejects out-of-range input", () => {
    expect(() => numberToGermanWords(-1)).toThrow();
    expect(() => numberToGermanWords(1_000_000)).toThrow();
    expect(() => numberToGermanWords(1.5)).toThrow();
  });
});

describe("amountInWords", () => {
  test("classic receipt style", () => {
    expect(amountInWords(40983)).toBe("vierhundertneun Euro 83/100");
    expect(amountInWords(125000)).toBe(
      "eintausendzweihundertfünfzig Euro 00/100"
    );
    expect(amountInWords(45000)).toBe("vierhundertfünfzig Euro 00/100");
    expect(amountInWords(0)).toBe("null Euro 00/100");
    expect(amountInWords(5)).toBe("null Euro 05/100");
  });

  test("uses attributive ein before Euro", () => {
    expect(amountInWords(100)).toBe("ein Euro 00/100");
    expect(amountInWords(2101)).toBe("einundzwanzig Euro 01/100");
    expect(amountInWords(10100)).toBe("einhundertein Euro 00/100");
  });

  test("rejects out-of-range amounts", () => {
    expect(() => amountInWords(-1)).toThrow();
    expect(() => amountInWords(100_000_000)).toThrow();
  });
});
