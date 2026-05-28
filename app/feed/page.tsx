"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Target } from "lucide-react";
import { DiscoveryCard } from "@/components/DiscoveryCard";
import { AppShell } from "@/components/AppShell";
import { EstimateNotice } from "@/components/EstimateNotice";
import { Metric } from "@/components/Metric";
import { MoveUpLadderSummary } from "@/components/MoveUpLadderSummary";
import { PropertyCard } from "@/components/PropertyCard";
import { properties } from "@/data/dummy";
import { calculateMoveUpBudget, calculatePurchasePower } from "@/lib/calculations";
import { buildMixedFeed } from "@/lib/feedMixer";
import { formatKRW } from "@/lib/format";
import { analyzeUserState, goalUi } from "@/lib/userState";
import { useAppStore } from "@/store/useAppStore";
import type { ComplexSignalCandidate, Property } from "@/types";

export default function FeedPage() {
  const [index, setIndex] = useState(0);
  const [feedProperties, setFeedProperties] = useState<Property[]>(properties);
  const [discoveryCards, setDiscoveryCards] = useState<ComplexSignalCandidate[]>([]);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>("all");
  const [feedSource, setFeedSource] = useState("discovery");
  const [warnings, setWarnings] = useState<string[]>([]);
  const profile = useAppStore((state) => state.profile);
  const currentHome = useAppStore((state) => state.currentHome);
  const financialPlan = useAppStore((state) => state.financialPlan);
  const savedCount = useAppStore((state) => state.portfolioItems.length);
  const setDefaultInterestCandidate = useAppStore((state) => state.setDefaultInterestCandidate);
  const userState = analyzeUserState(profile, currentHome, financialPlan);
  const ui = goalUi[profile.primaryGoal];
  const purchasePowerNow = calculatePurchasePower(profile, {
    currentHome,
    homeCount: userState.mortgageHomeCount,
    isFirstTimeBuyer: userState.isFirstTimeBuyer,
    propertyPrice: financialPlan.targetHomePrice,
    region: financialPlan.targetRegion
  });
  const secondaryMetricValue =
    profile.primaryGoal === "buy_home"
      ? Math.max(0, financialPlan.targetHomePrice - purchasePowerNow)
      : calculateMoveUpBudget(profile, currentHome);

  useEffect(() => {
    let active = true;
    fetch("/api/discovery/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile,
        currentHome,
        financialPlan,
        preferredRegions: profile.preferredRegions,
        includeSimilarRegions: true,
        propertyTypes: ["apartment", "officetel"],
        goal: profile.primaryGoal,
        limit: 30
      })
    })
      .then((response) => response.json())
      .then((data: { source?: string; cards?: ComplexSignalCandidate[]; properties?: Property[]; defaultInterestCandidate?: ComplexSignalCandidate; warnings?: string[] }) => {
        if (!active) return;
        if (data.cards?.length) {
          setDiscoveryCards(data.cards);
          setFeedProperties(data.properties?.length ? data.properties : properties);
          setFeedSource(data.source ?? "complex_signal");
          setDefaultInterestCandidate(data.defaultInterestCandidate ?? data.cards[0]);
          setWarnings(data.warnings ?? []);
        }
        setIndex(0);
      })
      .catch(() => {
        if (active) setFeedSource("dummy");
      });
    return () => {
      active = false;
    };
  }, [profile, currentHome, financialPlan, setDefaultInterestCandidate]);

  const ranked = useMemo(() => buildMixedFeed(feedProperties, profile, currentHome), [feedProperties, profile, currentHome]);
  const filteredDiscoveryCards = useMemo(
    () => filterDiscoveryCards(discoveryCards, activeFilter),
    [discoveryCards, activeFilter]
  );

  const currentDiscovery = filteredDiscoveryCards.length ? filteredDiscoveryCards[index % filteredDiscoveryCards.length] : null;
  const current = ranked[index % ranked.length];

  return (
    <AppShell
      title={ui.feedTitle}
      subtitle={ui.feedSubtitle}
      action={
        <div className="rounded-md bg-white px-3 py-2 text-right shadow-sm">
          <p className="text-[11px] font-bold text-black/45">저장 후보</p>
          <p className="text-lg font-black text-moss">{savedCount}</p>
        </div>
      }
    >
      <div className="space-y-4">
        <MoveUpLadderSummary profile={profile} currentHome={currentHome} financialPlan={financialPlan} />

        <div className="grid grid-cols-2 gap-2">
          <Metric label={ui.primaryMetricLabel} value={formatKRW(purchasePowerNow)} />
          <Metric label={ui.secondaryMetricLabel} value={formatKRW(secondaryMetricValue)} />
        </div>

        <EstimateNotice />

        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {feedFilters.map((filter) => (
            <button
              key={filter.key}
              className={`h-10 shrink-0 rounded-full px-4 text-sm font-black ${
                activeFilter === filter.key ? "bg-ink text-white" : "bg-white text-ink shadow-sm"
              }`}
              onClick={() => {
                setActiveFilter(filter.key);
                setIndex(0);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-black text-ink">
            <Target size={17} className="text-coral" />
            {ui.feedMixLabel.split(" · ")[0]}
          </div>
          <div className="flex items-center gap-2 text-sm font-black text-ink">
            <Flame size={17} className="text-gold" />
            {ui.feedMixLabel.split(" · ")[1] ?? "미래 접근 30%"}
          </div>
        </div>

        <div className="rounded-md border border-black/10 bg-white p-3">
          <p className="text-[11px] font-bold text-black/45">이번 추천 근거</p>
          <p className="mt-1 text-sm font-black text-ink">{currentDiscovery?.cardType ?? current.feedCardType}</p>
          <p className="mt-1 text-xs leading-5 text-black/55">
            {currentDiscovery ? `${userState.shortSummary}에서 공공 실거래가, KREB real 지표, 미래 구매력을 함께 본 분석 후보입니다.` : current.reason} · source: {feedSource} · 표시 {filteredDiscoveryCards.length || ranked.length}개
          </p>
          {warnings.length ? <p className="mt-1 text-xs leading-5 text-coral">{warnings[0]}</p> : null}
          <p className="mt-1 text-xs leading-5 text-black/45">
            본 서비스는 매수 추천이나 수익 보장이 아닌 의사결정 보조 도구입니다.
          </p>
        </div>

        {currentDiscovery ? (
          <DiscoveryCard key={currentDiscovery.id} card={currentDiscovery} onNext={() => setIndex((value) => value + 1)} />
        ) : (
          <PropertyCard
            key={current.property.id}
            property={current.property}
            onNext={() => setIndex((value) => value + 1)}
          />
        )}
      </div>
    </AppShell>
  );
}

type FeedFilter = "all" | "now" | "after_sale" | "one_point_five" | "future_five" | "hot" | "discount" | "cash_flow";

const feedFilters: Array<{ key: FeedFilter; label: string }> = [
  { key: "all", label: "전체" },
  { key: "now", label: "지금 가능" },
  { key: "after_sale", label: "정리 후 가능" },
  { key: "one_point_five", label: "조건 확장 후보" },
  { key: "future_five", label: "5년 뒤 접근" },
  { key: "hot", label: "거래 활발" },
  { key: "discount", label: "리스크 점검" },
  { key: "cash_flow", label: "주거비 완화" }
];

function filterDiscoveryCards(cards: ComplexSignalCandidate[], filter: FeedFilter) {
  if (filter === "all") return cards;
  const filtered = cards.filter((card) => {
    if (filter === "now") return card.userFit.possibleNow;
    if (filter === "after_sale") return card.userFit.possibleAfterSellingCurrentHome;
    if (filter === "one_point_five") return card.moveUp?.targetMultiplierBand === 1.5;
    if (filter === "future_five") return card.userFit.yearsToReach !== null && card.userFit.yearsToReach <= 5;
    if (filter === "hot") return card.transactionHeat >= 2 || card.volume90d >= 6;
    if (filter === "discount") return (card.drawdownFromHigh ?? 0) <= -10;
    if (filter === "cash_flow") return card.propertyType === "officetel" || card.cardType === "officetel_cash_flow";
    return true;
  });
  return filtered.length ? filtered : cards;
}
