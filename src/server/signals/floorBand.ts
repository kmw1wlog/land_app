import type { FloorBand } from "@/types";

export function getFloorBand(floor?: number | null, totalFloors?: number | null): FloorBand {
  if (!floor || floor <= 0) return "unknown";

  if (!totalFloors || totalFloors <= 0) {
    if (floor <= 5) return "low";
    if (floor <= 15) return "mid";
    return "high";
  }

  const ratio = floor / totalFloors;
  if (ratio <= 0.3) return "low";
  if (ratio >= 0.7) return "high";
  return "mid";
}

export function floorBandLabel(floorBand: FloorBand): string {
  const labels: Record<FloorBand, string> = {
    low: "저층",
    mid: "중층",
    high: "고층",
    unknown: "층수 미상"
  };
  return labels[floorBand];
}
