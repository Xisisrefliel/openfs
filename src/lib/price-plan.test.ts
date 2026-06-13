import { describe, expect, test } from "bun:test";

import { resolveLessonPrice, type PricePlanRecord } from "@/lib/price-plan";

/** Minimal helper to build a PricePlanRecord for tests. */
function makePlan(overrides: Partial<PricePlanRecord> = {}): PricePlanRecord {
  return {
    id: 1,
    name: "Standard Tarif",
    guaranteedMonths: 240,
    components: [
      { label: "Fahrübungsstunde", durationMin: 45, priceCents: 65_00 },
      { label: "Nachtfahrt", durationMin: 45, priceCents: 75_00 },
      { label: "Lernmaterial", priceCents: null },
    ],
    ...overrides,
  };
}

describe("resolveLessonPrice", () => {
  test("happy path: returns component and priceCents for default label", () => {
    const result = resolveLessonPrice(makePlan());
    expect(result).not.toBeNull();
    expect(result!.priceCents).toBe(65_00);
    expect(result!.component.label).toBe("Fahrübungsstunde");
    expect(result!.component.durationMin).toBe(45);
  });

  test("custom componentLabel is matched correctly", () => {
    const result = resolveLessonPrice(makePlan(), "Nachtfahrt");
    expect(result).not.toBeNull();
    expect(result!.priceCents).toBe(75_00);
  });

  test("plan is undefined → null", () => {
    expect(resolveLessonPrice(undefined)).toBeNull();
  });

  test("component label not found in plan → null", () => {
    expect(resolveLessonPrice(makePlan(), "Gibt es nicht")).toBeNull();
  });

  test("component with priceCents null → null (included / no separate charge)", () => {
    expect(resolveLessonPrice(makePlan(), "Lernmaterial")).toBeNull();
  });

  test("plan with empty components → null", () => {
    expect(resolveLessonPrice(makePlan({ components: [] }))).toBeNull();
  });

  test("returns the exact priceCents from the component", () => {
    const plan = makePlan({
      components: [{ label: "Fahrübungsstunde", durationMin: 45, priceCents: 55_00 }],
    });
    const result = resolveLessonPrice(plan);
    expect(result!.priceCents).toBe(55_00);
  });
});
