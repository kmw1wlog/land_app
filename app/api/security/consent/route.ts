import { NextResponse } from "next/server";
import { recordConsent } from "@/server/security/audit";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    consentType?: string;
    consentText?: string;
    granted?: boolean;
  };
  if (!body.userId || !body.consentType || !body.consentText || typeof body.granted !== "boolean") {
    return NextResponse.json({ error: "userId, consentType, consentText, granted are required" }, { status: 400 });
  }
  const consent = await recordConsent({
    userId: body.userId,
    consentType: body.consentType,
    consentText: body.consentText,
    granted: body.granted
  });
  return NextResponse.json({ consent });
}
