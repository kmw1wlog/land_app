import { NextRequest, NextResponse } from "next/server";
import { reindexHomePathRag } from "@/server/rag/reindex";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const token = request.headers.get("x-admin-token");
    if (!process.env.RAG_ADMIN_TOKEN || token !== process.env.RAG_ADMIN_TOKEN) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const result = await reindexHomePathRag();
  return NextResponse.json({
    ok: true,
    ...result
  });
}
