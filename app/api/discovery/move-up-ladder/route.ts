import { NextRequest, NextResponse } from "next/server";
import { sampleHomes, sampleProfiles } from "@/data/dummy";
import { calculateMoveUpBudget, calculatePurchasePower } from "@/lib/calculations";
import { calculateFuturePurchasePower } from "@/lib/futurePlan";
import { buildMoveUpTargetBands } from "@/lib/moveUpBands";
import type { CurrentHome, UserFinancialPlan, UserProfile } from "@/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (process.env.APP_ENV === "production" && (!body.profile || !body.currentHome || !body.financialPlan)) {
    return NextResponse.json({ error: "profile/currentHome/financialPlan이 필요합니다." }, { status: 400 });
  }

  const profile: UserProfile = body.profile ?? sampleProfiles[0];
  const currentHome: CurrentHome = body.currentHome ?? sampleHomes[0];
  const financialPlan: UserFinancialPlan = body.financialPlan ?? {
    annualIncomeGrowthRate: 0.03,
    monthlySavingsGrowthRate: 0.02,
    expectedBonusPerYear: 0,
    maxComfortableMonthlyPayment: 1_500_000,
    parentalSupport: 0,
    targetHomePrice: 650_000_000,
    targetRegion: profile.preferredRegions[0] ?? currentHome.region,
    targetHorizonYears: 5,
    targetMonthlyCashFlow: profile.targetMonthlyCashFlow
  };

  return NextResponse.json({
    currentHomePrice: currentHome.estimatedCurrentPrice,
    bands: buildMoveUpTargetBands(currentHome.estimatedCurrentPrice),
    purchasePower: {
      now: calculatePurchasePower(profile, { currentHome, homeCount: 1 }),
      afterSale: calculateMoveUpBudget(profile, currentHome),
      year3: calculateFuturePurchasePower(profile, currentHome, financialPlan, 3),
      year5: calculateFuturePurchasePower(profile, currentHome, financialPlan, 5),
      year10: calculateFuturePurchasePower(profile, currentHome, financialPlan, 10)
    },
    message: "지금 집 기준으로 현재/미래 갈아타기 사다리를 계산했습니다."
  });
}
