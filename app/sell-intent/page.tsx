"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EstimateNotice } from "@/components/EstimateNotice";
import { Metric } from "@/components/Metric";
import { formatKRW } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";

export default function SellIntentPage() {
  const currentHome = useAppStore((state) => state.currentHome);
  const [address, setAddress] = useState(currentHome.address);
  const [expectedPrice, setExpectedPrice] = useState(currentHome.estimatedCurrentPrice);
  const [message, setMessage] = useState("현재 집 매도 가능성과 갈아타기 상담을 받고 싶습니다.");
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <AppShell title="매도 의향 등록" subtitle="내 집을 공개 매물로 바로 올리지 않고, 검증 요청부터 시작합니다.">
      <div className="space-y-4">
        <EstimateNotice />
        <section className="rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-base font-black text-ink">공개 전 검증 요청</h2>
          <p className="mt-2 text-sm leading-6 text-black/58">
            매도 의향은 public listing이 아닙니다. 제휴 중개사 또는 직영팀이 소유자 의뢰와 표시광고 필수정보를 확인한 뒤 Listing으로 전환됩니다.
          </p>
          <input className="mt-3 h-11 w-full rounded-md border border-black/10 px-3 text-sm font-bold" value={address} onChange={(event) => setAddress(event.target.value)} />
          <input
            className="mt-2 h-11 w-full rounded-md border border-black/10 px-3 text-sm font-bold"
            inputMode="numeric"
            value={Math.round(expectedPrice / 10_000)}
            onChange={(event) => setExpectedPrice(Number(event.target.value || 0) * 10_000)}
          />
          <textarea className="mt-2 min-h-24 w-full rounded-md border border-black/10 p-3 text-sm" value={message} onChange={(event) => setMessage(event.target.value)} />
          <button
            className="mt-2 h-11 w-full rounded-md bg-moss text-sm font-black text-white"
            onClick={async () => {
              const response = await fetch("/api/seller-intents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  currentHomeId: currentHome.id,
                  address,
                  region: currentHome.region,
                  expectedPrice,
                  message
                })
              });
              const json = await response.json();
              setSaved(json.intent?.id ?? null);
            }}
          >
            검증 요청 등록
          </button>
        </section>
        <div className="grid grid-cols-2 gap-2">
          <Metric label="희망가" value={formatKRW(expectedPrice)} />
          <Metric label="공개 상태" value="비공개 검증" />
        </div>
        {saved ? <p className="rounded-md bg-moss/10 p-3 text-sm font-bold text-moss">등록 완료: {saved}</p> : null}
      </div>
    </AppShell>
  );
}
