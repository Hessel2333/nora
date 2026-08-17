import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <a
        href="#main-content"
        className="focus-ring sr-only fixed left-4 top-4 z-50 rounded-[var(--radius-control)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-raised)] focus:not-sr-only"
      >
        跳到主要内容
      </a>
      <header className="border-b border-[var(--stroke)] bg-[var(--surface)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link
            href="/portal/orders"
            className="text-xl font-semibold tracking-[-.05em]"
          >
            Nora{" "}
            <span className="ml-2 text-xs font-normal tracking-normal text-[var(--text-tertiary)]">
              客户门户
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden items-center gap-2 sm:flex">
              <UserRound size={17} />
              华润万家
            </span>
            <Link
              href="/"
              aria-label="退出门户"
              className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] p-2 hover:bg-[var(--surface-muted)]"
            >
              <LogOut size={18} />
            </Link>
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
