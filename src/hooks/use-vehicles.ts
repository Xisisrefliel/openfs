/* ------------------------------------------------------------------ */
/* Fahrzeuge — single client-side source of truth                         */
/*                                                                    */
/* /fahrzeuge and Fahrzeug selection in other pages read from this hook  */
/* so all vehicle edits persist and survive reloads.                   */
/* ------------------------------------------------------------------ */

import { parseOrThrow, useFetchList } from "@/lib/api";

export type VehicleDetail = {
  label: string;
  value: string;
};

export type VehicleStatus = "aktiv" | "wartung";

export type Vehicle = {
  id: number;
  model: string;
  plate: string;
  klass: string;
  status: VehicleStatus;
  accent: string;
  details: VehicleDetail[];
};

type VehicleInput = Omit<Vehicle, "id">;

export async function fetchVehicles(): Promise<Vehicle[]> {
  const data = await parseOrThrow<{ vehicles: Vehicle[] }>(await fetch("/api/vehicles"));
  return data.vehicles;
}

export async function createVehicle(input: Partial<VehicleInput>): Promise<Vehicle> {
  return parseOrThrow<Vehicle>(
    await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateVehicle(
  id: number,
  input: Partial<VehicleInput>,
): Promise<Vehicle> {
  return parseOrThrow<Vehicle>(
    await fetch(`/api/vehicles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteVehicle(id: number): Promise<void> {
  await parseOrThrow<{ ok: true }>(
    await fetch(`/api/vehicles/${id}`, { method: "DELETE" }),
  );
}

export function useVehicles() {
  const {
    items: vehicles,
    loading,
    refresh,
  } = useFetchList(fetchVehicles, "Fahrzeuge konnten nicht geladen werden");
  return { vehicles, loading, refresh };
}
