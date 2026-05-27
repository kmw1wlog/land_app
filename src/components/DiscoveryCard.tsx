"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Bookmark, ExternalLink, Heart, Map, MessageCircle, Scale, X } from "lucide-react";
import type { ComplexSignalCandidate } from "@/types";
import { complexSignalToPropertyLike } from "@/lib/candidateAdapter";
import { analyzePropertyForUser } from "@/lib/calculations";
import { calculateFuturePurchasePower } from "@/lib/futurePlan";
import { formatKRW, formatMonthly, percent } from "@/lib/format";
import { estimateFusionMetricsForCandidate, getFusionEvidenceBadges } from "@/lib/fusionPresentation";
import { useAppStore } from "@/store/useAppStore";
import { Label } from "./Label";
import { Metric } from "./Metric";

interface DiscoveryCardProps {
  card: ComplexSignalCandidate;
  onNext?: () => void;
}

export function DiscoveryCard({ card, onNext }: DiscoveryCardProps) {
  const profile = useAppStore((state) => state.profile);
  const currentHome = useAppStore((state) => state.currentHome);
  const financialPlan = useAppStore((state) => state.financialPlan);
  const setActiveCandidate = useAppStore((state) => state.setActiveCandidate);
  const saveCandidateToPortfolio = useAppStore((state) => state.saveCandidateToPortfolio);
  const recordSwipe = useAppStore((state) => state.recordSwipe);
  const [showWhy, setShowWhy] = useState(false);
  const [showLinkSuggest, setShowLinkSuggest] = useState(false);
  const [suggestedUrl, setSuggestedUrl] = useState("");
  const propertyLike = complexSignalToPropertyLike(card);
  const analysis = analyzePropertyForUser(profile, currentHome, propertyLike);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-6, 0, 6]);
  const future5 = calculateFuturePurchasePower(profile, currentHome, financialPlan, 5) >= (card.referencePrice ?? 0);
  const future10 = calculateFuturePurchasePower(profile, currentHome, financialPlan, 10) >= (card.referencePrice ?? 0);
  const fusionMetrics = estimateFusionMetricsForCandidate(card);
  const fusionBadges = getFusionEvidenceBadges();

  const next = (action: "pass" | "save" | "calculate" | "community") => {
    recordSwipe(card.id, action);
    setActiveCandidate(card);
    if (action === "save") {
      saveCandidateToPortfolio(card);
    }
    onNext?.();
  };

  return (
    <motion.article
      className="relative overflow-hidden rounded-lg border border-black/10 bg-white shadow-soft"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 120) next(info.offset.x > 0 ? "save" : "pass");
      }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="relative min-h-[15rem] bg-[linear-gradient(135deg,#20352f,#e26045_62%,#d8a33f)] p-4 text-white">
        <div className="flex flex-wrap gap-2">
          <Label tone="direct">공공 실거래가 기반 분석 후보</Label>
          <Label>{card.propertyType === "officetel" ? "오피스텔" : "아파트"}</Label>
          <Label>{areaBucketText(card.areaBucket)}</Label>
          <Label>{floorBandText(card.floorBand)}</Label>
        </div>
        <div className="mt-10">
          <p className="text-sm font-bold text-white/70">{card.region} {card.legalDong ?? ""}</p>
          <h2 className="mt-2 text-3xl font-black leading-tight">{card.complexName}</h2>
          <p className="mt-3 text-sm font-bold text-white/78">
            {card.userFit.possibleAfterSellingCurrentHome
              ? "현재 기준점 정리 시 접근 가능한 단지/면적대"
              : card.userFit.yearsToReach !== null
                ? `${card.userFit.yearsToReach}년 준비 루트 후보`
                : "관심지역 거래 집중 후보"}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-md bg-ink p-4 text-white">
          <p className="text-xs font-bold text-white/55">최근 실거래 기준가</p>
          <p className="mt-1 text-2xl font-black">{card.referencePrice ? formatKRW(card.referencePrice) : "데이터 부족"}</p>
          <p className="mt-2 text-xs leading-5 text-white/65">
            {card.referencePriceMethod} · 최신 거래 {card.latestTradeDate?.slice(0, 10) ?? "미상"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Metric label="30일 거래" value={`${card.volume30d}건`} />
          <Metric label="거래 집중도" value={`${card.transactionHeat.toFixed(1)}배`} />
          <Metric label="90일 거래" value={`${card.volume90d}건`} />
          <Metric label="전고점 대비" value={card.drawdownFromHigh === null || card.drawdownFromHigh === undefined ? "미상" : percent(card.drawdownFromHigh)} />
          <Metric label="전세가율" value={card.jeonseRatio ? `${card.jeonseRatio.toFixed(1)}%` : "미상"} />
          <Metric label="존재 가능성" value={`${Math.round(card.inventoryLikelihoodScore)}점`} />
        </div>

        <div className="rounded-md border border-black/10 bg-white p-3">
          <p className="text-[11px] font-bold text-black/45">주거 경로 밴드</p>
          <p className="mt-1 text-sm font-black text-ink">{card.moveUp?.priceBandLabel ?? "목표 가격대 계산 전"}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <Metric label="유동성" value={`${Math.round(card.moveUp?.liquidityScore ?? 0)}점`} />
            <Metric label="대장성" value={`${Math.round(card.moveUp?.leaderScore ?? 0)}점`} />
            <Metric label="매도성" value={`${Math.round(card.moveUp?.sellabilityScore ?? 0)}점`} />
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
            데이터 신뢰도는 {fusionMetrics.dataConfidenceLabel}입니다. HUG·교통 항목은 시드로 표시하고, 가격 상승 가능성이 아니라 주거 안정성 참고 점수로만 사용합니다.
          </p>
        </div>

        <div className="rounded-md border border-black/10 bg-white p-3">
          <p className="text-[11px] font-bold text-black/45">층별 실거래 기준가</p>
          <p className="mt-1 text-sm font-black text-ink">
            저층 {card.floorPriceSummary?.low ? formatKRW(card.floorPriceSummary.low) : "-"} · 중층{" "}
            {card.floorPriceSummary?.mid ? formatKRW(card.floorPriceSummary.mid) : "-"} · 고층{" "}
            {card.floorPriceSummary?.high ? formatKRW(card.floorPriceSummary.high) : "-"}
          </p>
          {card.floorPriceSummary?.warning ? (
            <p className="mt-2 text-xs leading-5 text-coral">{card.floorPriceSummary.warning}</p>
          ) : null}
        </div>

        <div className="rounded-md border border-black/10 bg-white p-3">
          <p className="text-[11px] font-bold text-black/45">내 상황</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <span>현재 {card.userFit.possibleNow ? "가능" : "부족"}</span>
            <span>정리 후 {card.userFit.possibleAfterSellingCurrentHome ? "접근 가능" : "추가 준비"}</span>
            <span>부족액 {formatKRW(card.userFit.shortageNow ?? analysis.shortage)}</span>
            <span>월부담 {formatMonthly(card.userFit.monthlyBurdenDelta ?? analysis.monthlyDebtPayment)}</span>
            <span>DSR {(card.userFit.dsrRatio ?? analysis.dsrRatio).toFixed(1)}%</span>
            <span>LTV {((card.userFit.ltvRate ?? analysis.ltvRate) * 100).toFixed(0)}%</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-black">
            <span className={`rounded py-2 ${future5 ? "bg-moss text-white" : "bg-black/5 text-black/55"}`}>5년 {future5 ? "접근" : "준비"}</span>
            <span className={`rounded py-2 ${future10 ? "bg-moss text-white" : "bg-black/5 text-black/55"}`}>10년 {future10 ? "접근" : "준비"}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-black/5 p-3">
            <p className="text-[11px] font-bold text-black/45">추천 점수</p>
            <p className="text-xl font-black text-moss">{card.scores.recommendationScore}</p>
          </div>
          <div className="rounded-md bg-black/5 p-3">
            <p className="text-[11px] font-bold text-black/45">지역 적합</p>
            <p className="text-xl font-black text-coral">{card.scores.regionFit}</p>
          </div>
          <div className="rounded-md bg-black/5 p-3">
            <p className="text-[11px] font-bold text-black/45">재가속</p>
            <p className="text-xl font-black text-gold">{card.reaccelerationScore.toFixed(1)}배</p>
          </div>
        </div>

        <p className="rounded-md bg-black/5 p-3 text-xs leading-5 text-black/55">{card.disclaimer}</p>

        <div className="rounded-md bg-moss/10 p-3 text-xs leading-5 text-moss">
          <p className="font-black">주거 이동 체크리스트</p>
          <p>{mark(card.moveUp?.checklist.priceBandPass)} 1.3/1.5/2.0배 목표 가격대</p>
          <p>{mark(card.moveUp?.checklist.liquidityPass)} 최근 월 1건 이상 거래 또는 400세대 이상</p>
          <p>{mark(card.moveUp?.checklist.leaderPass)} 지역 대장성 65점 이상</p>
          <p>{mark(card.moveUp?.checklist.floorPass)} 저층 재매도 리스크 통과</p>
          <p>△ 교통/학군 데이터 확인 전</p>
        </div>

        <button className="h-10 w-full rounded-md bg-black/5 text-sm font-black text-ink" onClick={() => setShowWhy(true)}>
          왜 떴지?
        </button>
        <Link
          href={`/chat?intent=candidate_reason&prompt=${encodeURIComponent(`${card.complexName} ${areaBucketText(card.areaBucket)}가 왜 후보로 떴는지 공공데이터와 AI 신호 기준으로 설명해줘.`)}`}
          className="flex h-10 w-full items-center justify-center rounded-md bg-moss text-sm font-black text-white"
          onClick={() => setActiveCandidate(card)}
        >
          AI가 이 후보 이유 설명
        </Link>

        <div className="grid grid-cols-6 gap-2">
          <button className="flex h-12 items-center justify-center rounded-md bg-black/8 text-ink" title="넘기기" onClick={() => next("pass")}>
            <X size={19} />
          </button>
          <button className="flex h-12 items-center justify-center rounded-md bg-coral text-white" title="저장" onClick={() => next("save")}>
            <Heart size={19} />
          </button>
          <Link href="/goal-path" className="flex h-12 items-center justify-center rounded-md bg-moss text-white" title="도달경로" onClick={() => next("calculate")}>
            <Map size={19} />
          </Link>
          <Link href={`/compare-price-band?candidate=${card.id}`} className="flex h-12 items-center justify-center rounded-md bg-ink text-white" title="같은 돈 비교" onClick={() => setActiveCandidate(card)}>
            <Scale size={19} />
          </Link>
          <Link href={`/community?room=${encodeURIComponent(`${card.lawdCode5}:${card.propertyType}:${card.complexName}`)}`} className="flex h-12 items-center justify-center rounded-md bg-sky text-white" title="커뮤니티" onClick={() => next("community")}>
            <MessageCircle size={19} />
          </Link>
          <a
            href={card.externalLinks.naverSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center rounded-md bg-gold text-ink"
            title="외부 사이트에서 매물 확인"
          >
            <ExternalLink size={19} />
          </a>
        </div>
        <Link
          href={`/community?room=${encodeURIComponent(`${card.lawdCode5}:${card.propertyType}:${card.complexName}`)}&draft=1&title=${encodeURIComponent(`${card.region} ${card.complexName} ${areaBucketText(card.areaBucket)}, 주거 이동 후보로 어떤가요?`)}&body=${encodeURIComponent(`최근 실거래 기준가: ${card.referencePrice ? formatKRW(card.referencePrice) : "미상"}\n최근 90일 거래: ${card.volume90d}건\n거래 집중도: ${card.transactionHeat.toFixed(1)}배\n전고점 대비: ${card.drawdownFromHigh?.toFixed(1) ?? "미상"}%\n전세가율: ${card.jeonseRatio?.toFixed(1) ?? "미상"}%\n현재 기준점 정리 시 접근 가능 여부: ${card.userFit.possibleAfterSellingCurrentHome ? "가능" : "추가 준비"}\n\n비슷한 가격대 후보와 비교하면 어떻게 보시나요?`)}`}
          className="flex h-11 items-center justify-center rounded-md bg-sky/10 text-sm font-black text-sky"
          onClick={() => setActiveCandidate(card)}
        >
          이 단지 의견 묻기
        </Link>

        <a
          href={card.externalLinks.naverSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-md border border-black/10 bg-white text-sm font-black text-ink"
        >
          <Bookmark size={16} />
          외부 사이트에서 매물 확인
        </a>
        <div className="grid grid-cols-2 gap-2">
          <p className="rounded-md bg-black/5 p-3 text-xs font-bold text-black/55">
            네이버 링크: {naverAccuracyLabel(card.externalLinks.accuracyLevel)}
          </p>
          <button
            className="rounded-md bg-black/5 p-3 text-xs font-black text-ink"
            onClick={() => setShowLinkSuggest(true)}
          >
            링크 수정 제안
          </button>
        </div>
      </div>

      {showWhy ? (
        <div className="absolute inset-0 z-40 flex items-end bg-black/45 p-4">
          <div className="w-full rounded-lg bg-white p-4 shadow-soft">
            <h3 className="text-lg font-black text-ink">왜 이 단지가 떴지?</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-black/62">
              {card.reasons.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button className="mt-3 h-11 w-full rounded-md bg-ink text-sm font-black text-white" onClick={() => setShowWhy(false)}>
              확인
            </button>
          </div>
        </div>
      ) : null}
      {showLinkSuggest ? (
        <div className="absolute inset-0 z-40 flex items-end bg-black/45 p-4">
          <div className="w-full rounded-lg bg-white p-4 shadow-soft">
            <h3 className="text-lg font-black text-ink">네이버 링크 수정 제안</h3>
            <p className="mt-1 text-xs leading-5 text-black/55">이 단지의 네이버 부동산 링크를 붙여넣어 주세요. 승인 전까지는 기존 검색 링크를 사용합니다.</p>
            <input
              className="mt-3 h-11 w-full rounded-md border border-black/10 px-3 text-sm outline-none focus:border-moss"
              placeholder="https://new.land.naver.com/..."
              value={suggestedUrl}
              onChange={(event) => setSuggestedUrl(event.target.value)}
            />
            <button
              className="mt-2 h-11 w-full rounded-md bg-ink text-sm font-black text-white"
              onClick={() => {
                fetch("/api/external-links/naver/suggest", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    lawdCode5: card.lawdCode5,
                    legalDongCode10: card.legalDongCode10,
                    region: card.region,
                    legalDong: card.legalDong,
                    complexName: card.complexName,
                    propertyType: card.propertyType,
                    externalUrl: suggestedUrl
                  })
                }).finally(() => {
                  setSuggestedUrl("");
                  setShowLinkSuggest(false);
                });
              }}
            >
              제안 저장
            </button>
            <button className="mt-2 h-10 w-full rounded-md bg-black/5 text-sm font-black text-ink" onClick={() => setShowLinkSuggest(false)}>
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </motion.article>
  );
}

function mark(value?: boolean | null) {
  if (value === true) return "✓";
  if (value === false) return "✕";
  return "△";
}

function naverAccuracyLabel(value: string) {
  if (value === "exact_mapped_complex") return "정확 단지 링크";
  if (value === "address_search") return "주소 검색";
  if (value === "complex_name_search") return "단지명 검색";
  return "지역 검색";
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

function floorBandText(band: string) {
  if (band === "low") return "저층 기준";
  if (band === "mid") return "중층 기준";
  if (band === "high") return "고층 기준";
  return "층수 통합";
}
