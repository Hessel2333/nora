import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

export function PortalShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f6f8fb]">
    <header className="border-b border-[#e2e7ee] bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/portal/orders" className="text-xl font-semibold tracking-[-.05em]">Nora <span className="ml-2 text-xs font-normal tracking-normal text-[#7b879b]">客户门户</span></Link>
        <div className="flex items-center gap-4 text-sm"><span className="hidden items-center gap-2 sm:flex"><UserRound size={17} />华润万家</span><Link href="/" aria-label="退出门户" className="rounded-lg p-2 hover:bg-[#f2f5f8]"><LogOut size={18} /></Link></div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
  </div>;
}
