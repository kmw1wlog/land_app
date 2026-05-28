import { calculateFuturePurchasePower } from "@/lib/futurePlan";
import { formatKRW } from "@/lib/format";
import { buildMoveUpTargetBands } from "@/lib/moveUpBands";
import { analyzeUserState } from "@/lib/userState";
import type { CurrentHome, UserFinancialPlan, UserProfile } from "@/types";

interface FutureLadderTimelineProps {
  profile: UserProfile;
  currentHome: CurrentHome;
  financialPlan: UserFinancialPlan;
}

export function FutureLadderTimeline({ profile, currentHome, financialPlan }: FutureLadderTimelineProps) {
  const userState = analyzeUserState(profile, currentHome, financialPlan);
  const firstHomeMode = userState.position === "first_home_buyer";
  const years = [0, 3, 5, 10];
  const powers = years.map((year) => ({
    year,
    value:
      year === 0
        ? calculateFuturePurchasePower(profile, currentHome, financialPlan, 0)
        : calculateFuturePurchasePower(profile, currentHome, financialPlan, year)
  }));
  const bands = firstHomeMode ? [] : buildMoveUpTargetBands(currentHome.estimatedCurrentPrice);

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4">
      <div>
        <p className="text-xs font-bold text-moss">{firstHomeMode ? "첫 구매 준비 속도" : "미래에 어디까지 갈 수 있나"}</p>
        <h2 className="mt-1 text-xl font-black text-ink">{firstHomeMode ? "첫 집 도달 경로" : "내 주거 경로"}</h2>
        <p className="mt-1 text-xs leading-5 text-black/55">
          {firstHomeMode
            ? "현재 구매력, 3년 뒤, 5년 뒤, 10년 뒤 첫 구매 가능 예산을 같은 선 위에 놓고 봅니다."
            : "현재 기준점, 3년 뒤, 5년 뒤, 10년 뒤 구매력을 같은 선 위에 놓고 봅니다."}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {powers.map((item) => (
          <div key={item.year} className="rounded-md bg-black/5 p-3 text-center">
            <p className="text-[10px] font-bold text-black/45">{item.year === 0 ? (firstHomeMode ? "현재 구매력" : "현재 기준") : `${item.year}년 뒤`}</p>
            <p className="mt-1 text-sm font-black text-ink">{formatKRW(item.value)}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {firstHomeMode ? (
          <div className="flex items-center justify-between rounded-md bg-moss/10 px-3 py-2">
            <span className="text-xs font-black text-moss">목표 가격 · {financialPlan.targetRegion}</span>
            <span className="text-sm font-black text-ink">{formatKRW(financialPlan.targetHomePrice)}</span>
          </div>
        ) : bands.map((band) => (
          <div key={band.multiplier} className="flex items-center justify-between rounded-md bg-moss/10 px-3 py-2">
            <span className="text-xs font-black text-moss">{band.multiplier.toFixed(1)}배 · {band.label}</span>
            <span className="text-sm font-black text-ink">{formatKRW(Math.round(currentHome.estimatedCurrentPrice * band.multiplier))}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
