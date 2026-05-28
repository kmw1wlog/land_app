import type { RiskPreference } from "@/types";

const CAPITAL_AREA = ["서울", "경기", "인천", "강남구", "서초구", "송파구", "용산구", "성동구", "마포구", "광진구", "노원구", "분당구", "부천", "수원"];
const REGULATED_REGIONS = ["강남구", "서초구", "송파구", "용산구"];

export interface MortgageRuleInput {
  propertyPrice: number;
  region?: string | null;
  monthlyIncome: number;
  cashOnHand: number;
  annualExistingDebtService?: number;
  riskPreference?: RiskPreference;
  isFirstTimeBuyer?: boolean;
  homeCount?: number;
  mortgageRate?: number;
  termYears?: number;
  institution?: "bank" | "non_bank";
  rateType?: "variable" | "mixed" | "periodic" | "fixed";
  fixedYears?: number;
}

export interface MortgageAffordability {
  maxLoan: number;
  dsrLimit: number;
  ltvLimit: number;
  ltvRate: number;
  stressRate: number;
  stressedAnnualRate: number;
  monthlyPayment: number;
  dsrRatio: number;
  requiredCash: number;
  shortage: number;
  notes: string[];
}

export function calculateMortgageAffordability(input: MortgageRuleInput): MortgageAffordability {
  const propertyPrice = Math.max(0, input.propertyPrice);
  const termYears = clampTerm(input.termYears ?? defaultTermYears(input.region));
  const baseRate = input.mortgageRate ?? 0.045;
  const stressRate = stressRateForRegion(input.region);
  const stressedAnnualRate = baseRate + stressRate * stressApplyRatio(input);
  const annualIncome = Math.max(0, input.monthlyIncome * 12);
  const dsrLimitRatio = input.institution === "non_bank" ? 0.5 : 0.4;
  const existing = Math.max(0, input.annualExistingDebtService ?? 0);
  const annualDebtRoom = Math.max(0, annualIncome * dsrLimitRatio - existing);
  const dsrLimit = principalFromMonthlyPayment(annualDebtRoom / 12, stressedAnnualRate, termYears);
  const ltvRate = ltvRateFor(input);
  const rawLtvLimit = propertyPrice * ltvRate;
  const cap = absoluteMortgageCap(input.region, input.homeCount) ?? priceTierMortgageCap(input);
  const ltvLimit = Math.min(rawLtvLimit, cap ?? rawLtvLimit);
  const maxLoan = Math.floor(Math.max(0, Math.min(dsrLimit, ltvLimit)) / 10_000) * 10_000;
  const monthlyPayment = monthlyAmortizedPayment(maxLoan, stressedAnnualRate, termYears);
  const purchaseCosts = propertyPrice * 0.045;
  const requiredCash = Math.max(0, propertyPrice + purchaseCosts - maxLoan);
  const shortage = Math.max(0, requiredCash - input.cashOnHand);
  const dsrRatio = annualIncome > 0 ? (monthlyPayment * 12 + existing) / annualIncome : 1;

  return {
    maxLoan,
    dsrLimit: Math.floor(dsrLimit / 10_000) * 10_000,
    ltvLimit: Math.floor(ltvLimit / 10_000) * 10_000,
    ltvRate,
    stressRate,
    stressedAnnualRate,
    monthlyPayment: Math.round(monthlyPayment),
    dsrRatio: Math.round(dsrRatio * 1000) / 10,
    requiredCash: Math.round(requiredCash),
    shortage: Math.round(shortage),
    notes: notesFor(input, stressRate, termYears, cap)
  };
}

export function monthlyAmortizedPayment(principal: number, annualRate: number, years: number) {
  if (principal <= 0) return 0;
  const months = Math.max(1, years * 12);
  const monthlyRate = annualRate / 12;
  if (monthlyRate <= 0) return principal / months;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

export function principalFromMonthlyPayment(monthlyPayment: number, annualRate: number, years: number) {
  if (monthlyPayment <= 0) return 0;
  const months = Math.max(1, years * 12);
  const monthlyRate = annualRate / 12;
  if (monthlyRate <= 0) return monthlyPayment * months;
  return monthlyPayment * (Math.pow(1 + monthlyRate, months) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, months));
}

export function isCapitalOrRegulated(region?: string | null) {
  const text = region ?? "";
  return CAPITAL_AREA.some((item) => text.includes(item));
}

export function isRegulatedRegion(region?: string | null) {
  const text = region ?? "";
  return REGULATED_REGIONS.some((item) => text.includes(item));
}

function ltvRateFor(input: MortgageRuleInput) {
  if ((input.homeCount ?? 0) >= 2 && (isCapitalOrRegulated(input.region) || isRegulatedRegion(input.region))) return 0;
  if (input.isFirstTimeBuyer) return isRegulatedRegion(input.region) ? 0.7 : 0.8;
  if (isRegulatedRegion(input.region)) return 0.4;
  return 0.7;
}

function stressRateForRegion(region?: string | null) {
  // 2026-05 기준 금융위원회 발표 반영:
  // 수도권/규제지역 주담대는 스트레스 금리 하한 3.0%, 지방 주담대는 2026년 상반기 2단계 수준을 적용한다.
  return isCapitalOrRegulated(region) || isRegulatedRegion(region) ? 0.03 : 0.0075;
}

function stressApplyRatio(input: MortgageRuleInput) {
  if (input.rateType === "fixed") return 0;
  if (input.rateType === "mixed" || input.rateType === "periodic") {
    const fixedYears = input.fixedYears ?? 0;
    const term = input.termYears ?? 30;
    const ratio = fixedYears / term;
    if (ratio >= 0.7) return input.rateType === "mixed" ? 0.4 : 0.2;
    if (ratio >= 0.5) return input.rateType === "mixed" ? 0.6 : 0.3;
    if (ratio >= 0.3) return input.rateType === "mixed" ? 0.8 : 0.4;
  }
  return 1;
}

function absoluteMortgageCap(region?: string | null, homeCount = 0) {
  if (homeCount >= 2 && isCapitalOrRegulated(region)) return 0;
  return null;
}

function priceTierMortgageCap(input: MortgageRuleInput) {
  if (!isCapitalOrRegulated(input.region) && !isRegulatedRegion(input.region)) return null;
  if (input.propertyPrice > 2_500_000_000) return 200_000_000;
  if (input.propertyPrice > 1_500_000_000) return 400_000_000;
  return 600_000_000;
}

function defaultTermYears(region?: string | null) {
  return isCapitalOrRegulated(region) || isRegulatedRegion(region) ? 30 : 35;
}

function clampTerm(years: number) {
  return Math.min(40, Math.max(5, years));
}

function notesFor(input: MortgageRuleInput, stressRate: number, termYears: number, cap: number | null) {
  const notes = [
    `DSR 한도는 ${input.institution === "non_bank" ? "2금융권 50%" : "은행권 40%"}로 계산했습니다.`,
    `스트레스 금리 ${(stressRate * 100).toFixed(2)}%p를 반영했습니다.`,
    `상환기간은 ${termYears}년 원리금균등으로 계산했습니다.`
  ];
  if (cap !== null) notes.push(`수도권/규제지역 주담대 가격구간별 한도 ${Math.round(cap / 100000000)}억 원을 반영했습니다.`);
  if ((input.homeCount ?? 0) >= 2 && cap === 0) notes.push("다주택자의 수도권/규제지역 추가 주택구입 대출 제한을 반영했습니다.");
  if (input.isFirstTimeBuyer) notes.push("첫 주택 구매자 기준 LTV 우대 가능성을 반영한 참고 계산입니다.");
  return notes;
}
