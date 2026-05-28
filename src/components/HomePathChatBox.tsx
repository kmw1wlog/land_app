"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bot, Send, ShieldCheck, Sparkles } from "lucide-react";
import { properties } from "@/data/dummy";
import { analyzeUserState, goalUi } from "@/lib/userState";
import { formatKRW, formatMonthly } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  fallbackUsed?: boolean;
  sources?: Array<{ title?: string; sourceType: string; score: number; finalScore?: number; boostReason?: string[]; metadata?: Record<string, unknown> }>;
};

const CHAT_API_STORAGE_KEY = "homepath.chatApiUrl";

export function HomePathChatBox() {
  const profile = useAppStore((state) => state.profile);
  const currentHome = useAppStore((state) => state.currentHome);
  const financialPlan = useAppStore((state) => state.financialPlan);
  const activeCandidate = useAppStore((state) => state.activeCandidate);
  const portfolioItems = useAppStore((state) => state.portfolioItems);
  const userState = analyzeUserState(profile, currentHome, financialPlan);
  const ui = goalUi[profile.primaryGoal];
  const interestedHomes = portfolioItems.map((item) => {
    const property = properties.find((entry) => entry.id === item.propertyId);
    return {
      id: item.id,
      propertyId: item.propertyId,
      complexSignalId: item.complexSignalId,
      sourceType: item.sourceType,
      complexName: item.complexName ?? property?.name,
      name: property?.name,
      region: item.region ?? property?.region,
      lawdCode5: property?.lawdCode5,
      areaBucket: item.areaBucket,
      floorBand: item.floorBand,
      propertyType: property?.propertyType,
      referencePrice: item.referencePrice ?? item.virtualPurchasePrice ?? property?.salePrice,
      virtualPurchasePrice: item.virtualPurchasePrice,
      memo: item.memo,
      reason: item.reason
    };
  });
  const [input, setInput] = useState(activeCandidate ? `${activeCandidate.complexName} 왜 후보로 떴어?` : "");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        `홈패스 AI 설명봇입니다. ${ui.chatIntro} 공공데이터, Transformer 분석 결과, 내 조건을 함께 보고 참고용 설명을 드릴게요. 매수 추천이나 수익 보장은 하지 않습니다.`
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [chatApiUrl, setChatApiUrl] = useState("/api/chat");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setChatApiUrl(resolveChatApiUrl(params));
    const prompt = params.get("prompt")?.trim();
    if (prompt) setInput(prompt);
  }, []);

  async function ask(message: string) {
    const text = message.trim();
    if (!text || loading) return;
    setMessages((items) => [...items, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch(chatApiUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          profile,
          currentHome,
          financialPlan,
          activeCandidate,
          portfolioItems,
          interestedHomes
        })
      });
      const payload = await response.json();
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          content: payload.answer ?? "답변을 만들지 못했습니다. 데이터를 다시 색인한 뒤 시도해주세요.",
          fallbackUsed: payload.fallbackUsed,
          sources: payload.sources
        }
      ]);
    } catch {
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          content:
            "결론: 지금은 AI 설명 서버에 연결하지 못했습니다.\n\n주의점: 참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.\n\n다음 행동: RAG 색인 상태와 로컬 Qwen 실행 여부를 확인해주세요.",
          fallbackUsed: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-black/10 bg-white p-4">
        <p className="text-xs font-black text-black/45">AI가 먼저 확인하는 현재 상태</p>
        <p className="mt-1 text-base font-black text-ink">{userState.headline}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniState label="목표" value={userState.goalLabel} />
          <MiniState label="현재 주거" value={userState.housingLabel} />
          <MiniState label="월소득" value={formatMonthly(profile.monthlyIncome)} />
          <MiniState label="현금" value={formatKRW(profile.cashOnHand)} />
          <MiniState label="목표 지역" value={financialPlan.targetRegion} />
          <MiniState label="목표 가격" value={formatKRW(financialPlan.targetHomePrice)} />
        </div>
        <p className="mt-2 text-[11px] font-bold leading-5 text-black/45">
          이 값이 답변의 우선순위입니다. RAG에서 찾은 다른 후보는 현재 상태와 관심 주택을 설명하기 위한 비교 근거로만 사용합니다.
        </p>
      </div>

      {activeCandidate ? (
        <div className="rounded-lg border border-moss/20 bg-moss/10 p-4">
          <p className="flex items-center gap-2 text-xs font-black text-moss">
            <Sparkles size={15} />
            현재 후보 context
          </p>
          <p className="mt-2 text-lg font-black text-ink">{activeCandidate.complexName}</p>
          <p className="text-sm font-bold text-black/55">
            {activeCandidate.region} · {activeCandidate.areaBucket} · 거래 집중도 {formatOptionalNumber(activeCandidate.transactionHeat, 1, "배")}
          </p>
        </div>
      ) : null}

      {portfolioItems.length ? (
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-xs font-black text-black/45">관심 주택 context</p>
          <p className="mt-1 text-sm font-bold text-black/60">
            저장한 후보 {portfolioItems.length}개를 고정 근거로 넣고, 같은 예산대의 다른 후보를 RAG로 비교합니다.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-lg p-4 ${
              message.role === "assistant" ? "border border-black/10 bg-white" : "bg-ink text-white"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm font-bold leading-6">{message.content}</p>
            {message.fallbackUsed ? (
              <p className="mt-3 flex items-center gap-2 text-xs font-black text-coral">
                <ShieldCheck size={14} />
                로컬 Qwen 미응답으로 안전 fallback 답변을 사용했습니다.
              </p>
            ) : null}
            {message.sources?.length ? (
              <div className="mt-3 rounded-md bg-black/5 p-3 text-xs font-bold text-black/50">
                <p className="text-black/65">이번 답변 근거</p>
                <p className="mt-1 text-black/50">{summarizeSourceProviders(message.sources).join(" · ")}</p>
                <p className="mt-2">근거: {message.sources.slice(0, 3).map((source) => source.title ?? source.sourceType).join(" · ")}</p>
                <br />
                점수: {message.sources.slice(0, 3).map((source) => `${source.sourceType} ${(source.finalScore ?? source.score).toFixed(2)}`).join(" · ")}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {ui.suggestedQuestions.map((question) => (
          <button
            key={question}
            className="rounded-full bg-white px-3 py-2 text-xs font-black text-ink shadow-soft"
            onClick={() => void ask(question)}
            type="button"
          >
            {question}
          </button>
        ))}
      </div>

      <form className="sticky bottom-24 rounded-xl bg-paper p-2 shadow-soft" onSubmit={onSubmit}>
        <div className="flex gap-2">
          <input
            className="min-h-12 flex-1 rounded-lg border border-black/10 bg-white px-4 text-sm font-bold outline-none focus:border-moss"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="홈패스 AI에게 물어보기"
          />
          <button
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-moss text-white disabled:opacity-45"
            disabled={loading}
            type="submit"
            title="질문 보내기"
          >
            {loading ? <Bot size={18} className="animate-pulse" /> : <Send size={18} />}
          </button>
        </div>
      </form>
    </div>
  );
}

function MiniState({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/5 p-2">
      <p className="text-[10px] font-bold text-black/42">{label}</p>
      <p className="mt-1 text-xs font-black text-ink">{value}</p>
    </div>
  );
}

function formatOptionalNumber(value: unknown, digits: number, suffix: string) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : "미상";
}

function summarizeSourceProviders(sources: NonNullable<ChatMessage["sources"]>) {
  const labels = new Set<string>();
  for (const source of sources) {
    const fusionSourceType = typeof source.metadata?.fusionSourceType === "string" ? source.metadata.fusionSourceType : null;
    const sourceSuffix = fusionSourceType ? `(${fusionSourceType})` : "";
    if (source.sourceType === "complex_signal") labels.add("MOLIT 실거래");
    if (source.sourceType === "user_context") labels.add("내 상황/관심 후보");
    if (source.sourceType === "model_artifact") labels.add("Transformer AI signal");
    if (source.sourceType === "kreb_market_index") labels.add(`KREB 지역지수${sourceSuffix}`);
    if (source.sourceType === "hug_jeonse_risk") labels.add(`HUG 전세리스크${sourceSuffix}`);
    if (source.sourceType === "transport_accessibility") labels.add(`TRANSPORT 접근성${sourceSuffix}`);
    if (source.sourceType === "fusion_data") labels.add(`융합 안정성${sourceSuffix}`);
    if (source.sourceType === "safety_policy") labels.add("안전정책");
  }
  return labels.size ? Array.from(labels) : ["RAG 근거"];
}

function resolveChatApiUrl(params?: URLSearchParams) {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_HOMEPATH_CHAT_API_URL || "/api/chat";
  }

  const queryValue = (params ?? new URLSearchParams(window.location.search)).get("chatApi")?.trim();
  if (queryValue) {
    window.localStorage.setItem(CHAT_API_STORAGE_KEY, queryValue);
    return queryValue;
  }

  const storedValue = window.localStorage.getItem(CHAT_API_STORAGE_KEY)?.trim();
  return storedValue || process.env.NEXT_PUBLIC_HOMEPATH_CHAT_API_URL || "/api/chat";
}
