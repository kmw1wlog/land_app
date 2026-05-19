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
      .then((data: { source?: string; cards?: ComplexSignalCandidate[]; properties?: Property[]; warnings?: string[] }) => {
        if (!active) return;
        if (data.cards?.length) {
          setDiscoveryCards(data.cards);
          setFeedProperties(data.properties?.length ? data.properties : properties);
          setFeedSource(data.source ?? "complex_signal");
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
  }, [profile, currentHome, financialPlan]);

  const ranked = useMemo(() => buildMixedFeed(feedProperties, profile, currentHome), [feedProperties, profile, currentHome]);
  const filteredDiscoveryCards = useMemo(
    () => filterDiscoveryCards(discoveryCards, activeFilter),
    [discoveryCards, activeFilter]
  );

  const currentDiscovery = filteredDiscoveryCards.length ? filteredDiscoveryCards[index % filteredDiscoveryCards.length] : null;
  const current = ranked[index % ranked.length];

  return (
    <AppShell
      title="오늘의 부동산 For You"
      subtitle="지도보다 먼저, 내 월급과 내 집 기준으로 후보를 넘겨봅니다."
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
          <Metric label="현재 매수 여력" value={formatKRW(calculatePurchasePower(profile))} />
          <Metric label="매도 후 갈아타기" value={formatKRW(calculateMoveUpBudget(profile, currentHome))} />
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
            현실 후보 70%
          </div>
          <div className="flex items-center gap-2 text-sm font-black text-ink">
            <Flame size={17} className="text-gold" />
            상상 20% · 탐험 10%
          </div>
        </div>

        <div className="rounded-md border border-black/10 bg-white p-3">
          <p className="text-[11px] font-bold text-black/45">이번 카드 분류</p>
          <p className="mt-1 text-sm font-black text-ink">{currentDiscovery?.cardType ?? current.feedCardType}</p>
          <p className="mt-1 text-xs leading-5 text-black/55">
            {currentDiscovery ? "최근 실거래가 활발한 단지/면적대 추천" : current.reason} · source: {feedSource} · 표시 {filteredDiscoveryCards.length || ranked.length}개
          </p>
          {warnings.length ? <p className="mt-1 text-xs leading-5 text-coral">{warnings[0]}</p> : null}
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
  { key: "after_sale", label: "매도하면 가능" },
  { key: "one_point_five", label: "1.5배 후보" },
  { key: "future_five", label: "5년 뒤 가능" },
  { key: "hot", label: "거래 핫" },
  { key: "discount", label: "전고점 대비 하락" },
  { key: "cash_flow", label: "오피스텔 현금흐름" }
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
