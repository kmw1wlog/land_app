import { NextResponse } from "next/server";
import { createPublicDataSeedJob } from "@/server/public-data/services/publicDataJobService";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const job = await createPublicDataSeedJob(body);
  return NextResponse.json(job);
}
