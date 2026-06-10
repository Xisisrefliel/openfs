export const UNASSIGNED_VEHICLE = "Nicht zugeteilt";

const fahrzeugeModels = ["Audi A3", "Cupra Born", "VW Golf"];

export function getVehicleOptions() {
  return [...fahrzeugeModels, UNASSIGNED_VEHICLE];
}
