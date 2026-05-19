"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Metric } from "@/components/Metric";
import { formatKRW, percent } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";
import type { PriceBandComparison } from "@/types";

export default function ComparePriceBandPage() {
  return (
    <Suspense fallback={<AppShell title="같은 돈이면 어디?" subtitle="비교 후보를 불러오는 중입니다."><div /></AppShell>}>
      <ComparePriceBandContent />
    </Suspense>
  );
}

function ComparePriceBandContent() {
  const params = useSearchParams();
  const activeCandidate = useAppStore((state) => state.activeCandidate);
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
    <AppShell title="같은 돈이면 어디?" subtitle="보고 있는 단지에 꽂히기 전에, 같은 가격대 인근 후보를 비교하세요.">
      <div className="space-y-4">
        {error ? <p className="rounded-lg bg-coral/10 p-4 text-sm font-bold text-coral">{error}</p> : null}
        {comparison ? (
          <>
            <section className="rounded-lg bg-ink p-4 text-white">
              <p className="text-xs font-bold text-white/55">기준 후보</p>
              <h2 className="mt-1 text-2xl font-black">{comparison.base.complexName} {comparison.base.areaBucket}</h2>
              <p className="mt-2 text-sm text-white/70">기준가 {comparison.base.referencePrice ? formatKRW(comparison.base.referencePrice) : "미상"} · ±10% 가격대 비교</p>
            </section>
            <section className="space-y-3">
              {comparison.comparables.map((item) => (
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
                    네이버에서 현재 매물 보기
                  </a>
                </article>
              ))}
            </section>
          </>
        ) : !error ? (
          <p className="rounded-lg bg-white p-4 text-sm font-bold text-black/55">비교 후보를 불러오는 중입니다.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
