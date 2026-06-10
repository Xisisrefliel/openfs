import { useEffect, useState } from "react";

import { getVehicleOptions } from "@/lib/vehicle-options";

type VehicleOptionsResponse = {
  vehicleOptions?: string[];
};

export function useVehicleOptions() {
  const [vehicleOptions, setVehicleOptions] = useState<string[]>(
    getVehicleOptions()
  );

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      try {
        const response = await fetch("/api/vehicle-options");
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as VehicleOptionsResponse;
        if (!active || !Array.isArray(data.vehicleOptions)) {
          return;
        }

        setVehicleOptions(data.vehicleOptions);
      } catch {
        // Keep fallback to the local default in case endpoint is unavailable.
      }
    };

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  return { vehicleOptions };
}
