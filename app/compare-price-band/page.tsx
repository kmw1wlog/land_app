"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Metric } from "@/components/Metric";
import { formatKRW, percent } from "@/lib/format";
import { estimateFusionMetricsForCandidate } from "@/lib/fusionPresentation";
import { useAppStore } from "@/store/useAppStore";
import type { PriceBandComparison } from "@/types";

export default function ComparePriceBandPage() {
  return (
    <Suspense fallback={<AppShell title="같은 예산이면 어디가 더 안전할까?" subtitle="비교 후보를 불러오는 중입니다."><div /></AppShell>}>
      <ComparePriceBandContent />
    </Suspense>
  );
}

function ComparePriceBandContent() {
  const params = useSearchParams();
  const activeCandidate = useAppStore((state) => state.activeCandidate);
  const setActiveCandidate = useAppStore((state) => state.setActiveCandidate);
  const profile = useAppStore((state) => state.profile);
  const currentHome = useAppStore((state) => state.currentHome);
  const [comparison, setComparison] = useState<PriceBandComparison | null>(null);
  const [error, setError] = useState("");
  const candidateId = params.get("candidate") ?? activeCandidate?.id;

  useEffect(() => {
    fetch("/api/discovery/compare-price-band", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId,
        profile,
        currentHome,
        preferredRegions: profile.preferredRegions,
        priceBandPercent: 10,
        includeSimilarRegions: true,
        limit: 12
      })
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setComparison(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "비교 실패"));
  }, [candidateId, profile, currentHome]);

  return (
    <AppShell title="같은 예산이면 어디가 더 안전할까?" subtitle="한 단지에 바로 꽂히기 전에, 같은 가격대 후보의 리스크와 접근성을 함께 비교하세요.">
      <div className="space-y-4">
        {error ? <p className="rounded-lg bg-coral/10 p-4 text-sm font-bold text-coral">{error}</p> : null}
        {comparison ? (
          <>
            <section className="rounded-lg bg-ink p-4 text-white">
              <p className="text-xs font-bold text-white/55">기준 후보</p>
              <h2 className="mt-1 text-2xl font-black">{comparison.base.complexName} {comparison.base.areaBucket}</h2>
              <p className="mt-2 text-sm text-white/70">기준가 {comparison.base.referencePrice ? formatKRW(comparison.base.referencePrice) : "미상"} · ±10% 가격대 비교</p>
              {activeCandidate ? (
                <Link
                  href={`/chat?intent=comparison&prompt=${encodeURIComponent("같은 예산 후보들 중 어떤 리스크를 비교해야 해?")}`}
                  className="mt-3 flex h-10 items-center justify-center rounded-md bg-white text-sm font-black text-ink"
                  onClick={() => setActiveCandidate(activeCandidate)}
                >
                  같은 예산 비교를 AI로 요약
                </Link>
              ) : null}
            </section>
            <section className="space-y-3">
              {comparison.comparables.map((item) => {
                const fusion = estimateFusionMetricsForCandidate(item.candidate);
                return (
                <article key={item.candidate.id} className="rounded-lg border border-black/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-moss">{item.candidate.region}</p>
                      <h2 className="mt-1 text-lg font-black text-ink">{item.candidate.complexName} {item.candidate.areaBucket}</h2>
                    </div>
                    <p className="text-lg font-black text-coral">{item.comparisonScore}점</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Metric label="기준가" value={item.candidate.referencePrice ? formatKRW(item.candidate.referencePrice) : "미상"} />
                    <Metric label="90일 거래" value={`${item.candidate.volume90d}건`} />
                    <Metric label="전고점 대비" value={item.candidate.drawdownFromHigh === null || item.candidate.drawdownFromHigh === undefined ? "미상" : percent(item.candidate.drawdownFromHigh)} />
                    <Metric label="대장성" value={`${Math.round(item.candidate.moveUp?.leaderScore ?? 0)}점`} />
                    <Metric label="유동성" value={`${Math.round(item.candidate.moveUp?.liquidityScore ?? 0)}점`} />
                    <Metric label="DSR" value={`${(item.candidate.userFit.dsrRatio ?? 0).toFixed(1)}%`} />
                  </div>
                  <div className="mt-3 rounded-md bg-black/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-black/45">융합 공공데이터 비교</p>
                      <span className="rounded bg-moss px-2 py-1 text-[10px] font-black text-white">KREB real · HUG/교통 시드</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                      <Metric label="지역시장 안정성" value={`${fusion.regionalMarketStability}점`} />
                      <Metric label="KREB 매매지수" value="real" />
                      <Metric label="KREB 전세지수" value="real" />
                      <Metric label="전세 리스크" value={`${fusion.jeonseRiskScore}점`} />
                      <Metric label="교통 접근성" value={`${fusion.transitAccessibilityScore}점`} />
                      <Metric label="융합 안정성" value={`${fusion.fusedStabilityScore}점`} />
                      <Metric label="데이터 신뢰도" value={`${Math.round(fusion.fusionConfidence * 100)}%`} />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs leading-5">
                    <div className="rounded-md bg-moss/10 p-3 text-moss">
                      <p className="font-black">나은 점</p>
                      {item.betterPoints.map((point) => <p key={point}>{point}</p>)}
                    </div>
                    <div className="rounded-md bg-coral/10 p-3 text-coral">
                      <p className="font-black">주의점</p>
                      {item.worsePoints.map((point) => <p key={point}>{point}</p>)}
                    </div>
                  </div>
                  <a href={item.candidate.externalLinks.naverSearchUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex h-10 items-center justify-center rounded-md bg-black/5 text-sm font-black text-ink">
                    외부 사이트에서 매물 확인
                  </a>
                  <Link
                    href={`/chat?intent=candidate_reason&prompt=${encodeURIComponent(`${item.candidate.complexName}와 같은 예산 후보를 비교할 때 어떤 리스크를 봐야 해?`)}`}
                    className="mt-2 flex h-10 items-center justify-center rounded-md bg-moss text-sm font-black text-white"
                    onClick={() => setActiveCandidate(item.candidate)}
                  >
                    AI에게 이 후보 설명 받기
                  </Link>
                </article>
                );
              })}
            </section>
          </>
        ) : !error ? (
          <p className="rounded-lg bg-white p-4 text-sm font-bold text-black/55">비교 후보를 불러오는 중입니다.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
