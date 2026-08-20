"use client";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useEffect } from "react";
import { EnvironmentStatus, ProductionCapabilityBoundary } from "@/components/environment-status";
import { useNoraStore } from "@/lib/store";
export function MesShell({ children }: { children: React.ReactNode }) {
  const hydrateBackend = useNoraStore((state) => state.hydrateBackend);
  const mode = useNoraStore((state) => state.mode);
  useEffect(() => { void hydrateBackend(); }, [hydrateBackend]);
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <a
        href="#main-content"
        className="focus-ring sr-only fixed left-4 top-4 z-50 rounded-[var(--radius-control)] bg-white px-4 py-2 text-sm font-medium text-[#12213a] shadow-[var(--shadow-raised)] focus:not-sr-only"
      >
        跳到主要内容
      </a>
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-white/10 bg-[#12213a]/96 px-4 text-white shadow-[0_5px_20px_rgba(10,24,45,.12)] backdrop-blur-xl sm:h-[76px] sm:px-7">
        <div className="flex items-center gap-4">
          <Link
            href="/mes"
            className="focus-ring rounded-md text-2xl font-semibold tracking-[-0.055em]"
          >
            Nora
          </Link>
          <span className="hidden rounded-md bg-white/10 px-2.5 py-1 text-xs text-white/75 md:block">
            MES 工位执行
          </span>
          <span className="hidden sm:inline-flex"><EnvironmentStatus dark compact /></span>
        </div>
        <div className="flex items-center gap-4 text-sm sm:gap-5">
          <span className="flex items-center gap-2">
            <UserRound size={18} />
            {mode === "demo" ? "体验账号" : "未登录"}
          </span>
          <Link
            href="/"
            className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] bg-white/10 p-2.5 hover:bg-white/15"
            aria-label="退出工位"
          >
            <LogOut size={19} />
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto max-w-[1280px] p-4 pb-28 sm:p-6 lg:p-8"
      >
        <div className="mb-4 sm:hidden"><EnvironmentStatus compact /></div>
        <ProductionCapabilityBoundary supported={false}>{children}</ProductionCapabilityBoundary>
      </main>
    </div>
  );
}
