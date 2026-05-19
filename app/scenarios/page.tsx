"use client";

import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/AppShell";
import { EstimateNotice } from "@/components/EstimateNotice";
import { properties } from "@/data/dummy";
import { calculateScenarioResults } from "@/lib/calculations";
import { formatKRW, formatMonthly } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";

export default function ScenariosPage() {
  const profile = useAppStore((state) => state.profile);
  const currentHome = useAppStore((state) => state.currentHome);
  const activePropertyId = useAppStore((state) => state.activePropertyId);
  const target = properties.find((property) => property.id === activePropertyId) ?? properties[0];
  const rows = useMemo(
    () => calculateScenarioResults(profile, currentHome, target),
    [profile, currentHome, target]
  );
  const chartData = rows.map((row) => ({
    name: row.label.replace(" ", "\n"),
    value: Math.round(row.fitScore)
  }));

  return (
    <AppShell title="시나리오 비교" subtitle={`${target.name} 기준으로 주요 선택지를 숫자로 비교합니다.`}>
      <div className="space-y-4">
        <EstimateNotice />

        <section className="h-56 rounded-lg border border-black/10 bg-white p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
              <YAxis hide domain={[0, 100]} />
              <Bar dataKey="value" fill="#2f5d50" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="overflow-x-auto rounded-lg border border-black/10 bg-white">
          <table className="min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-ink text-white">
              <tr>
                <th className="p-3">항목</th>
                {rows.map((row) => (
                  <th key={row.scenarioType} className="p-3">
                    {row.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              <CompareRow label="초기 현금 필요" values={rows.map((row) => formatKRW(row.initialCashNeeded))} />
              <CompareRow label="월 현금흐름" values={rows.map((row) => formatMonthly(row.monthlyCashFlow))} />
              <CompareRow label="대출 부담" values={rows.map((row) => formatKRW(row.debtBurden))} />
              <CompareRow label="세후 순자산" values={rows.map((row) => formatKRW(row.afterTaxNetWorth))} />
              <CompareRow label="5년 예상 수익" values={rows.map((row) => formatKRW(row.fiveYearExpectedReturn))} />
              <CompareRow label="리스크" values={rows.map((row) => row.risk)} />
              <CompareRow label="목적 적합도" values={rows.map((row) => `${Math.round(row.fitScore)}점`)} />
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <th className="sticky left-0 bg-white p-3 font-black text-ink">{label}</th>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className="p-3 font-bold text-black/65">
          {value}
        </td>
      ))}
    </tr>
  );
}
