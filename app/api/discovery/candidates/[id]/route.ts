import { NextRequest, NextResponse } from "next/server";
import { sampleHomes, sampleProfiles } from "@/data/dummy";
import { prisma } from "@/server/db";
import { expandPreferredRegions } from "@/server/regions/regionExpansionService";
import { scoreComplexCandidate } from "@/server/signals/complexRecommendationService";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await prisma.complexSignalSnapshot.findUnique({ where: { id } });
  if (!snapshot) return NextResponse.json({ error: "candidate not found" }, { status: 404 });
  const regions = expandPreferredRegions({
    preferredRegions: sampleProfiles[0].preferredRegions,
    currentHomeRegion: sampleHomes[0].region,
    maxRegions: 6
  });
  const card = await scoreComplexCandidate({
    snapshot,
    userProfile: sampleProfiles[0],
    currentHome: sampleHomes[0],
    expandedRegion: regions.find((region) => region.lawdCode5 === snapshot.lawdCode5)
  });
  return NextResponse.json({ card });
}
