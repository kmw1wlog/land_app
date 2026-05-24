"use client";

import { BottomNav } from "./BottomNav";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function AppShell({ title, subtitle, children, action }: AppShellProps) {
  return (
    <main className="mx-auto min-h-screen max-w-[480px] bg-paper shadow-soft">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-paper/95 px-5 pb-3 pt-5 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-moss">홈패스</p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-ink">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm leading-5 text-black/58">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      </header>
      <section className="px-5 pb-28 pt-4">{children}</section>
      <BottomNav />
    </main>
  );
}
