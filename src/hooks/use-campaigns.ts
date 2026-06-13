/* ------------------------------------------------------------------ */
/* Kampagnen (Marketing) — single client-side source of truth           */
/*                                                                      */
/* /marketing reads from this hook so all campaign edits persist and    */
/* survive reloads.                                                     */
/* ------------------------------------------------------------------ */

import { parseOrThrow, useFetchList } from "@/lib/api";

export type CampaignChannel =
  | "Google Ads"
  | "Instagram"
  | "Facebook"
  | "TikTok"
  | "Flyer"
  | "Empfehlung"
  | "Webseite";

export type CampaignStatus = "aktiv" | "pausiert" | "beendet";

export type Campaign = {
  id: number;
  name: string;
  channel: CampaignChannel;
  budgetCents: number;
  spentCents: number;
  leads: number;
  signups: number;
  startDate: string;
  /** Empty string = open-ended (laufend). */
  endDate: string;
  status: CampaignStatus;
  notes: string;
  createdAt: string;
};

export type CampaignInput = Omit<Campaign, "id" | "createdAt">;

export async function fetchCampaigns(): Promise<Campaign[]> {
  const data = await parseOrThrow<{ campaigns: Campaign[] }>(
    await fetch("/api/campaigns"),
  );
  return data.campaigns;
}

export async function createCampaign(input: Partial<CampaignInput>): Promise<Campaign> {
  return parseOrThrow<Campaign>(
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateCampaign(
  id: number,
  input: Partial<CampaignInput>,
): Promise<Campaign> {
  return parseOrThrow<Campaign>(
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteCampaign(id: number): Promise<void> {
  await parseOrThrow<{ ok: true }>(
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" }),
  );
}

export function useCampaigns() {
  const {
    items: campaigns,
    loading,
    refresh,
  } = useFetchList(fetchCampaigns, "Kampagnen konnten nicht geladen werden");
  return { campaigns, loading, refresh };
}
