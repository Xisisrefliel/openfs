/* ------------------------------------------------------------------ */
/* Preispläne — types + one-time DB seed.                              */
/*                                                                     */
/* At runtime the plans live in SQLite (price_plans table, served via  */
/* /api/price-plans) — pages read them through usePricePlans() so      */
/* edits persist. The seed below is only imported by the server to     */
/* fill an empty database (src/server/db.ts). Amounts are integer      */
/* cents like everywhere else (src/lib/money.ts).                      */
/* ------------------------------------------------------------------ */

export type PriceComponent = {
  label: string;
  /** Unit duration in minutes — omitted for flat items (Grundbetrag). */
  durationMin?: number | null;
  /** null = included / no separate charge (e.g. Lernmaterial). */
  priceCents: number | null;
};

export type PricePlanInput = {
  name: string;
  /** Guaranteed price period in months. */
  guaranteedMonths: number;
  components: PriceComponent[];
};

export type PricePlanRecord = PricePlanInput & { id: number };

/**
 * Resolve the price for a practical lesson component from a student's
 * price plan. Returns the matching component and its price in cents, or
 * null when the plan is missing, the component is not found, or the
 * component's priceCents is null (included / no separate charge).
 *
 * @param plan       The student's price plan (or undefined if none assigned).
 * @param componentLabel  Label of the component to look up (default: "Fahrübungsstunde").
 */
export function resolveLessonPrice(
  plan: PricePlanRecord | undefined,
  componentLabel = "Fahrübungsstunde"
): { component: PriceComponent; priceCents: number } | null {
  if (!plan) return null;
  const component = plan.components.find(c => c.label === componentLabel);
  if (!component) return null;
  if (component.priceCents == null) return null;
  return { component, priceCents: component.priceCents };
}

export const PRICE_PLAN_SEED: PricePlanInput[] = [
  {
    name: "Standard Tarif",
    guaranteedMonths: 240,
    components: [
      { label: "Grundbetrag", priceCents: 100_00 },
      { label: "Nachtfahrt", durationMin: 45, priceCents: 75_00 },
      { label: "Autobahnfahrt", durationMin: 45, priceCents: 75_00 },
      { label: "Überlandfahrt", durationMin: 45, priceCents: 75_00 },
      { label: "Fahrübungsstunde", durationMin: 45, priceCents: 65_00 },
      { label: "Schaltkompetenzprüfung", durationMin: 15, priceCents: 70_00 },
      { label: "Theorieprüfung", durationMin: 45, priceCents: 130_00 },
      { label: "Praktische Prüfung", durationMin: 55, priceCents: 280_00 },
      { label: "Lernmaterial", priceCents: null },
    ],
  },
  {
    name: "Rabatt Tarif",
    guaranteedMonths: 240,
    components: [
      { label: "Grundbetrag", priceCents: 89_00 },
      { label: "Nachtfahrt", durationMin: 45, priceCents: 69_00 },
      { label: "Autobahnfahrt", durationMin: 45, priceCents: 69_00 },
      { label: "Überlandfahrt", durationMin: 45, priceCents: 69_00 },
      { label: "Fahrübungsstunde", durationMin: 45, priceCents: 55_00 },
      { label: "Schaltkompetenzprüfung", durationMin: 15, priceCents: 60_00 },
      { label: "Theorieprüfung", durationMin: 45, priceCents: 110_00 },
      { label: "Praktische Prüfung", durationMin: 55, priceCents: 240_00 },
      { label: "Lernmaterial", priceCents: null },
    ],
  },
];
