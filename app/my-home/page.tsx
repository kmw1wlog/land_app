"use client";

import { useMemo, useState } from "react";
import { Home, Pencil } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EstimateNotice } from "@/components/EstimateNotice";
import { Metric } from "@/components/Metric";
import { MoveUpLadderSummary } from "@/components/MoveUpLadderSummary";
import { properties } from "@/data/dummy";
import { calculateNetCashAfterSellingHome, calculateScenarioResults } from "@/lib/calculations";
import { calculateFuturePurchasePower } from "@/lib/futurePlan";
import { formatKRW, formatMonthly } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";
import type { ScenarioResult } from "@/types";

interface PublicDataPanelState {
  loading: boolean;
  normalized?: Record<string, unknown>;
  valuation?: {
    snapshot?: {
      estimatedPrice?: number | null;
      estimatedJeonsePrice?: number | null;
      jeonseRatio?: number | null;
      drawdownFromHigh?: number | null;
      recentTradeCount?: number | null;
      warnings?: unknown;
    };
    recentTrade?: Array<Record<string, unknown>>;
    recentRent?: Array<Record<string, unknown>>;
    notice?: string;
  };
  error?: string;
}

const nodes: Array<{ label: string; key: ScenarioResult["scenarioType"]; x: string; y: string }> = [
  { label: "추가 매수", key: "additional_purchase", x: "50%", y: "4%" },
  { label: "월세 전환", key: "convert_to_monthly_rent", x: "5%", y: "35%" },
  { label: "지금 매도", key: "sell_now", x: "67%", y: "29%" },
  { label: "전세 전환", key: "convert_to_jeonse", x: "13%", y: "72%" },
  { label: "계속 보유", key: "hold", x: "49%", y: "82%" },
  { label: "갈아타기", key: "move_up", x: "72%", y: "68%" }
];

