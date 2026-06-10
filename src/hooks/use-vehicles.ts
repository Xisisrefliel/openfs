/* ------------------------------------------------------------------ */
/* Fahrzeuge — single client-side source of truth                         */
/*                                                                    */
/* /fahrzeuge and Fahrzeug selection in other pages read from this hook  */
/* so all vehicle edits persist and survive reloads.                   */
/* ------------------------------------------------------------------ */

import { useCallback, useEffect, useState } from "react";

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

async function parseOrThrow<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? "Anfrage fehlgeschlagen.");
  }
  return data;
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const data = await parseOrThrow<{ vehicles: Vehicle[] }>(
    await fetch("/api/vehicles")
  );
  return data.vehicles;
}

export async function createVehicle(
  input: Partial<VehicleInput>
): Promise<Vehicle> {
  return parseOrThrow<Vehicle>(
    await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function updateVehicle(
  id: number,
  input: Partial<VehicleInput>
): Promise<Vehicle> {
  return parseOrThrow<Vehicle>(
    await fetch(`/api/vehicles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setVehicles(await fetchVehicles());
    } catch (error) {
      console.error("Fahrzeuge konnten nicht geladen werden:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { vehicles, loading, refresh };
}
