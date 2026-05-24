"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Brain, Building2, CheckCircle2, Home, MessageSquareText, Route, Sparkles } from "lucide-react";
import { demoCandidate, demoCommunityDraft, demoComparables, demoCurrentHome, demoLadder, demoProfile } from "@/lib/demoSubmissionData";
import { formatKRW, formatMonthly } from "@/lib/format";

const steps = [
  "Hero",
  "내 상황 입력",
  "구매력 요약",
  "실거래 후보 카드",
  "AI 설명",
  "같은 돈 비교",
  "커뮤니티",
  "Final"
];

export default function DemoSubmissionPage() {
  const [step, setStep] = useState(0);
  const activeStep = steps[step];

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      console.info("[demo] NEXT_PUBLIC_DEMO_MODE enabled");
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setStep((value) => Math.min(value + 1, steps.length - 1));
      }
      if (event.key === "ArrowLeft") {
        setStep((value) => Math.max(value - 1, 0));
      }
      if (event.key === "ArrowRight")") {
        setStep((value) => Math.min(value + 1, steps.length - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f1e7] text-ink">
      <div className="fixed left-6 top-5 z-50 rounded-full bg-white/80 px-4 py-2 text-sm font-black shadow-soft backdrop-blur">
        {step + 1}/{steps.length} · {activeStep}
      </div>
      <div className="fixed inset-x-0 top-0 z-40 h-1 bg-black/10">
        <div className="h-full bg-moss transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <section className="mx-auto flex min-h-screen max-w-[1280px] items-center px-12 py-12">
        <div key={step} className="w-full animate-[fadeIn_.45s_ease-out]">
          {step === 0 ? <HeroStep /> : null}
          {step === 1 ? <InputStep /> : null}
          {step === 2 ? <LadderStep /> : null}
          {step === 3 ? <CandidateStep /> : null}
          {step === 4 ? <AiExplanationStep /> : null}
          {step === 5 ? <CompareStep /> : null}
          {step === 6 ? <CommunityStep /> : null}
          {step === 7 ? <FinalStep /> : null}
        </div>
      </section>

      <div className="fixed bottom-8 right-8 z-50 flex gap-3">
        <button
          className="h-12 rounded-full bg-white px-5 text-sm font-black text-ink shadow-soft disabled:opacity-35"
          disabled={step === 0}
          onClick={() => setStep((value) => Math.max(value - 1, 0))}
        >
          이전
        </button>
        <button
          className="flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-black text-white shadow-soft disabled:opacity-35"
          disabled={step === steps.length - 1}
          onClick={() => setStep((value) => Math.min(value + 1, steps.length - 1))}
        >
          다음
          <ArrowRight size={17} />
        </button>
      </div>
    </main>
  );
}

function HeroStep() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
      <div>
        <p className="text-lg font-black text-moss">홈패스 · 공공데이터 기반 주거 구매력 진단</p>
        <h1 className="mt-5 text-7xl font-black leading-[1.04] tracking-normal text-ink">
          지금 내 조건으로
          <br />
          어디까지 가능할까?
        </h1>
        <p className="mt-8 max-w-2xl text-2xl font-bold leading-10 text-black/60">
          청년·사회초년생의 주거 구매력과 갈아타기 리스크를 공공 실거래 데이터로 설명 가능한 경로로 보여줍니다.
        </p>
        <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-black/45">
          본 서비스는 공공데이터와 사용자 입력값을 바탕으로 한 의사결정 보조 도구입니다.
        </p>
      </div>
      <div className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="grid gap-4 text-xl font-black">
          {["실거래가", "거래량", "전세가율", "주거비 부담"].map((item) => (
            <div key={item} className="rounded-xl bg-black/5 p-5">{item}</div>
          ))}
        </div>
        <p className="mt-6 rounded-xl bg-coral/10 p-5 text-2xl font-black text-coral">막연한 주거 고민을, 설명 가능한 경로로</p>
      </div>
    </div>
  );
}

function InputStep() {
  return (
    <DemoPanel eyebrow="Step 1" title="내 주거 조건을 입력합니다" icon={<Home size={34} />}>
      <div className="grid grid-cols-2 gap-5">
        <DemoMetric label="현재 주거 기준점" value={`${demoCurrentHome.complexName} · ${formatKRW(demoCurrentHome.estimatedCurrentPrice)}`} />
        <DemoMetric label="현재 대출잔액" value={formatKRW(demoCurrentHome.loanBalance)} />
        <DemoMetric label="월소득" value={formatMonthly(demoProfile.monthlyIncome)} />
        <DemoMetric label="보유현금" value={formatKRW(demoProfile.cashOnHand)} />
        <DemoMetric label="월저축" value={formatMonthly(demoProfile.monthlySavings)} />
        <DemoMetric label="관심지역" value={demoProfile.preferredRegions.join(" / ")} />
      </div>
    </DemoPanel>
  );
}