export default function MyHomePage() {
  const profile = useAppStore((state) => state.profile);
  const financialPlan = useAppStore((state) => state.financialPlan);
  const currentHome = useAppStore((state) => state.currentHome);
  const updateCurrentHome = useAppStore((state) => state.updateCurrentHome);
  const [active, setActive] = useState<ScenarioResult["scenarioType"]>("sell_now");
  const [addressDraft, setAddressDraft] = useState(currentHome.address);
  const [complexNameDraft, setComplexNameDraft] = useState("");
  const [areaM2Draft, setAreaM2Draft] = useState(String(properties[0]?.areaM2 ?? 84));
  const [floorDraft, setFloorDraft] = useState(String(currentHome.propertyType === "apartment" ? 10 : 5));
  const [propertyTypeDraft, setPropertyTypeDraft] = useState(currentHome.propertyType);
  const [publicData, setPublicData] = useState<PublicDataPanelState>({ loading: false });
  const [showAdvancedPublicData, setShowAdvancedPublicData] = useState(false);
  const scenarioRows = useMemo(
    () => calculateScenarioResults(profile, currentHome, properties[0]),
    [profile, currentHome]
  );
  const activeScenario = scenarioRows.find((row) => row.scenarioType === active) ?? scenarioRows[0];
  const badgeByScenario = (type: ScenarioResult["scenarioType"]) => {
    const scenario = scenarioRows.find((row) => row.scenarioType === type);
    if (!scenario) return "";
    if (type === "sell_now") return `세후 ${formatKRW(calculateNetCashAfterSellingHome(currentHome))}`;
    if (type === "convert_to_monthly_rent") return `월 ${formatMonthly(scenario.monthlyCashFlow)}`;
    if (type === "convert_to_jeonse") return `유동성 ${formatKRW(Math.max(currentHome.deposit, currentHome.estimatedCurrentPrice * 0.62 - currentHome.loanBalance))}`;
    if (type === "move_up") return `최대 ${formatKRW(calculateFuturePurchasePower(profile, currentHome, financialPlan, 5))}`;
    if (type === "additional_purchase") return `초기 ${formatKRW(scenario.initialCashNeeded)}`;
    return `5년 ${formatKRW(scenario.fiveYearExpectedReturn)}`;
  };
  const analyzeHome = async () => {
    setPublicData({ loading: true });
    try {
      const normalizeResponse = await fetch("/api/public-data/address/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addressDraft })
      });
      const normalized = await normalizeResponse.json();
      if (!normalizeResponse.ok) throw new Error(normalized.error ?? "주소 확인 실패");
      const lawdCode = normalized.lawdCode5 ?? "27260";
      const seedResponse = await fetch("/api/public-data/transactions/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawdCodes: [lawdCode],
          from: "202604",
          to: "202604",
          propertyTypes: ["apartment"],
          dealTypes: ["trade", "rent"],
          allowLarge: true
        })
      });
      await seedResponse.json();
      const valuationResponse = await fetch("/api/public-data/valuation/current-home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: addressDraft,
          complexName: complexNameDraft || undefined,
          areaM2: Number(areaM2Draft) || undefined,
          floor: Number(floorDraft) || undefined,
          propertyType: propertyTypeDraft
        })
      });
      const valuation = await valuationResponse.json();
      if (!valuationResponse.ok) throw new Error(valuation.error ?? "현재가 추정 실패");
      setPublicData({
        loading: false,
        normalized: { ...normalized, seededTransactions: valuation.transactionCount },
        valuation
      });
      if (valuation.snapshot?.estimatedPrice) {
        updateCurrentHome({ estimatedCurrentPrice: valuation.snapshot.estimatedPrice });
      }
    } catch (error) {
      setPublicData({ loading: false, error: error instanceof Error ? error.message : "내 집 분석 실패" });
    }
  };

  return (
    <AppShell
      title="내 집 기준점"
      subtitle="모든 후보는 지금 집을 팔거나 버틸 때 어디까지 갈 수 있는지를 기준으로 계산됩니다."
    >
      <div className="space-y-4">
        <EstimateNotice />

        <MoveUpLadderSummary profile={profile} currentHome={currentHome} financialPlan={financialPlan} compact />

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-base font-black text-ink">공공데이터 연결</h2>
          <p className="mt-1 text-xs leading-5 text-black/55">
            주소를 정규화하고, 실거래 comparable 기반 현재가 추정값을 가져옵니다.
          </p>
          <input
            className="mt-3 h-11 w-full rounded-md border border-black/10 px-3 text-sm font-bold outline-none focus:border-moss"
            value={addressDraft}
            onChange={(event) => setAddressDraft(event.target.value)}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              className="h-11 rounded-md border border-black/10 px-3 text-sm font-bold outline-none focus:border-moss"
              placeholder="단지명"
              value={complexNameDraft}
              onChange={(event) => setComplexNameDraft(event.target.value)}
            />
            <input
              className="h-11 rounded-md border border-black/10 px-3 text-sm font-bold outline-none focus:border-moss"
              placeholder="전용면적㎡"
              value={areaM2Draft}
              onChange={(event) => setAreaM2Draft(event.target.value)}
            />
            <input
              className="h-11 rounded-md border border-black/10 px-3 text-sm font-bold outline-none focus:border-moss"
              placeholder="층수"
              value={floorDraft}
              onChange={(event) => setFloorDraft(event.target.value)}
            />
            <select
              className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm font-bold outline-none focus:border-moss"
              value={propertyTypeDraft}
              onChange={(event) => setPropertyTypeDraft(event.target.value as typeof propertyTypeDraft)}
            >
              <option value="apartment">아파트</option>
              <option value="officetel">오피스텔</option>
              <option value="villa">빌라</option>
              <option value="house">단독/다가구</option>
              <option value="commercial">상가</option>
            </select>
          </div>
          <button className="mt-3 h-12 w-full rounded-md bg-ink text-sm font-black text-white" onClick={analyzeHome}>
            내 집 분석하기
          </button>
          <button
            className="mt-2 h-10 w-full rounded-md bg-black/5 text-xs font-black text-ink"
            onClick={() => setShowAdvancedPublicData((value) => !value)}
          >
            개발자용 세부 실행 {showAdvancedPublicData ? "닫기" : "열기"}
          </button>
          {showAdvancedPublicData ? <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              className="h-11 rounded-md bg-moss text-xs font-black text-white"
              onClick={async () => {
                setPublicData({ loading: true });
                try {
                  const response = await fetch("/api/public-data/address/normalize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ address: addressDraft })
                  });
                  const json = await response.json();
                  if (!response.ok) throw new Error(json.error ?? "주소 정규화 실패");
                  setPublicData({ loading: false, normalized: json });
                } catch (error) {
                  setPublicData({
                    loading: false,
                    error: error instanceof Error ? error.message : "주소 정규화 실패"
                  });
                }
              }}
            >
              주소 정규화
            </button>
            <button
              className="h-11 rounded-md bg-sky text-xs font-black text-white"
              onClick={async () => {
                setPublicData((state) => ({ ...state, loading: true, error: undefined }));
                try {
                  const response = await fetch("/api/public-data/transactions/seed", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      lawdCodes: ["27260"],
                      from: "202601",
                      to: "202604",
                      propertyTypes: ["apartment"],
                      dealTypes: ["trade", "rent"]
                    })
                  });
                  const json = await response.json();
                  if (!response.ok) throw new Error(json.error ?? "실거래 seed 실패");
                  setPublicData((state) => ({
                    ...state,
                    loading: false,
                    normalized: { ...(state.normalized ?? {}), seededTransactions: json.count }
                  }));
                } catch (error) {
                  setPublicData((state) => ({
                    ...state,
                    loading: false,
                    error: error instanceof Error ? error.message : "실거래 seed 실패"
                  }));
                }
              }}
            >
              실거래 수집
            </button>
            <button
              className="h-11 rounded-md bg-coral text-xs font-black text-white"
              onClick={async () => {
                setPublicData((state) => ({ ...state, loading: true, error: undefined }));
                try {
                  const response = await fetch("/api/public-data/valuation/current-home", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      address: addressDraft,
                      complexName: complexNameDraft || undefined,
                      areaM2: Number(areaM2Draft) || undefined,
                      floor: Number(floorDraft) || undefined,
                      propertyType: propertyTypeDraft
                    })
                  });
                  const json = await response.json();
                  if (!response.ok) throw new Error(json.error ?? "현재가 추정 실패");
                  setPublicData((state) => ({ ...state, loading: false, valuation: json }));
                  if (json.snapshot?.estimatedPrice) {
                    updateCurrentHome({ estimatedCurrentPrice: json.snapshot.estimatedPrice });
                  }
                } catch (error) {
                  setPublicData((state) => ({
                    ...state,
                    loading: false,
                    error: error instanceof Error ? error.message : "현재가 추정 실패"
                  }));
                }
              }}
            >
              현재가 추정
            </button>
          </div> : null}
          {publicData.loading ? <p className="mt-3 text-xs font-bold text-moss">조회 중...</p> : null}
          {publicData.error ? <p className="mt-3 text-xs font-bold text-coral">{publicData.error}</p> : null}
          {publicData.normalized ? (
            <div className="mt-3 rounded-md bg-black/5 p-3 text-xs leading-5 text-black/62">
              <p>PNU: {String(publicData.normalized.pnu ?? "-")}</p>
              <p>LAWD_CD: {String(publicData.normalized.lawdCode5 ?? "-")}</p>
              <p>법정동코드: {String(publicData.normalized.legalDongCode10 ?? "-")}</p>
              <p>주소 출처: {String(publicData.normalized.source ?? "-")}</p>
              {publicData.normalized.source === "mock" ? (
                <p className="font-black text-coral">실데이터 주소 정규화가 아니므로 검증 전 참고용입니다.</p>
              ) : null}
              {"seededTransactions" in publicData.normalized ? (
                <p>저장된 실거래: {String(publicData.normalized.seededTransactions)}건</p>
              ) : null}
            </div>
          ) : null}
          {publicData.valuation?.snapshot ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric label="주소 확인" value="완료" />
              <Metric label="추정 신뢰도" value={publicData.valuation.snapshot.estimatedPrice ? "72%" : "낮음"} />
              <Metric
                label="실거래 추정가"
                value={
                  publicData.valuation.snapshot.estimatedPrice
                    ? formatKRW(publicData.valuation.snapshot.estimatedPrice)
                    : "부족"
                }
              />
              <Metric
                label="전세가율"
                value={
                  publicData.valuation.snapshot.jeonseRatio
                    ? `${publicData.valuation.snapshot.jeonseRatio}%`
                    : "부족"
                }
              />
              <Metric
                label="전고점 대비"
                value={
                  publicData.valuation.snapshot.drawdownFromHigh !== null &&
                  publicData.valuation.snapshot.drawdownFromHigh !== undefined
                    ? `${publicData.valuation.snapshot.drawdownFromHigh}%`
                    : "부족"
                }
              />
              <Metric
                label="최근 거래"
                value={`${publicData.valuation.snapshot.recentTradeCount ?? 0}건`}
              />
            </div>
          ) : null}
          {publicData.valuation?.recentTrade?.length ? (
            <div className="mt-3 rounded-md bg-white text-xs">
              <p className="font-black text-ink">최근 매매 거래</p>
              {publicData.valuation.recentTrade.slice(0, 5).map((item, index) => (
                <p key={index} className="mt-1 text-black/58">
                  {String(item.complexName ?? item.buildingName ?? "-")} · {String(item.areaM2 ?? "-")}㎡ ·{" "}
                  {item.dealAmount ? formatKRW(Number(item.dealAmount)) : "-"}
                </p>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <div className="flex items-center gap-2">
            <Home size={18} className="text-moss" />
            <h2 className="text-base font-black text-ink">{currentHome.region} 내 집</h2>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="현재 추정가" value={formatKRW(currentHome.estimatedCurrentPrice)} />
            <Metric label="대출잔액" value={formatKRW(currentHome.loanBalance)} />
            <Metric
              label="매도 후 현금"
              value={formatKRW(calculateNetCashAfterSellingHome(currentHome))}
            />
            <Metric label="금리" value={`${currentHome.interestRate.toFixed(1)}%`} />
          </div>
        </section>

        <section className="relative h-[390px] overflow-hidden rounded-lg border border-black/10 bg-[#fdfbf7]">
          <div className="absolute left-1/2 top-1/2 z-10 w-36 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-ink p-4 text-center text-white shadow-soft">
            <p className="text-xs font-bold text-white/55">현재 집</p>
            <p className="mt-1 text-xl font-black">{currentHome.region}</p>
            <p className="mt-1 text-sm">{formatKRW(currentHome.estimatedCurrentPrice)}</p>
          </div>
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[1px] w-[82%] -translate-x-1/2 bg-black/10" />
            <div className="absolute left-1/2 top-1/2 h-[78%] w-[1px] -translate-y-1/2 bg-black/10" />
            <div className="absolute left-[16%] top-[17%] h-[1px] w-[72%] rotate-[33deg] bg-black/10" />
            <div className="absolute left-[14%] top-[76%] h-[1px] w-[74%] -rotate-[31deg] bg-black/10" />
          </div>
          {nodes.map((node) => (
            <button
              key={node.key}
              className={`absolute z-20 min-h-14 w-28 -translate-x-1/2 -translate-y-1/2 rounded-md border px-2 text-sm font-black shadow-sm transition ${
                active === node.key
                  ? "border-coral bg-coral text-white"
                  : "border-black/10 bg-white text-ink"
              }`}
              style={{ left: node.x, top: node.y }}
              onClick={() => setActive(node.key)}
            >
              <span>{node.label}</span>
              <span className="mt-1 block text-[10px] font-bold opacity-75">{badgeByScenario(node.key)}</span>
            </button>
          ))}
          <button
            className="absolute bottom-3 right-3 flex h-10 items-center gap-1 rounded-md bg-white px-3 text-xs font-black text-black/65"
            onClick={() =>
              updateCurrentHome({
                estimatedCurrentPrice: currentHome.estimatedCurrentPrice + 10_000_000
              })
            }
          >
            <Pencil size={14} />
            추정가 +1천
          </button>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-xs font-bold text-black/45">선택한 시나리오</p>
          <h2 className="mt-1 text-2xl font-black text-ink">{activeScenario.label}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="초기 현금 필요" value={formatKRW(activeScenario.initialCashNeeded)} />
            <Metric label="월 현금흐름" value={formatMonthly(activeScenario.monthlyCashFlow)} />
            <Metric label="세후 순자산" value={formatKRW(activeScenario.afterTaxNetWorth)} />
            <Metric label="목적 적합도" value={`${Math.round(activeScenario.fitScore)}점`} />
          </div>
          <ul className="mt-3 space-y-1 text-sm leading-5 text-black/60">
            {activeScenario.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <div className="mt-3 rounded-md bg-black/5 p-3 text-xs leading-5 text-black/60">
            다음 행동: 후보 카드 3개를 비교하고, 목표 집 도달 경로에서 저축/매도/전세/월세 루트를 확인하세요.
            리스크: 세금, 대출한도, 공실, 전세가 변동은 실제 조건과 다를 수 있습니다.
          </div>
        </section>
      </div>
    </AppShell>
  );
}
