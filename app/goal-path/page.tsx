"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EstimateNotice } from "@/components/EstimateNotice";
import { FutureLadderTimeline } from "@/components/FutureLadderTimeline";
import { LeadConsentModal } from "@/components/LeadConsentModal";
import { Metric } from "@/components/Metric";
import { properties } from "@/data/dummy";
import { complexSignalToPropertyLike } from "@/lib/candidateAdapter";
import { calculateRequiredMonthlySavings, calculateTargetHomePath, recommendGoalPathCandidates } from "@/lib/futurePlan";
import { formatKRW, formatMonthly } from "@/lib/format";
import { analyzeUserState, goalUi } from "@/lib/userState";
import { useAppStore } from "@/store/useAppStore";
import type { Property } from "@/types";

const routeLabels = {
  save_more: "저축 준비 루트",
  sell_current_home: "현재 집 정리 루트",
  convert_to_jeonse: "전세 기준 전환 루트",
  convert_to_monthly_rent: "월부담 조정 루트",
  additional_purchase: "현재 조건 가능 루트",
  not_feasible: "조건 재설계 필요"
};

export default function GoalPathPage() {
  const profile = useAppStore((state) => state.profile);
  const financialPlan = useAppStore((state) => state.financialPlan);
  const currentHome = useAppStore((state) => state.currentHome);
  const activePropertyId = useAppStore((state) => state.activePropertyId);
  const activeCandidate = useAppStore((state) => state.activeCandidate);
  const [apiProperties, setApiProperties] = useState<Property[]>(properties);
  const [discoveryComparables, setDiscoveryComparables] = useState<Property[]>([]);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const userState = analyzeUserState(profile, currentHome, financialPlan);
  const ui = goalUi[profile.primaryGoal];
  useEffect(() => {
    fetch("/api/feed/properties")
      .then((response) => response.json())
      .then((data) => {
        if (data.properties?.length) setApiProperties(data.properties);
      })
      .catch(() => setApiProperties(properties));
  }, []);
  useEffect(() => {
    if (!activeCandidate) return;
    fetch("/api/discovery/compare-price-band", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: activeCandidate.id, profile, currentHome, preferredRegions: profile.preferredRegions, limit: 3 })
    })
      .then((response) => response.json())
      .then((data) => {
        const items = data.comparables?.map((entry: { candidate: typeof activeCandidate }) => complexSignalToPropertyLike(entry.candidate)) ?? [];
        setDiscoveryComparables(items);
      })
      .catch(() => setDiscoveryComparables([]));
  }, [activeCandidate, profile, currentHome]);
  const target = activeCandidate
    ? complexSignalToPropertyLike(activeCandidate)
    : apiProperties.find((property) => property.id === activePropertyId) ?? apiProperties[0] ?? properties[0];
  const path = calculateTargetHomePath(profile, currentHome, financialPlan, target);
  const candidates = recommendGoalPathCandidates(profile, currentHome, financialPlan, discoveryComparables.length ? discoveryComparables : apiProperties, 3);
  const requiredSavings = calculateRequiredMonthlySavings(
    path.shortageNow,
    Math.max(1, financialPlan.targetHorizonYears),
    financialPlan.expectedBonusPerYear
  );

  return (
    <AppShell
      title={ui.pathTitle}
      subtitle={activeCandidate ? `${activeCandidate.complexName} ${activeCandidate.areaBucket} 가격대에 접근하는 경로입니다.` : ui.pathSubtitle}
    >
      <div className="space-y-4">
        <FutureLadderTimeline profile={profile} currentHome={currentHome} financialPlan={financialPlan} />

        <EstimateNotice />

        <Link
          href={`/chat?intent=purchase_power&prompt=${encodeURIComponent("현재, 정리 후, 5년 뒤 구매력 차이를 설명해줘.")}`}
          className="flex h-12 items-center justify-center gap-2 rounded-md bg-moss text-sm font-black text-white"
        >
          <Bot size={17} />
          AI가 5년 경로 요약
        </Link>

        <section className="rounded-lg bg-ink p-4 text-white">
          <p className="text-xs font-bold text-white/55">주거 경로 안내</p>
          <h2 className="mt-1 text-2xl font-black">{routeLabels[path.recommendedPath]}</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">
            현재 가능: {path.possibleNow ? "가능" : "준비 필요"} · {userState.isFirstTimeBuyer ? "첫 구매 목표 대비" : "현재 집 정리 시"}:{" "}
            {path.possibleAfterSellingCurrentHome ? "가능" : "부족"}
          </p>
          {activeCandidate ? (
            <p className="mt-2 text-xs leading-5 text-white/55">
              이 화면은 특정 매물이 아니라 공공 실거래가 기반 단지/면적대 기준가에 접근하는 경로를 계산합니다.
            </p>
          ) : null}
          <button
            className="mt-4 h-11 w-full rounded-md bg-white text-sm font-black text-ink"
            onClick={() => setShowLeadModal(true)}
          >
            이 경로로 상담 연결
          </button>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Metric label="목표 가격" value={formatKRW(path.targetPrice)} />
          <Metric label="현재 부족액" value={formatKRW(path.shortageNow)} />
          <Metric label="구매 시 월부담" value={formatMonthly(path.monthlyPaymentAtPurchase)} />
          <Metric label="추천 경로" value={routeLabels[path.recommendedPath]} />
          <Metric label="필요 월저축" value={formatMonthly(requiredSavings)} />
          <Metric label="조건 변경" value={requiredSavings > profile.monthlySavings ? "저축/가격 조정" : "현 조건 유지"} />
        </div>

        <section className="space-y-3">
          <RouteCard
            title="저축만으로 가는 루트"
            value={path.yearsToReachBySavingOnly === null ? "20년 이상" : `${path.yearsToReachBySavingOnly}년`}
            body="현금과 월 저축액, 소득상승률만 반영한 보수적 경로입니다."
          />
          {userState.isFirstTimeBuyer ? (
            <RouteCard
              title="보증금 포함 첫 구매 루트"
              value={path.yearsToReachWithJeonseStrategy === null ? "추가 준비 필요" : `${path.yearsToReachWithJeonseStrategy}년`}
              body="현재 보증금과 현금을 첫 구매 재원으로 볼 때의 참고 경로입니다."
            />
          ) : (
            <>
              <RouteCard
                title="현재 집 정리 루트"
                value={path.yearsToReachWithHomeSale === null ? "추가 준비 필요" : `${path.yearsToReachWithHomeSale}년`}
                body="세후 매도 현금과 미래 대출 여력을 합산해 봅니다."
              />
              <RouteCard
                title="현재 집 전세 기준 전환 루트"
                value={path.yearsToReachWithJeonseStrategy === null ? "리스크 확인 필요" : `${path.yearsToReachWithJeonseStrategy}년`}
                body="전세보증금 활용 가능성과 역전세 리스크를 같이 봅니다."
              />
            </>
          )}
          <RouteCard
            title="월부담 조정 루트"
            value={`${Math.max(0, (target.expectedMonthlyRent / financialPlan.targetMonthlyCashFlow) * 100).toFixed(1)}% 기여`}
            body="목표 월세 현금흐름에 이 후보가 얼마나 기여하는지 보는 경로입니다."
          />
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-base font-black text-ink">{activeCandidate ? "같은 가격대 단지/면적대 후보 3개" : "경로별 분석 후보 3개"}</h2>
          <div className="mt-3 space-y-2">
            {candidates.map((item) => (
              <div key={item.property.id} className="rounded-md bg-black/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-ink">{item.property.name}</p>
                    <p className="mt-1 text-xs text-black/50">
                      {routeLabels[item.path.recommendedPath]} · 최단 {item.fastestYears >= 99 ? "20년+" : `${item.fastestYears}년`}
                    </p>
                  </div>
                  <p className="text-sm font-black text-moss">{formatKRW(item.property.salePrice)}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-black/55">
                  필요 월저축 {formatMonthly(item.requiredMonthlySavings)} · 관심 후보 도달기간 단축 지표{" "}
                  {Math.round(item.portfolioImpactMonths).toLocaleString("ko-KR")}개월
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-base font-black text-ink">설명 가능한 근거</h2>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-black/60">
            {path.explanation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
      <LeadConsentModal
        property={target}
        profile={profile}
        currentHome={currentHome}
        leadType="move_up"
        open={showLeadModal}
        onClose={() => setShowLeadModal(false)}
      />
    </AppShell>
  );
}

function RouteCard({ title, value, body }: { title: string; value: string; body: string }) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-black text-ink">{title}</h2>
        <p className="text-lg font-black text-moss">{value}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-black/58">{body}</p>
    </article>
  );
}