function LadderStep() {
  return (
    <DemoPanel eyebrow="Step 2" title="현재·정리 후·5년 뒤 구매력을 계산합니다" icon={<Route size={34} />}>
      <div className="grid grid-cols-4 gap-4">
        <DemoMetric label="현재 구매력" value={formatKRW(demoLadder.purchasePowerNow)} dark />
        <DemoMetric label="정리 후 구매력" value={formatKRW(demoLadder.purchasePowerAfterSale)} dark />
        <DemoMetric label="5년 뒤 구매력" value={formatKRW(demoLadder.purchasePowerInFiveYears)} dark />
        <DemoMetric label="주거 목표 기준" value={formatKRW(demoLadder.onePointFiveTarget)} dark />
      </div>
      <div className="mt-8 grid grid-cols-3 gap-5">
        <Band label="현재 접근권" price={demoLadder.purchasePowerNow} />
        <Band label="정리 후 확장권" price={demoLadder.purchasePowerAfterSale} active />
        <Band label="5년 뒤 목표권" price={demoLadder.purchasePowerInFiveYears} />
      </div>
    </DemoPanel>
  );
}

function CandidateStep() {
  return (
    <DemoPanel eyebrow="Step 3" title="공공 실거래 기반 분석 후보를 보여줍니다" icon={<Building2 size={34} />}>
      <div className="rounded-[1.5rem] bg-ink p-7 text-white">
        <div className="flex flex-wrap gap-3">
          <Tag>{demoCandidate.label}</Tag>
          <Tag>거래 집중 후보</Tag>
          <Tag>{demoCandidate.area}</Tag>
        </div>
        <h2 className="mt-8 text-5xl font-black">{demoCandidate.complexName}</h2>
        <p className="mt-2 text-xl font-bold text-white/60">{demoCandidate.region}</p>
        <div className="mt-8 grid grid-cols-5 gap-4">
          <DemoMetric label="기준가" value={formatKRW(demoCandidate.referencePrice)} dark />
          <DemoMetric label="거래 집중도" value={`${demoCandidate.transactionHeat}배`} dark />
          <DemoMetric label="전고점 대비" value={`${demoCandidate.drawdownFromHigh}%`} dark />
          <DemoMetric label="전세가율" value={`${demoCandidate.jeonseRatio}%`} dark />
          <DemoMetric label="DSR/LTV" value={`${demoCandidate.dsr}% / ${demoCandidate.ltv}%`} dark />
        </div>
        <p className="mt-6 text-sm font-bold leading-6 text-white/62">
          실거래 기반 분석 후보입니다. 실제 매물은 외부 사이트에서 확인하세요.
        </p>
      </div>
    </DemoPanel>
  );
}

function AiExplanationStep() {
  const score = estimateDemoAiScore();
  return (
    <DemoPanel eyebrow="Step 4" title="AI가 후보가 뜬 이유를 설명합니다" icon={<Brain size={34} />}>
      <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <div className="rounded-[1.5rem] bg-ink p-7 text-white">
          <p className="text-sm font-black text-white/60">AI 분석 신호</p>
          <h2 className="mt-3 text-6xl font-black">{score}점</h2>
          <p className="mt-4 text-xl font-bold leading-8 text-white/75">
            Transformer 프로토타입과 공공 실거래 지표를 함께 본 설명 가능한 보조 신호입니다.
          </p>
          <p className="mt-5 rounded-xl bg-white/10 p-4 text-sm font-bold leading-6 text-white/62">
            complex-level holdout 기준 AUC 0.6741, accuracy 0.7692 모델 artifact를 제출 증빙으로 활용합니다.
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-7 shadow-soft">
          <p className="text-sm font-black text-moss">질문</p>
          <h3 className="mt-2 text-3xl font-black">왜 이 후보가 떴나요?</h3>
          <div className="mt-6 space-y-3 text-lg font-bold leading-8 text-black/65">
            <p>1. 기준가 {formatKRW(demoCandidate.referencePrice)}와 현재·정리 후 구매력을 함께 비교했습니다.</p>
            <p>2. 거래 집중도 {demoCandidate.transactionHeat}배, 전고점 대비 {demoCandidate.drawdownFromHigh}% 구간을 반영했습니다.</p>
            <p>3. 전세가율 {demoCandidate.jeonseRatio}%, DSR/LTV {demoCandidate.dsr}%/{demoCandidate.ltv}%를 리스크 지표로 봅니다.</p>
          </div>
          <p className="mt-5 rounded-xl bg-coral/10 p-4 text-sm font-black leading-6 text-coral">
            이 설명은 참고용 의사결정 보조이며, 실제 매물·대출·세금은 외부 기관 확인이 필요합니다.
          </p>
        </div>
      </div>
    </DemoPanel>
  );
}

