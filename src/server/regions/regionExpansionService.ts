import { REGION_LABEL_TO_LAWD, REGION_SIMILARITY_SEED } from "./regionSimilaritySeed";

export interface ExpandedRegion {
  label: string;
  lawdCode5: string;
  reason: "exact" | "neighbor" | "same_lifestyle" | "price_comparable" | "explore";
  weight: number;
}

export function expandPreferredRegions(input: {
  preferredRegions: string[];
  preferredLawdCodes?: string[];
  currentHomeRegion?: string;
  currentHomeLawdCode5?: string | null;
  maxRegions?: number;
}): ExpandedRegion[] {
  const maxRegions = input.maxRegions ?? 6;
  const lawdCodes = [
    ...(input.preferredLawdCodes ?? []),
    ...input.preferredRegions.map((region) => REGION_LABEL_TO_LAWD[region]).filter(Boolean),
    input.currentHomeLawdCode5,
    input.currentHomeRegion ? REGION_LABEL_TO_LAWD[input.currentHomeRegion] : undefined
  ].filter((value): value is string => Boolean(value));

  const expanded = new Map<string, ExpandedRegion>();
  for (const code of lawdCodes) {
    const candidates = REGION_SIMILARITY_SEED[code] ?? [
      { label: input.preferredRegions[0] ?? "관심지역", lawdCode5: code, reason: "exact", weight: 1 }
    ];
    for (const candidate of candidates) {
      const existing = expanded.get(candidate.lawdCode5);
      if (!existing || candidate.weight > existing.weight) expanded.set(candidate.lawdCode5, candidate);
    }
  }

  if (expanded.size === 0) {
    expanded.set("27260", REGION_SIMILARITY_SEED["27260"][0]);
  }

  return [...expanded.values()].sort((a, b) => b.weight - a.weight).slice(0, maxRegions);
}
