/* ------------------------------------------------------------------ */
/* Bewertungen — single client-side source of truth                    */
/*                                                                     */
/* /bewertungen reads from this hook so all review edits (Antworten,   */
/* Ausblenden, Löschen) persist and survive reloads.                   */
/* ------------------------------------------------------------------ */

import { parseOrThrow, useFetchList } from "@/lib/api";

export const REVIEW_SOURCES = ["Google", "Facebook", "Webseite", "Intern"] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

export const REVIEW_STATUSES = ["neu", "beantwortet", "ausgeblendet"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type Review = {
  id: number;
  author: string;
  rating: number;
  source: ReviewSource;
  text: string;
  reply: string;
  status: ReviewStatus;
  date: string; // ISO "YYYY-MM-DD"
};

export type ReviewInput = Omit<Review, "id">;

export async function fetchReviews(): Promise<Review[]> {
  const data = await parseOrThrow<{ reviews: Review[] }>(await fetch("/api/reviews"));
  return data.reviews;
}

export async function createReview(input: Partial<ReviewInput>): Promise<Review> {
  return parseOrThrow<Review>(
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateReview(
  id: number,
  input: Partial<ReviewInput>,
): Promise<Review> {
  return parseOrThrow<Review>(
    await fetch(`/api/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteReview(id: number): Promise<void> {
  await parseOrThrow<{ ok: true }>(
    await fetch(`/api/reviews/${id}`, { method: "DELETE" }),
  );
}

export function useReviews() {
  const {
    items: reviews,
    loading,
    refresh,
  } = useFetchList(fetchReviews, "Bewertungen konnten nicht geladen werden");
  return { reviews, loading, refresh };
}
