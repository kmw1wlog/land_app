import { NextResponse } from "next/server";
import { reindexHomePathRag } from "@/server/rag/reindex";

export const runtime = "nodejs";

export async function POST() {
  const result = await reindexHomePathRag();
  return NextResponse.json({
    ok: true,
    ...result
  });
}
