"use client";

import { FormEvent, useState } from "react";
import { Bot, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  fallbackUsed?: boolean;
  sources?: Array<{ title?: string; sourceType: string; score: number }>;
};

const SUGGESTED_QUESTIONS = [
  "내 월급으로 어디까지 가능해?",
  "왜 이 후보가 떴어?",
  "같은 예산이면 어디가 더 안전해?",
  "이 결과는 매수 추천이야?",
  "데이터 출처는 뭐야?"
];

export function HomePathChatBox() {
  const profile = useAppStore((state) => state.profile);
  const currentHome = useAppStore((state) => state.currentHome);
  const financialPlan = useAppStore((state) => state.financialPlan);
  const activeCandidate = useAppStore((state) => state.activeCandidate);
  const [input, setInput] = useState(activeCandidate ? `${activeCandidate.complexName} 왜 후보로 떴어?` : "");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "홈패스 AI 설명봇입니다. 공공데이터, Transformer 분석 결과, 내 조건을 함께 보고 참고용 설명을 드릴게요. 매수 추천이나 수익 보장은 하지 않습니다."
    }
  ]);
  const [loading, setLoading] = useState(false);

  async function ask(message: string) {
    const text = message.trim();
    if (!text || loading) return;
    setMessages((items) => [...items, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          profile,
          currentHome,
          financialPlan,
          activeCandidate
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
      {activeCandidate ? (
        <div className="rounded-lg border border-moss/20 bg-moss/10 p-4">
          <p className="flex items-center gap-2 text-xs font-black text-moss">
            <Sparkles size={15} />
            현재 후보 context
          </p>
          <p className="mt-2 text-lg font-black text-ink">{activeCandidate.complexName}</p>
          <p className="text-sm font-bold text-black/55">
            {activeCandidate.region} · {activeCandidate.areaBucket} · 거래 집중도 {activeCandidate.transactionHeat.toFixed(1)}배
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
                근거: {message.sources.slice(0, 3).map((source) => source.title ?? source.sourceType).join(" · ")}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((question) => (
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
