"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, MessageCircle, Phone, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EstimateNotice } from "@/components/EstimateNotice";
import { Label } from "@/components/Label";
import { LeadConsentModal } from "@/components/LeadConsentModal";
import { Metric } from "@/components/Metric";
import { communityPosts, properties } from "@/data/dummy";
import {
  analyzePropertyForUser,
  calculateScenarioResults
} from "@/lib/calculations";
import { formatKRW, formatMonthly, percent } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";
import type { Property } from "@/types";

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const [apiProperty, setApiProperty] = useState<Property | null>(null);
  const property = apiProperty ?? properties.find((item) => item.id === params.id);
  const profile = useAppStore((state) => state.profile);
  const currentHome = useAppStore((state) => state.currentHome);
  const saveToPortfolio = useAppStore((state) => state.saveToPortfolio);
  const setActiveProperty = useAppStore((state) => state.setActiveProperty);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${params.id}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.property) setApiProperty(data.property);
      })
      .catch(() => setApiProperty(null));
  }, [params.id]);

  if (!property) {
    notFound();
  }

  const analysis = analyzePropertyForUser(profile, currentHome, property);
  const scenarios = calculateScenarioResults(profile, currentHome, property);
  const posts = communityPosts
    .filter((post) => post.propertyId === property.id || post.region === property.region)
    .slice(0, 3);

  return (
    <AppShell
      title="부동산 상세"
      subtitle={property.name}
      action={
        <Link href="/feed" className="flex h-10 w-10 items-center justify-center rounded-md bg-white">
          <ArrowLeft size={18} />
        </Link>
      }
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-lg border border-black/10 bg-white">
          <div className="relative h-56 overflow-hidden bg-[linear-gradient(135deg,#6fa8dc,#2f5d50_48%,#e26045)] text-white">
            {property.photoUrls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={property.photoUrls[0]} alt="" className="h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/25" />
            <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2">
              {property.isAd ? <Label tone="ad">광고</Label> : null}
              {property.isPartnerListing ? <Label tone="ad">제휴 중개사 매물</Label> : null}
              {property.isDirectListing ? <Label tone="direct">직영 검증 매물</Label> : null}
            </div>
            <h2 className="absolute bottom-4 left-4 right-4 text-3xl font-black">{property.name}</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 p-4">
            <Metric label="매매가" value={formatKRW(property.salePrice)} />
            <Metric label="전세가" value={formatKRW(property.jeonsePrice)} />
            <Metric label="월세" value={formatMonthly(property.expectedMonthlyRent)} />
            <Metric label="실투자금" value={formatKRW(analysis.investmentAmount)} />
            <Metric label="주변 대비" value={percent(property.drawdownFromHigh)} />
            <Metric label="리스크" value={`${Math.round((property.supplyRiskScore + property.vacancyRiskScore) / 2)}점`} />
            <Metric label="필요 현금" value={formatKRW(analysis.requiredCash)} />
            <Metric label="대출 한도" value={formatKRW(analysis.loanLimit)} />
            <Metric label="DSR" value={`${analysis.dsrRatio.toFixed(1)}%`} />
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-base font-black text-ink">사진</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(property.photoUrls?.length ? property.photoUrls : [null, null, null]).slice(0, 3).map((url, index) => (
              <div key={`${url ?? "placeholder"}-${index}`} className="aspect-square overflow-hidden rounded-md bg-[linear-gradient(135deg,#d9e8df,#f1b66c)]">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-black/52">
            사진은 인증 중개사·소유자·직영팀 업로드만 노출하며, 권리 확인 전 사진은 공개 갤러리에 표시하지 않습니다.
          </p>
        </section>

        <EstimateNotice />

        <section className="rounded-lg bg-ink p-4 text-white">
          <p className="text-xs font-bold text-white/55">내 상황 기준 분석</p>
          <h2 className="mt-2 text-2xl font-black">
            {analysis.isAffordableAfterSale ? "갈아타기 후보로 계산 가능" : "준비 기간을 줄이는 루트가 필요"}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <span>부족 금액 {formatKRW(analysis.shortage)}</span>
            <span>도달 기간 {analysis.monthsToReach}개월</span>
            <span>월 부담 {formatMonthly(analysis.monthlyDebtPayment)}</span>
            <span>월 현금흐름 {formatMonthly(analysis.monthlyCashFlow)}</span>
            <span>LTV 한도 {formatKRW(analysis.ltvLimit)}</span>
            <span>LTV {(analysis.ltvRate * 100).toFixed(0)}%</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-white/60">{analysis.regulationNotes[0]} 참고용 추정치입니다.</p>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-base font-black text-ink">시나리오 요약</h2>
          <div className="mt-3 space-y-2">
            {scenarios.slice(0, 4).map((scenario) => (
              <div key={scenario.scenarioType} className="flex items-center justify-between rounded-md bg-black/5 p-3">
                <div>
                  <p className="font-black text-ink">{scenario.label}</p>
                  <p className="text-xs text-black/52">월 {formatMonthly(scenario.monthlyCashFlow)}</p>
                </div>
                <p className="text-lg font-black text-moss">{Math.round(scenario.fitScore)}점</p>
              </div>
            ))}
          </div>
          <Link
            href="/scenarios"
            className="mt-3 flex h-12 items-center justify-center rounded-md bg-moss text-sm font-black text-white"
            onClick={() => setActiveProperty(property.id)}
          >
            전체 비교 보기
          </Link>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-ink">종토방 미리보기</h2>
            <Link href="/community" className="text-xs font-black text-moss">
              더 보기
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {posts.map((post) => (
              <article key={post.id} className="rounded-md bg-black/5 p-3">
                <p className="text-xs font-bold text-coral">{post.authorBadge}</p>
                <h3 className="mt-1 font-black text-ink">{post.title}</h3>
                <p className="mt-1 text-xs text-black/50">좋아요 {post.likes} · 댓글 {post.commentCount}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2">
          <button
            className="flex h-12 items-center justify-center gap-1 rounded-md bg-coral text-sm font-black text-white"
            onClick={() => saveToPortfolio(property.id)}
          >
            <Plus size={16} />
            저장
          </button>
          <Link
            href="/community"
            className="flex h-12 items-center justify-center gap-1 rounded-md bg-sky text-sm font-black text-white"
          >
            <MessageCircle size={16} />
            종토방
          </Link>
          <button
            className="flex h-12 items-center justify-center gap-1 rounded-md bg-gold text-sm font-black text-ink"
            onClick={() => setShowConsent(true)}
          >
            <Phone size={16} />
            상담
          </button>
        </div>
        <LeadConsentModal
          open={showConsent}
          onClose={() => setShowConsent(false)}
          property={property}
          profile={profile}
          currentHome={currentHome}
          message={`${property.name} 상세 화면 상담 요청`}
        />
      </div>
    </AppShell>
  );
}
