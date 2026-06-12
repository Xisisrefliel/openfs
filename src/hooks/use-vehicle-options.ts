import { useEffect, useState } from "react";

import { UNASSIGNED_VEHICLE } from "@/lib/vehicle-options";
import { fetchVehicles } from "@/hooks/use-vehicles";

export function useVehicleOptions() {
  const [vehicleOptions, setVehicleOptions] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      try {
        const vehicles = await fetchVehicles();
        if (!active) {
          return;
        }

        const models = vehicles.map((vehicle) => vehicle.model);
        setVehicleOptions([...new Set(models), UNASSIGNED_VEHICLE]);
      } catch {
        // Keep the selector usable if the endpoint is temporarily unavailable.
        if (active) setVehicleOptions([UNASSIGNED_VEHICLE]);
      }
    };

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  return { vehicleOptions };
}
