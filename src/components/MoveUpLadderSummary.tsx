import { calculateMoveUpBudget, calculatePurchasePower } from "@/lib/calculations";
import { calculateFuturePurchasePower } from "@/lib/futurePlan";
import { formatKRW } from "@/lib/format";
import { buildMoveUpTargetBands } from "@/lib/moveUpBands";
import { analyzeUserState } from "@/lib/userState";
import type { CurrentHome, UserFinancialPlan, UserProfile } from "@/types";
import { Metric } from "./Metric";

interface MoveUpLadderSummaryProps {
  profile: UserProfile;
  currentHome: CurrentHome;
  financialPlan: UserFinancialPlan;
  compact?: boolean;
}

export function MoveUpLadderSummary({ profile, currentHome, financialPlan, compact = false }: MoveUpLadderSummaryProps) {
  const userState = analyzeUserState(profile, currentHome, financialPlan);
  const firstHomeMode = userState.position === "first_home_buyer";
  const bands = firstHomeMode
    ? buildFirstHomeTargetBands(financialPlan.targetHomePrice)
    : buildMoveUpTargetBands(currentHome.estimatedCurrentPrice);
  const purchasePowerNow = calculatePurchasePower(profile, {
    currentHome,
    homeCount: userState.mortgageHomeCount,
    isFirstTimeBuyer: userState.isFirstTimeBuyer
  });
  const moveUpPower = calculateMoveUpBudget(profile, currentHome);
  const futureFiveYearPower = calculateFuturePurchasePower(profile, currentHome, financialPlan, 5);
  const targetShortage = Math.max(0, financialPlan.targetHomePrice - purchasePowerNow);

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-moss">{firstHomeMode ? "첫 구매 기준 현재 상태" : "현재 기준점에서 다음 경로"}</p>
          <h2 className="mt-1 text-xl font-black leading-tight text-ink">{firstHomeMode ? "첫 주택 구매력 요약" : "내 구매력 요약"}</h2>
          <p className="mt-1 text-xs leading-5 text-black/55">
            {firstHomeMode
              ? "보유 주택 매도값을 빼고 현금, 보증금, 월저축, 첫 구매 LTV 기준으로 계산합니다."
              : "단지를 보기 전에 현재 구매력, 정리 후 구매력, 5년 뒤 구매력을 먼저 계산합니다."}
          </p>
        </div>
        <div className="rounded-md bg-ink px-3 py-2 text-right text-white">
          <p className="text-[10px] font-bold text-white/55">{firstHomeMode ? "목표 가격" : "현재 기준점"}</p>
          <p className="text-base font-black">{formatKRW(firstHomeMode ? financialPlan.targetHomePrice : currentHome.estimatedCurrentPrice)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {bands.map((band) => (
          <div key={band.multiplier} className={`rounded-md ${band.multiplier === 1.5 ? "bg-moss text-white" : "bg-black/5 text-ink"} p-3`}>
            <p className="text-[10px] font-bold opacity-65">{firstHomeMode ? band.label : `${band.multiplier.toFixed(1)}배`}</p>
            <p className="mt-1 text-sm font-black">{formatKRW(Math.round(band.targetMinPrice === band.targetMaxPrice ? band.targetMinPrice : (band.targetMinPrice + band.targetMaxPrice) / 2))}</p>
            {!compact ? <p className="mt-1 text-[10px] font-bold opacity-65">{band.label}</p> : null}
          </div>
        ))}
      </div>

      {!compact ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Metric label={firstHomeMode ? "첫 매수 여력" : "현재 매수 여력"} value={formatKRW(purchasePowerNow)} />
          <Metric label={firstHomeMode ? "목표 부족액" : "정리 후 구매력"} value={formatKRW(firstHomeMode ? targetShortage : moveUpPower)} />
          <Metric label="5년 뒤 예상" value={formatKRW(futureFiveYearPower)} />
        </div>
      ) : null}
    </section>
  );
}

function buildFirstHomeTargetBands(targetHomePrice: number) {
  return [
    {
      multiplier: 1.3 as const,
      label: "보수 목표",
      currentHomePrice: targetHomePrice,
      targetMinPrice: Math.round(targetHomePrice * 0.85),
      targetMaxPrice: Math.round(targetHomePrice * 0.85),
      description: "첫 구매에서 월부담을 낮추는 보수 가격대입니다."
    },
    {
      multiplier: 1.5 as const,
      label: "기준 목표",
      currentHomePrice: targetHomePrice,
      targetMinPrice: targetHomePrice,
      targetMaxPrice: targetHomePrice,
      description: "온보딩에서 설정한 첫 주택 목표 가격대입니다."
    },
    {
      multiplier: 2 as const,
      label: "확장 목표",
      currentHomePrice: targetHomePrice,
      targetMinPrice: Math.round(targetHomePrice * 1.15),
      targetMaxPrice: Math.round(targetHomePrice * 1.15),
      description: "소득/저축 증가가 필요한 확장 가격대입니다."
    }
  ];
}
