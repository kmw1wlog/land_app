import { calculateMoveUpBudget, calculatePurchasePower } from "@/lib/calculations";
import { calculateFuturePurchasePower } from "@/lib/futurePlan";
import { formatKRW } from "@/lib/format";
import { buildMoveUpTargetBands } from "@/lib/moveUpBands";
import type { CurrentHome, UserFinancialPlan, UserProfile } from "@/types";
import { Metric } from "./Metric";

interface MoveUpLadderSummaryProps {
  profile: UserProfile;
  currentHome: CurrentHome;
  financialPlan: UserFinancialPlan;
  compact?: boolean;
}

export function MoveUpLadderSummary({ profile, currentHome, financialPlan, compact = false }: MoveUpLadderSummaryProps) {
  const bands = buildMoveUpTargetBands(currentHome.estimatedCurrentPrice);
  const purchasePowerNow = calculatePurchasePower(profile, { currentHome, homeCount: 1 });
  const moveUpPower = calculateMoveUpBudget(profile, currentHome);
  const futureFiveYearPower = calculateFuturePurchasePower(profile, currentHome, financialPlan, 5);

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-moss">현재 기준점에서 다음 경로</p>
          <h2 className="mt-1 text-xl font-black leading-tight text-ink">내 구매력 요약</h2>
          <p className="mt-1 text-xs leading-5 text-black/55">
            단지를 보기 전에 현재 구매력, 정리 후 구매력, 5년 뒤 구매력을 먼저 계산합니다.
          </p>
        </div>
        <div className="rounded-md bg-ink px-3 py-2 text-right text-white">
          <p className="text-[10px] font-bold text-white/55">현재 기준점</p>
          <p className="text-base font-black">{formatKRW(currentHome.estimatedCurrentPrice)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {bands.map((band) => (
          <div key={band.multiplier} className={`rounded-md ${band.multiplier === 1.5 ? "bg-moss text-white" : "bg-black/5 text-ink"} p-3`}>
            <p className="text-[10px] font-bold opacity-65">{band.multiplier.toFixed(1)}배</p>
            <p className="mt-1 text-sm font-black">{formatKRW(Math.round(currentHome.estimatedCurrentPrice * band.multiplier))}</p>
            {!compact ? <p className="mt-1 text-[10px] font-bold opacity-65">{band.label}</p> : null}
          </div>
        ))}
      </div>

      {!compact ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Metric label="현재 매수 여력" value={formatKRW(purchasePowerNow)} />
          <Metric label="정리 후 구매력" value={formatKRW(moveUpPower)} />
          <Metric label="5년 뒤 예상" value={formatKRW(futureFiveYearPower)} />
        </div>
      ) : null}
    </section>
  );
}
