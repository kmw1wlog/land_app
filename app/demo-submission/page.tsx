"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Building2, CheckCircle2, Home, MessageSquareText, Route, Sparkles } from "lucide-react";
import { demoCandidate, demoCommunityDraft, demoComparables, demoCurrentHome, demoLadder, demoProfile } from "@/lib/demoSubmissionData";
import { formatKRW, formatMonthly } from "@/lib/format";

const steps = [
  "Hero",
  "내 상황 입력",
  "사다리 요약",
  "실거래 후보 카드",
  "같은 돈 비교",
  "종토방",
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
      if (event.key === "ArrowRight") {
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
          {step === 4 ? <CompareStep /> : null}
          {step === 5 ? <CommunityStep /> : null}
          {step === 6 ? <FinalStep /> : null}
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
        <p className="text-lg font-black text-moss">실거래로 그리는 부동산 사다리 앱</p>
        <h1 className="mt-5 text-7xl font-black leading-[1.04] tracking-normal text-ink">
          내 집 팔고
          <br />
          어디까지 갈 수 있을까?
        </h1>
        <p className="mt-8 max-w-2xl text-2xl font-bold leading-10 text-black/60">
          호갱노노·아실이 단지를 보여준다면, 우리는 그 단지가 내 상황에서 갈 수 있는 단지인지 계산합니다.
        </p>
      </div>
      <div className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="grid gap-4 text-xl font-black">
          {["실거래가", "거래량", "매물", "단지정보"].map((item) => (
            <div key={item} className="rounded-xl bg-black/5 p-5">{item}</div>
          ))}
        </div>
        <p className="mt-6 rounded-xl bg-coral/10 p-5 text-2xl font-black text-coral">그래서 나는 어디까지 갈 수 있지?</p>
      </div>
    </div>
  );
}

function InputStep() {
  return (
    <DemoPanel eyebrow="Step 1" title="내 상황을 입력합니다" icon={<Home size={34} />}>
      <div className="grid grid-cols-2 gap-5">
        <DemoMetric label="현재 집" value={`${demoCurrentHome.complexName} · ${formatKRW(demoCurrentHome.estimatedCurrentPrice)}`} />
        <DemoMetric label="대출잔액" value={formatKRW(demoCurrentHome.loanBalance)} />
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
    <DemoPanel eyebrow="Step 2" title="현재·매도 후·5년 뒤 사다리를 계산합니다" icon={<Route size={34} />}>
      <div className="grid grid-cols-4 gap-4">
        <DemoMetric label="현재 구매력" value={formatKRW(demoLadder.purchasePowerNow)} dark />
        <DemoMetric label="매도 시 구매력" value={formatKRW(demoLadder.purchasePowerAfterSale)} dark />
        <DemoMetric label="5년 뒤 구매력" value={formatKRW(demoLadder.purchasePowerInFiveYears)} dark />
        <DemoMetric label="1.5배 목표" value={formatKRW(demoLadder.onePointFiveTarget)} dark />
      </div>
      <div className="mt-8 grid grid-cols-3 gap-5">
        <Band label="1.3배 현실권" price={1_040_000_000} />
        <Band label="1.5배 목표권" price={1_200_000_000} active />
        <Band label="2.0배 장기권" price={1_600_000_000} />
      </div>
    </DemoPanel>
  );
}

function CandidateStep() {
  return (
    <DemoPanel eyebrow="Step 3" title="실거래 기반 후보 카드를 보여줍니다" icon={<Building2 size={34} />}>
      <div className="rounded-[1.5rem] bg-ink p-7 text-white">
        <div className="flex flex-wrap gap-3">
          <Tag>1.5배 후보</Tag>
          <Tag>거래 집중</Tag>
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
      </div>
    </DemoPanel>
  );
}

function CompareStep() {
  return (
    <DemoPanel eyebrow="Step 4" title="같은 돈이면 어디가 나은지 비교합니다" icon={<BarChart3 size={34} />}>
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
    <DemoPanel eyebrow="Step 5" title="데이터만으로 부족한 맥락은 단지방에서 확인합니다" icon={<MessageSquareText size={34} />}>
      <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div className="rounded-[1.5rem] bg-white p-6 shadow-soft">
          <p className="text-sm font-black text-moss">작성자 배지</p>
          <div className="mt-4 grid gap-3">
            {["보유자", "실거주자", "매수대기자"].map((item) => (
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
        부동산을 보는 앱이 아니라,
        <br />
        내 미래를 그리는 앱.
      </h1>
      <p className="mt-8 text-3xl font-black text-moss">실거래로 그리는 부동산 사다리 앱</p>
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
