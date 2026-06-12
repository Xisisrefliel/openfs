/* ------------------------------------------------------------------ */
/* Ausbildungsnachweis client-side fetch + save helpers.               */
/* ------------------------------------------------------------------ */

import { parseOrThrow } from "@/lib/api";
import type { Attestation } from "@/server/ausbildungsnachweis";

/** Fetch the attestation for a single calendar event; null if none. */
export async function fetchAttestationForEvent(
  eventId: string | number,
): Promise<Attestation | null> {
  const res = await fetch(`/api/calendar-events/${eventId}/attestation`);
  if (res.status === 404) return null;
  const data = await parseOrThrow<{ attestation: Attestation }>(res);
  return data.attestation;
}

/** Fetch all attestations for a student. */
export async function fetchAttestationsForStudent(
  studentId: number,
): Promise<Attestation[]> {
  const data = await parseOrThrow<{ attestations: Attestation[] }>(
    await fetch(`/api/attestations?studentId=${studentId}`),
  );
  return data.attestations;
}

export type CreateAttestationPayload = {
  studentId: number;
  instructor: string;
  content: string;
  durationMin: number;
  signatureDataUrl: string;
};

/** POST a new attestation for the given calendar event. */
export async function saveAttestation(
  eventId: string | number,
  payload: CreateAttestationPayload,
): Promise<Attestation> {
  const data = await parseOrThrow<{ attestation: Attestation }>(
    await fetch(`/api/calendar-events/${eventId}/attestation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.attestation;
}
