"use client";

import { BottomNav } from "./BottomNav";
import { analyzeUserState, goalUi } from "@/lib/userState";
import { useAppStore } from "@/store/useAppStore";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function AppShell({ title, subtitle, children, action }: AppShellProps) {
  const profile = useAppStore((state) => state.profile);
  const currentHome = useAppStore((state) => state.currentHome);
  const financialPlan = useAppStore((state) => state.financialPlan);
  const userState = analyzeUserState(profile, currentHome, financialPlan);
  const config = goalUi[profile.primaryGoal];

  return (
    <main className="mx-auto min-h-screen max-w-[480px] bg-paper shadow-soft">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-paper/95 px-5 pb-3 pt-5 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase text-moss">홈패스</p>
              <span className="rounded bg-moss/10 px-2 py-1 text-[10px] font-black text-moss">
                {config.headerBadge}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black leading-tight text-ink">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm leading-5 text-black/58">{subtitle}</p> : null}
            <p className="mt-1 text-[11px] font-bold leading-5 text-black/42">{userState.shortSummary}</p>
          </div>
          {action}
        </div>
      </header>
      <section className="px-5 pb-28 pt-4">{children}</section>
      <BottomNav />
    </main>
  );
}
