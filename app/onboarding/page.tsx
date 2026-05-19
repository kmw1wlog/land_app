"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { goalLabels, riskLabels, useAppStore } from "@/store/useAppStore";
import type { PrimaryGoal, RiskPreference } from "@/types";

const goals = Object.entries(goalLabels) as Array<[PrimaryGoal, string]>;
const risks = Object.entries(riskLabels) as Array<[RiskPreference, string]>;

export default function OnboardingPage() {
  const router = useRouter();
  const profile = useAppStore((state) => state.profile);
  const financialPlan = useAppStore((state) => state.financialPlan);
  const currentHome = useAppStore((state) => state.currentHome);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const updateFinancialPlan = useAppStore((state) => state.updateFinancialPlan);
  const updateCurrentHome = useAppStore((state) => state.updateCurrentHome);

  return (
    <main className="mx-auto min-h-screen max-w-[480px] bg-paper px-5 py-6 shadow-soft">
      <div className="mb-6">
        <p className="text-xs font-black uppercase text-moss">시작하기</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-ink">
          내 월급으로 어디까지 살 수 있을까?
        </h1>
        <p className="mt-2 text-sm leading-6 text-black/60">
          월급, 현금, 현재 집을 넣으면 팔기, 버티기, 월세, 전세, 갈아타기 시나리오를 바로 굴려봅니다.
        </p>
      </div>

      <section className="space-y-6">
        <div>
          <h2 className="text-sm font-black text-ink">현재 목표</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {goals.map(([key, label]) => (
              <button
                key={key}
                className={`min-h-12 rounded-md border px-3 text-left text-sm font-bold ${
                  profile.primaryGoal === key
                    ? "border-moss bg-moss text-white"
                    : "border-black/10 bg-white text-black/65"
                }`}
                onClick={() => updateProfile({ primaryGoal: key })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="월급/소득"
            value={profile.monthlyIncome}
            onChange={(value) => updateProfile({ monthlyIncome: value })}
          />
          <NumberField
            label="보유 현금"
            value={profile.cashOnHand}
            onChange={(value) => updateProfile({ cashOnHand: value })}
          />
          <NumberField
            label="월 저축액"
            value={profile.monthlySavings}
            onChange={(value) => updateProfile({ monthlySavings: value })}
          />
          <NumberField
            label="현재 주거비"
            value={profile.currentRent}
            onChange={(value) => updateProfile({ currentRent: value })}
          />
        </div>

        <div>
          <h2 className="text-sm font-black text-ink">위험 성향</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {risks.map(([key, label]) => (
              <button
                key={key}
                className={`min-h-11 rounded-md border text-sm font-bold ${
                  profile.riskPreference === key
                    ? "border-coral bg-coral text-white"
                    : "border-black/10 bg-white text-black/65"
                }`}
                onClick={() => updateProfile({ riskPreference: key })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-moss" size={18} />
            <h2 className="text-sm font-black text-ink">현재 집 정보</h2>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <TextField
              label="지역"
              value={currentHome.region}
              onChange={(value) => updateCurrentHome({ region: value })}
            />
            <NumberField
              label="추정가"
              value={currentHome.estimatedCurrentPrice}
              onChange={(value) => updateCurrentHome({ estimatedCurrentPrice: value })}
            />
            <NumberField
              label="취득가"
              value={currentHome.purchasePrice}
              onChange={(value) => updateCurrentHome({ purchasePrice: value })}
            />
            <NumberField
              label="대출잔액"
              value={currentHome.loanBalance}
              onChange={(value) => updateCurrentHome({ loanBalance: value })}
            />
          </div>
        </div>

        <div>
          <TextField
            label="선호 지역"
            value={profile.preferredRegions.join(", ")}
            onChange={(value) =>
              updateProfile({
                preferredRegions: value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              })
            }
          />
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-sm font-black text-ink">미래 구매능력/목표</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <PercentField
              label="연소득 상승률"
              value={financialPlan.annualIncomeGrowthRate}
              onChange={(value) => updateFinancialPlan({ annualIncomeGrowthRate: value })}
            />
            <PercentField
              label="저축액 상승률"
              value={financialPlan.monthlySavingsGrowthRate}
              onChange={(value) => updateFinancialPlan({ monthlySavingsGrowthRate: value })}
            />
            <NumberField
              label="감당 월부담"
              value={financialPlan.maxComfortableMonthlyPayment}
              onChange={(value) => updateFinancialPlan({ maxComfortableMonthlyPayment: value })}
            />
            <NumberField
              label="목표 집 가격"
              value={financialPlan.targetHomePrice}
              onChange={(value) => updateFinancialPlan({ targetHomePrice: value })}
            />
            <TextField
              label="목표 지역"
              value={financialPlan.targetRegion}
              onChange={(value) => updateFinancialPlan({ targetRegion: value })}
            />
            <label className="block">
              <span className="text-xs font-bold text-black/50">목표 시점</span>
              <select
                className="mt-1 h-12 w-full rounded-md border border-black/10 bg-white px-3 text-sm font-bold outline-none focus:border-moss"
                value={financialPlan.targetHorizonYears}
                onChange={(event) => updateFinancialPlan({ targetHorizonYears: Number(event.target.value) })}
              >
                <option value={3}>3년</option>
                <option value={5}>5년</option>
                <option value={10}>10년</option>
              </select>
            </label>
          </div>
        </div>

        <button
          className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-ink text-base font-black text-white"
          onClick={() => router.push("/feed")}
        >
          부동산 피드 보기
          <ArrowRight size={18} />
        </button>
      </section>
    </main>
  );
}

function PercentField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-black/50">{label}</span>
      <input
        className="mt-1 h-12 w-full rounded-md border border-black/10 bg-white px-3 text-sm font-bold outline-none focus:border-moss"
        inputMode="decimal"
        value={Math.round(value * 1000) / 10}
        onChange={(event) => onChange(Number(event.target.value || 0) / 100)}
      />
      <span className="mt-1 block text-[11px] text-black/42">% 단위</span>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-black/50">{label}</span>
      <input
        className="mt-1 h-12 w-full rounded-md border border-black/10 bg-white px-3 text-sm font-bold outline-none focus:border-moss"
        inputMode="numeric"
        value={Math.round(value / 10_000)}
        onChange={(event) => onChange(Number(event.target.value || 0) * 10_000)}
      />
      <span className="mt-1 block text-[11px] text-black/42">만원 단위</span>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-black/50">{label}</span>
      <input
        className="mt-1 h-12 w-full rounded-md border border-black/10 bg-white px-3 text-sm font-bold outline-none focus:border-moss"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
