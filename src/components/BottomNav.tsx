"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Home, House, MessageCircle, Route, Scale } from "lucide-react";

const tabs = [
  { href: "/feed", label: "홈", icon: Home },
  { href: "/my-home", label: "내 기준", icon: House },
  { href: "/goal-path", label: "경로", icon: Route },
  { href: "/portfolio", label: "관심", icon: Scale },
  { href: "/community", label: "커뮤니티", icon: MessageCircle },
  { href: "/chat", label: "AI", icon: Bot }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px] border-t border-black/10 bg-white/95 px-3 pb-[calc(0.55rem+var(--safe-bottom))] pt-2 backdrop-blur">
      <div className="grid grid-cols-6 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold transition ${
                active ? "bg-ink text-white" : "text-black/55 hover:bg-black/5"
              }`}
              title={tab.label}
            >
              <Icon size={18} aria-hidden />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
