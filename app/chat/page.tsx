import { Bot } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HomePathChatBox } from "@/components/HomePathChatBox";

export default function ChatPage() {
  return (
    <AppShell
      title="홈패스 AI 설명봇"
      subtitle="공공데이터, Transformer 분석 결과, 내 조건을 바탕으로 구매력과 리스크를 설명합니다."
      action={
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-moss text-white">
          <Bot size={20} />
        </div>
      }
    >
      <HomePathChatBox />
    </AppShell>
  );
}
