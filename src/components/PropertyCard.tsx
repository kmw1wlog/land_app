"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Heart, Map, MessageCircle, Phone, X } from "lucide-react";
import type { Property } from "@/types";
import { analyzePropertyForUser } from "@/lib/calculations";
import { calculateFuturePurchasePower, calculateTargetHomePath } from "@/lib/futurePlan";
import { explainFeedCard } from "@/lib/feedExplain";
import { formatKRW, formatMonthly, percent } from "@/lib/format";
import { estimateFusionMetricsForCandidate, getFusionEvidenceBadges } from "@/lib/fusionPresentation";
import { useAppStore } from "@/store/useAppStore";
import { Label } from "./Label";
import { LeadConsentModal } from "./LeadConsentModal";
import { Metric } from "./Metric";

interface PropertyCardProps {
  property: Property;
  onNext?: () => void;
}

export function PropertyCard({ property, onNext }: PropertyCardProps) {
  const profile = useAppStore((state) => state.profile);
  const financialPlan = useAppStore((state) => state.financialPlan);
  const currentHome = useAppStore((state) => state.currentHome);
  const saveToPortfolio = useAppStore((state) => state.saveToPortfolio);
  const recordSwipe = useAppStore((state) => state.recordSwipe);
  const setActiveProperty = useAppStore((state) => state.setActiveProperty);
  const [showConsent, setShowConsent] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-6, 0, 6]);
  const analysis = analyzePropertyForUser(profile, currentHome, property);
  const path = calculateTargetHomePath(profile, currentHome, financialPlan, property);
  const future3 = calculateFuturePurchasePower(profile, currentHome, financialPlan, 3) >= property.salePrice;
  const future5 = calculateFuturePurchasePower(profile, currentHome, financialPlan, 5) >= property.salePrice;
  const future10 = calculateFuturePurchasePower(profile, currentHome, financialPlan, 10) >= property.salePrice;
  const pathLabel: Record<typeof path.recommendedPath, string> = {
    save_more: "저축형",
    sell_current_home: "정리 후 이동형",
    convert_to_jeonse: "전세전환형",
    convert_to_monthly_rent: "주거비조정형",
    additional_purchase: "현재가능형",
    not_feasible: "조건재설계형"
  };
  const fusionMetrics = estimateFusionMetricsForCandidate({
    lawdCode5: property.lawdCode5,
    jeonseRatio: property.jeonseRatio,
    drawdownFromHigh: property.drawdownFromHigh
  });
  const fusionBadges = getFusionEvidenceBadges();

  const next = (action: "pass" | "save" | "calculate" | "community" | "contact") => {
    recordSwipe(property.id, action);
    setActiveProperty(property.id);
    if (action === "save") {
      saveToPortfolio(property.id);
    }
    if (action === "contact") {
      setShowConsent(true);
      return;
    }
    onNext?.();
  };

  const photo = property.photoUrls?.[0];
  const explanations = explainFeedCard(property, analysis, path.recommendedPath);

  return (
    <motion.article
      className="relative overflow-hidden rounded-lg border border-black/10 bg-white shadow-soft"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 120) {
          next(info.offset.x > 0 ? "save" : "pass");
        }
      }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="relative h-56 overflow-hidden bg-[linear-gradient(135deg,#2f5d50,#e26045_55%,#d8a33f)] text-white">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/10 to-black/30" />
        <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2">
          {property.isAd ? <Label tone="ad">광고</Label> : null}
          {property.isPartnerListing ? <Label tone="ad">제휴 중개사 매물</Label> : null}
          {property.isDirectListing ? <Label tone="direct">직영 검증 매물</Label> : null}
          {!property.isAd && !property.isPartnerListing && !property.isDirectListing ? <Label>분석 후보</Label> : null}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-sm font-bold opacity-85">{property.region}</p>
          <h2 className="mt-1 text-3xl font-black leading-tight">{property.name}</h2>
          <p className="mt-2 text-sm font-bold text-white/82">
            {analysis.isAffordableNow ? "현재 가능" : analysis.isAffordableAfterSale ? "현재 기준점 정리 시 가능" : `${Math.ceil(analysis.monthsToReach / 12)}년 준비 후보`}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="매매가" value={formatKRW(property.salePrice)} />
          <Metric label="전세가" value={formatKRW(property.jeonsePrice)} />
          <Metric label="필요 현금" value={formatKRW(analysis.investmentAmount)} />
        </div>

        <div className="rounded-md bg-ink p-4 text-white">
          <p className="text-xs font-bold text-white/60">내 상황 기준 분석</p>
          <p className="mt-2 text-xl font-black">
            {analysis.isAffordableNow
              ? "현재 현금/대출 여력으로 가능"
              : analysis.isAffordableAfterSale
                ? "현재 기준점 정리 시 접근 가능"
                : `${Math.ceil(analysis.monthsToReach / 12)}년 안팎 준비 필요`}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <span>부족 금액 {formatKRW(analysis.shortage)}</span>
            <span>월 부담 {formatMonthly(analysis.monthlyDebtPayment)}</span>
            <span>월 현금흐름 {formatMonthly(analysis.monthlyCashFlow)}</span>
            <span>5년 순자산 {formatKRW(analysis.fiveYearNetWorthChange)}</span>
            <span>매도 시 {analysis.isAffordableAfterSale ? "가능" : "부족"}</span>
            <span>추천 경로 {pathLabel[path.recommendedPath]}</span>
            <span>대출한도 {formatKRW(analysis.loanLimit)}</span>
            <span>DSR {analysis.dsrRatio.toFixed(1)}%</span>
          </div>
        </div>

        <div className="rounded-md border border-black/10 bg-white p-3">
          <p className="text-[11px] font-bold text-black/45">미래 구매능력</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-black">
            <span className={`rounded py-2 ${future3 ? "bg-moss text-white" : "bg-black/5 text-black/55"}`}>3년 {future3 ? "가능" : "준비"}</span>
            <span className={`rounded py-2 ${future5 ? "bg-moss text-white" : "bg-black/5 text-black/55"}`}>5년 {future5 ? "가능" : "준비"}</span>
            <span className={`rounded py-2 ${future10 ? "bg-moss text-white" : "bg-black/5 text-black/55"}`}>10년 {future10 ? "가능" : "준비"}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-black/55">
            목표 주거비 완화 기여도 {Math.max(0, (analysis.monthlyCashFlow / financialPlan.targetMonthlyCashFlow) * 100).toFixed(1)}% · 참고용 추정치
          </p>
          <p className="mt-1 text-xs leading-5 text-black/45">
            필요 현금 {formatKRW(analysis.requiredCash)} · LTV {(analysis.ltvRate * 100).toFixed(0)}%
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-black/5 p-3">
            <p className="text-[11px] font-bold text-black/45">추천 점수</p>
            <p className="text-xl font-black text-moss">{analysis.recommendationScore}</p>
          </div>
          <div className="rounded-md bg-black/5 p-3">
            <p className="text-[11px] font-bold text-black/45">전고점 대비</p>
            <p className="text-xl font-black text-coral">{percent(property.drawdownFromHigh)}</p>
          </div>
          <div className="rounded-md bg-black/5 p-3">
            <p className="text-[11px] font-bold text-black/45">커뮤니티 온도</p>
            <p className="text-xl font-black text-gold">{property.communityHeatScore}</p>
          </div>
        </div>

        <div className="rounded-md border border-black/10 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-black/45">융합 공공데이터 근거</p>
            <span className="rounded bg-moss px-2 py-1 text-[10px] font-black text-white">MOLIT+KREB real</span>
          </div>
          <div className="mt-2 grid gap-2 text-xs font-bold text-black/62">
            {fusionBadges.map((item) => (
              <div key={item.provider} className="flex items-center justify-between gap-2 rounded bg-black/5 px-2 py-2">
                <span>
                  {item.provider}: {item.label}
                </span>
                <span className={`rounded px-2 py-1 text-[10px] font-black ${item.sourceType === "실데이터" ? "bg-moss text-white" : "bg-gold/25 text-ink"}`}>
                  {item.sourceType}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <Metric label="지역시장 안정성" value={`${fusionMetrics.regionalMarketStability}점`} />
            <Metric label="전세 리스크" value={`${fusionMetrics.jeonseRiskScore}점`} />
            <Metric label="교통 접근성" value={`${fusionMetrics.transitAccessibilityScore}점`} />
            <Metric label="융합 안정성" value={`${fusionMetrics.fusedStabilityScore}점`} />
            <Metric label="데이터 신뢰도" value={`${Math.round(fusionMetrics.fusionConfidence * 100)}%`} />
            <Metric label="실데이터 축" value={`${fusionMetrics.realProviderCount}/4`} />
          </div>
          <p className="mt-2 text-[11px] font-bold leading-5 text-black/45">
            한국부동산원 지역지수는 실데이터로 반영하고, HUG·교통 항목은 시드로 구분해 보조 설명에만 사용합니다.
          </p>
        </div>

        <button
          className="h-10 w-full rounded-md bg-black/5 text-sm font-black text-ink"
          onClick={() => setShowWhy(true)}
        >
          왜 떴지?
        </button>
        <Link
          href={`/chat?intent=candidate_reason&prompt=${encodeURIComponent(`${property.region} ${property.name}이 내 상황에서 왜 후보인지, 한국부동산원 KREB real 지표와 공공데이터 근거로 설명해줘.`)}`}
          className="flex h-10 w-full items-center justify-center rounded-md bg-moss text-sm font-black text-white"
          onClick={() => setActiveProperty(property.id)}
        >
          AI가 이 후보 이유 설명
        </Link>

        <div className="grid grid-cols-5 gap-2">
          <button
            className="flex h-12 items-center justify-center rounded-md bg-black/8 text-ink"
            title="넘기기"
            onClick={() => next("pass")}
          >
            <X size={19} />
          </button>
          <button
            className="flex h-12 items-center justify-center rounded-md bg-coral text-white"
            title="저장"
            onClick={() => next("save")}
          >
            <Heart size={19} />
          </button>
          <Link
            href="/goal-path"
            className="flex h-12 items-center justify-center rounded-md bg-moss text-white"
            title="도달경로"
            onClick={() => next("calculate")}
          >
            <Map size={19} />
          </Link>
          <Link
            href="/community"
            className="flex h-12 items-center justify-center rounded-md bg-sky text-white"
            title="커뮤니티 보기"
            onClick={() => next("community")}
          >
            <MessageCircle size={19} />
          </Link>
          <button
            className="flex h-12 items-center justify-center rounded-md bg-gold text-ink"
            title="상담받기"
            onClick={() => next("contact")}
          >
            <Phone size={19} />
          </button>
        </div>
      </div>
      {showWhy ? (
        <div className="absolute inset-0 z-40 flex items-end bg-black/45 p-4">
          <div className="w-full rounded-lg bg-white p-4 shadow-soft">
            <h3 className="text-lg font-black text-ink">왜 이 카드가 떴지?</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-black/62">
              {explanations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button className="mt-3 h-11 w-full rounded-md bg-ink text-sm font-black text-white" onClick={() => setShowWhy(false)}>
              확인
            </button>
          </div>
        </div>
      ) : null}
      <LeadConsentModal
        open={showConsent}
        onClose={() => setShowConsent(false)}
        property={property}
        profile={profile}
        currentHome={currentHome}
      />
    </motion.article>
  );
}