function CompareStep() {
  return (
    <DemoPanel eyebrow="Step 5" title="같은 예산이면 어디가 더 안전한지 비교합니다" icon={<BarChart3 size={34} />}>
      <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-soft">
        <div className="grid grid-cols-7 bg-ink px-5 py-4 text-sm font-black text-white">
          <span>단지</span>
          <span>기준가</span>
          <span>전고점</span>
          <span>90일 거래</span>
          <span>전세가율</span>
          <span>월부담</span>
          <span>대장성</span>
        </div>
        {demoComparables.map((item) => (
          <div key={item.name} className="grid grid-cols-7 border-t border-black/10 px-5 py-5 text-lg font-black">
            <span>{item.name}</span>
            <span>{formatKRW(item.price)}</span>
            <span>{item.drawdown}%</span>
            <span>{item.volume90d}건</span>
            <span>{item.jeonseRatio}%</span>
            <span>{formatMonthly(item.monthlyBurden)}</span>
            <span>{item.leaderScore}점</span>
          </div>
        ))}
      </div>
    </DemoPanel>
  );
}

function CommunityStep() {
  return (
    <DemoPanel eyebrow="Step 6" title="데이터만으로 부족한 맥락은 커뮤니티에서 확인합니다" icon={<MessageSquareText size={34} />}>
      <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div className="rounded-[1.5rem] bg-white p-6 shadow-soft">
          <p className="text-sm font-black text-moss">작성자 배지</p>
          <div className="mt-4 grid gap-3">
            {["실거주 경험자", "지역 경험자", "주거 이동 질문자"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl bg-black/5 p-4 text-lg font-black">
                <CheckCircle2 size={22} className="text-moss" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.5rem] bg-white p-6 shadow-soft">
          <p className="text-sm font-black text-moss">자동 질문 템플릿</p>
          <h2 className="mt-3 text-3xl font-black">{demoCommunityDraft.title}</h2>
          <pre className="mt-5 whitespace-pre-wrap rounded-xl bg-black/5 p-5 text-lg font-bold leading-8 text-black/65">{demoCommunityDraft.body}</pre>
        </div>
      </div>
    </DemoPanel>
  );
}

function FinalStep() {
  return (
    <div className="mx-auto max-w-5xl text-center">
      <Sparkles size={54} className="mx-auto text-gold" />
      <h1 className="mt-8 text-7xl font-black leading-[1.06] tracking-normal">
        집을 추천하는 앱이 아니라,
        <br />
        내 조건을 설명하는 앱.
      </h1>
      <p className="mt-8 text-3xl font-black text-moss">홈패스 · 공공데이터 기반 주거 구매력 진단</p>
    </div>
  );
}

function DemoPanel({ eyebrow, title, icon, children }: { eyebrow: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[2rem] bg-white/75 p-8 shadow-soft backdrop-blur">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-moss text-white">{icon}</div>
        <div>
          <p className="text-sm font-black uppercase text-moss">{eyebrow}</p>
          <h1 className="mt-1 text-4xl font-black tracking-normal">{title}</h1>
        </div>
      </div>
      {children}
    </div>
  );
}

function DemoMetric({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-xl p-5 ${dark ? "bg-white/10 text-white" : "bg-black/5 text-ink"}`}>
      <p className={`text-sm font-black ${dark ? "text-white/55" : "text-black/45"}`}>{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function Band({ label, price, active = false }: { label: string; price: number; active?: boolean }) {
  return (
    <div className={`rounded-2xl p-6 text-center ${active ? "bg-moss text-white" : "bg-black/5 text-ink"}`}>
      <p className="text-sm font-black opacity-65">{label}</p>
      <p className="mt-2 text-3xl font-black">{formatKRW(price)}</p>
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white">{children}</span>;
}

function estimateDemoAiScore() {
  const heat = Math.min(demoCandidate.transactionHeat / 4, 1);
  const drawdown = Math.min(Math.abs(demoCandidate.drawdownFromHigh) / 25, 1);
  const jeonse = Math.min(demoCandidate.jeonseRatio / 75, 1);
  const burdenPenalty = Math.max(0, Math.min((demoCandidate.dsr - 35) / 30, 0.35));
  return Math.round((heat * 0.34 + drawdown * 0.22 + jeonse * 0.26 + 0.18 - burdenPenalty) * 100);
}
