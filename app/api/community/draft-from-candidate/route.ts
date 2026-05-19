import { NextRequest, NextResponse } from "next/server";
import type { ComplexSignalCandidate } from "@/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const candidate = body.candidate as ComplexSignalCandidate | undefined;
  if (!candidate) {
    return NextResponse.json({ error: "candidate가 필요합니다." }, { status: 400 });
  }

  const title = `${candidate.region} ${candidate.complexName} ${areaBucketText(candidate.areaBucket)}, 갈아타기 후보로 어떤가요?`;
  const content = [
    `최근 실거래 기준가: ${candidate.referencePriceLabel ?? "미상"}`,
    `최근 90일 거래: ${candidate.volume90d}건`,
    `거래 집중도: ${candidate.transactionHeat.toFixed(1)}배`,
    `전고점 대비: ${candidate.drawdownFromHigh?.toFixed(1) ?? "미상"}%`,
    `전세가율: ${candidate.jeonseRatio?.toFixed(1) ?? "미상"}%`,
    `현재 집 매도 시 접근 가능 여부: ${candidate.userFit.possibleAfterSellingCurrentHome ? "가능" : "추가 준비"}`,
    "",
    "비슷한 가격대 후보와 비교하면 어떻게 보시나요?"
  ].join("\n");

  return NextResponse.json({ title, content, category: "move_up_consulting" });
}

function areaBucketText(bucket: string) {
  if (bucket === "84") return "84㎡급";
  if (bucket === "59") return "59㎡급";
  if (bucket === "74") return "74㎡급";
  if (bucket === "101") return "101㎡급";
  if (bucket === "under_40") return "40㎡ 미만";
  if (bucket === "over_101") return "101㎡ 초과";
  return bucket.replace("officetel_", "오피스텔 ");
}
