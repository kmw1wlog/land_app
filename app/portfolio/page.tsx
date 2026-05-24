"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LeadConsentModal } from "@/components/LeadConsentModal";
import { Metric } from "@/components/Metric";
import { MoveUpLadderSummary } from "@/components/MoveUpLadderSummary";
import { properties } from "@/data/dummy";
import { analyzePropertyForUser } from "@/lib/calculations";
import { calculateTargetHomePath } from "@/lib/futurePlan";
import { formatKRW, formatMonthly } from "@/lib/format";
import { buildMoveUpTargetBands } from "@/lib/moveUpBands";
import { useAppStore } from "@/store/useAppStore";
import type { Property, VirtualPortfolioItem } from "@/types";

export default function PortfolioPage() {
  const profile = useAppStore((state) => state.profile);
  const financialPlan = useAppStore((state) => state.financialPlan);
  const currentHome = useAppStore((state) => state.currentHome);
  const items = useAppStore((state) => state.portfolioItems);
  const removeFromPortfolio = useAppStore((state) => state.removeFromPortfolio);
  const [apiProperties, setApiProperties] = useState<Property[]>(properties);
  const [leadProperty, setLeadProperty] = useState<Property | null>(null);
  useEffect(() => {
    fetch("/api/feed/properties")
      .then((response) => response.json())
      .then((data) => {
        if (data.properties?.length) setApiProperties(data.properties);
      })
      .catch(() => setApiProperties(properties));
  }, []);
  const hydratedItems =
    items.length > 0
      ? items
          .map((item) => ({
            item,
            property: item.sourceType === "complex_signal" ? portfolioSignalToProperty(item) : apiProperties.find((property) => property.id === item.propertyId)
          }))
          .filter((entry): entry is { item: typeof items[number]; property: Property } =>
            Boolean(entry.property)
          )
      : apiProperties.slice(0, 3).map((property) => ({
          item: {
            id: `demo-${property.id}`,
            userId: profile.userId,
            propertyId: property.id,
            virtualPurchasePrice: property.salePrice,
            virtualPurchaseDate: new Date().toISOString(),
            virtualInvestmentAmount: property.salePrice - property.jeonsePrice,
            memo: "관심 주거 후보",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          property
        }));

  const totalMonthlyCashFlow = hydratedItems.reduce((sum, entry) => {
    return sum + analyzePropertyForUser(profile, currentHome, entry.property).monthlyCashFlow;
  }, 0);
  const targetRate = Math.min(100, Math.max(0, (totalMonthlyCashFlow / profile.targetMonthlyCashFlow) * 100));
  const targetPath = calculateTargetHomePath(profile, currentHome, financialPlan, hydratedItems[0]?.property);
  const averageReferencePrice = hydratedItems.length
    ? hydratedItems.reduce((sum, entry) => sum + entry.property.salePrice, 0) / hydratedItems.length
    : 0;
  const fiveYearAccessibleCount = hydratedItems.filter((entry) => {
    const path = calculateTargetHomePath(profile, currentHome, financialPlan, entry.property);
    return path.yearsToReachBySavingOnly !== null && path.yearsToReachBySavingOnly <= 5;
  }).length;
  const onePointFiveBand = buildMoveUpTargetBands(currentHome.estimatedCurrentPrice).find((band) => band.multiplier === 1.5);
  const onePointFiveCount = hydratedItems.filter((entry) => {
    if (!onePointFiveBand) return false;
    return entry.property.salePrice >= onePointFiveBand.targetMinPrice && entry.property.salePrice <= onePointFiveBand.targetMaxPrice;
  }).length;
  const ladderProgress = onePointFiveBand
    ? Math.min(100, Math.round((Math.max(currentHome.estimatedCurrentPrice, targetPath.possibleAfterSellingCurrentHome ? targetPath.targetPrice : currentHome.estimatedCurrentPrice) / Math.max(1, onePointFiveBand.targetMaxPrice)) * 100))
    : 0;

  return (
    <AppShell title="내 관심 후보" subtitle="지금 바로 결정하지 않고, 내 주거 경로 안에서 언제 접근 가능한지 추적합니다.">
      <div className="space-y-4">
        <MoveUpLadderSummary profile={profile} currentHome={currentHome} financialPlan={financialPlan} compact />

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-black/45">내가 비교할 미래 주거 후보</p>
              <h2 className="mt-1 text-xl font-black text-ink">1.5배 사다리 진행률 {ladderProgress}%</h2>
            </div>
            <p className="text-sm font-black text-moss">{formatKRW(averageReferencePrice)}</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Metric label="담은 후보" value={`${hydratedItems.length}개`} />
            <Metric label="5년 뒤 접근" value={`${fiveYearAccessibleCount}개`} />
            <Metric label="1.5배 후보" value={`${onePointFiveCount}개`} />
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold text-black/45">목표 월세 달성률</p>
              <p className="mt-1 text-3xl font-black text-ink">{Math.round(targetRate)}%</p>
            </div>
            <p className="text-sm font-bold text-black/55">
              {formatMonthly(totalMonthlyCashFlow)} / {formatMonthly(profile.targetMonthlyCashFlow)}
            </p>
          </div>
          <div className="mt-4 h-3 rounded-full bg-black/10">
            <div
              className="h-3 rounded-full bg-moss"
              style={{ width: `${targetRate}%` }}
            />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Metric label="담은 후보" value={`${hydratedItems.length}개`} />
          <Metric
            label="예상 월 현금흐름"
            value={formatMonthly(totalMonthlyCashFlow)}
            hint="보수적 공실/이자 차감"
          />
          <Metric label="목표 집 도달" value={targetPath.yearsToReachWithHomeSale === null ? "조건 변경" : `${targetPath.yearsToReachWithHomeSale}년`} />
          <Metric label="참고 순자산" value={formatKRW(hydratedItems.reduce((sum, entry) => sum + entry.property.salePrice * 0.18, 0))} />
        </div>

        <section className="space-y-3">
          {hydratedItems.map(({ item, property }) => {
            const analysis = analyzePropertyForUser(profile, currentHome, property);
            const virtualReturn =
              ((property.salePrice * (1 + property.growthScore / 1000) - item.virtualPurchasePrice) /
                item.virtualPurchasePrice) *
              100;

            return (
              <article key={item.id} className="rounded-lg border border-black/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-moss">{property.region}</p>
                    <h2 className="mt-1 text-lg font-black text-ink">{property.name}</h2>
                  </div>
                  {items.length > 0 ? (
                    <button
                      className="flex h-9 w-9 items-center justify-center rounded-md bg-black/5"
                      title="관심 후보에서 제거"
                      onClick={() => removeFromPortfolio(property.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Metric label="기준 매수가" value={formatKRW(item.virtualPurchasePrice)} />
                  <Metric label="실투자금" value={formatKRW(analysis.investmentAmount)} />
                  <Metric label="예상 월세" value={formatMonthly(property.expectedMonthlyRent)} />
                  <Metric label="월 현금흐름" value={formatMonthly(analysis.monthlyCashFlow)} />
                  <Metric label="참고 변화율" value={`${virtualReturn.toFixed(1)}%`} />
                  <Metric
                    label="목표 월세 기여"
                    value={`${Math.max(0, (analysis.monthlyCashFlow / profile.targetMonthlyCashFlow) * 100).toFixed(1)}%`}
                  />
                  <Metric label="5년 순자산 변화" value={formatKRW(analysis.fiveYearNetWorthChange)} />
                  <Metric
                    label="도달기간 단축"
                    value={calculateTargetHomePath(profile, currentHome, financialPlan, property).yearsToReachWithHomeSale === 0 ? "즉시 가능" : "비교 필요"}
                  />
                </div>
                <Link
                  href="/goal-path"
                  className="mt-3 flex h-11 items-center justify-center rounded-md bg-ink text-sm font-black text-white"
                >
                  도달경로
                </Link>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Link
                    href={`/compare-price-band?candidate=${("complexSignalId" in item ? item.complexSignalId : undefined) ?? property.id}`}
                    className="flex h-10 items-center justify-center rounded-md bg-moss text-xs font-black text-white"
                  >
                    같은 돈 비교
                  </Link>
                  <Link
                    href={`/community?room=${encodeURIComponent(`${property.lawdCode5 ?? "27260"}:${property.propertyType === "officetel" ? "officetel" : "apartment"}:${property.name}`)}`}
                    className="flex h-10 items-center justify-center rounded-md bg-sky text-xs font-black text-white"
                  >
                    종토방
                  </Link>
                  <a
                    href={buildNaverSearchUrl(property)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 items-center justify-center rounded-md bg-gold text-xs font-black text-ink"
                  >
                    네이버
                  </a>
                </div>
                <button
                  className="mt-2 flex h-11 w-full items-center justify-center rounded-md border border-black/10 bg-white text-sm font-black text-ink"
                  onClick={() => setLeadProperty(property)}
                >
                  상담 연결
                </button>
              </article>
            );
          })}
        </section>
      </div>
      {leadProperty ? (
        <LeadConsentModal
          property={leadProperty}
          profile={profile}
          currentHome={currentHome}
          leadType="cash_flow_investment"
          open={Boolean(leadProperty)}
          onClose={() => setLeadProperty(null)}
        />
      ) : null}
    </AppShell>
  );
}

function buildNaverSearchUrl(property: Property) {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(`${property.region} ${property.name} 부동산`)}`;
}

function portfolioSignalToProperty(item: VirtualPortfolioItem): Property {
  const price = item.referencePrice ?? item.virtualPurchasePrice;
  const areaM2 = item.areaBucket === "59" ? 59 : item.areaBucket === "74" ? 74 : item.areaBucket === "101" ? 101 : 84;
  return {
    id: item.complexSignalId ?? item.propertyId,
    name: `${item.complexName ?? "실거래 단지"} ${item.areaBucket ?? ""}`.trim(),
    address: item.region ?? "",
    region: item.region ?? "관심지역",
    propertyType: item.areaBucket?.startsWith("officetel") ? "officetel" : "apartment",
    salePrice: price,
    jeonsePrice: Math.round(price * 0.6),
    expectedMonthlyRent: item.areaBucket?.startsWith("officetel") ? Math.round(price * 0.003) : 0,
    expectedDeposit: Math.round(price * 0.6),
    areaM2,
    floor: item.floorBand === "high" ? 18 : item.floorBand === "low" ? 4 : 10,
    builtYear: 2010,
    pricePerM2: Math.round(price / areaM2),
    previousHighPrice: price,
    drawdownFromHigh: 0,
    jeonseRatio: 60,
    supplyRiskScore: 45,
    vacancyRiskScore: 38,
    growthScore: 58,
    stabilityScore: 62,
    communityHeatScore: 55,
    isDirectListing: false,
    isPartnerListing: false,
    isAd: false,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}
