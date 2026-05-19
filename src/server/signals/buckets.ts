import type { AreaBucket } from "@/types";

export function getAreaBucket(areaM2: number, propertyType: "apartment" | "officetel"): AreaBucket {
  if (propertyType === "officetel") {
    if (areaM2 < 30) return "officetel_under_30";
    if (areaM2 < 45) return "officetel_30_45";
    if (areaM2 < 60) return "officetel_45_60";
    return "officetel_over_60";
  }

  if (areaM2 < 45) return "under_40";
  if (areaM2 < 65) return "59";
  if (areaM2 < 80) return "74";
  if (areaM2 < 90) return "84";
  if (areaM2 < 115) return "101";
  return "over_101";
}

export function areaBucketLabel(bucket: AreaBucket): string {
  const labels: Record<AreaBucket, string> = {
    under_40: "40㎡ 미만",
    "59": "59㎡급",
    "74": "74㎡급",
    "84": "84㎡급",
    "101": "101㎡급",
    over_101: "101㎡ 초과",
    officetel_under_30: "오피스텔 30㎡ 미만",
    officetel_30_45: "오피스텔 30~45㎡",
    officetel_45_60: "오피스텔 45~60㎡",
    officetel_over_60: "오피스텔 60㎡ 초과"
  };
  return labels[bucket];
}
