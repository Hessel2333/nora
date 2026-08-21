"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ChevronDown,
  ClipboardCheck,
  Factory,
  FlaskConical,
  LayoutDashboard,
  Menu,
  PackageSearch,
  Route,
  ScanLine,
  Search,
  Settings2,
  ShoppingCart,
  Sparkles,
  UserRound,
  UsersRound,
  X,
  RotateCcw,
  Database,
  ClipboardList,
  CircleQuestionMark,
  Warehouse,
  LogOut,
  LogIn,
} from "lucide-react";
import { EnvironmentStatus, ProductionCapabilityBoundary } from "@/components/environment-status";
import { cn } from "@/lib/utils";
import { useNoraStore } from "@/lib/store";
import { isDevelopmentSupportedPath, isProductionSupportedPath } from "@/lib/production-capabilities";
import type { UserRole } from "@/lib/types";
import { useNoraIdentity } from "@/features/auth/nora-identity-provider";
import type { NoraPermission } from "@/lib/identity";

const roles: Array<{ value: UserRole; label: string; detail: string }> = [
  { value: "owner", label: "老板", detail: "全局经营与审批" },
  { value: "supervisor", label: "生产主管", detail: "计划、工单与异常" },
  { value: "worker", label: "工位员工", detail: "MES 任务执行" },
  { value: "customer", label: "客户", detail: "订单履约查询" },
];

interface NavigationItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission?: NoraPermission;
}

const navigation: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "今日工作",
    items: [
      { label: "运营工作台", href: "/", icon: LayoutDashboard },
      { label: "待审核订单", href: "/orders/approvals", icon: ClipboardCheck, permission: "orders:approve" },
    ],
  },
  {
    label: "订单与客户",
    items: [
      { label: "订单中心", href: "/orders", icon: ShoppingCart },
      { label: "客户中心", href: "/customers", icon: UsersRound },
    ],
  },
  {
    label: "计划与执行",
    items: [
      { label: "生产准备", href: "/production/plans", icon: Route },
      { label: "生产工单", href: "/production/work-orders", icon: ClipboardList },
      { label: "库存台账", href: "/inventory/stock", icon: Warehouse },
      { label: "MES 执行", href: "/mes", icon: ScanLine },
      { label: "工厂态势", href: "/digital-twin", icon: Factory },
    ],
  },
  {
    label: "主数据",
    items: [
      { label: "产品档案", href: "/catalog/products", icon: PackageSearch },
      { label: "生产配方", href: "/catalog/boms", icon: Boxes },
      { label: "基础档案", href: "/master-data/company", icon: Database },
    ],
  },
  {
    label: "分析",
    items: [{ label: "销售预测", href: "/ai/forecast", icon: Sparkles }],
  },
];

const commands: Array<[string, string, NoraPermission?]> = [
  ["创建销售订单", "/orders/new", "orders:write"],
  ["查看生产准备", "/production/plans"],
  ["查看库存台账", "/inventory/stock"],
  ["进入 MES 工位", "/mes"],
  ["配方爆炸图", "/production/bom-explosion"],
  ["订单物料拆解", "/production/material-explosion"],
  ["日期需求流向", "/production/demand-flow"],
  ["打开数字孪生", "/digital-twin"],
  ["维护生产 BOM", "/catalog/boms", "recipes:write"],
  ["客户中心", "/customers"],
  ["组织与产线", "/master-data/organization"],
  ["销售预测", "/ai/forecast"],
  ["打开帮助中心", "/help"],
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const mode = useNoraStore((state) => state.mode);
  const { can } = useNoraIdentity();
  const visibleNavigation = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => (
        (mode !== "production" || isProductionSupportedPath(item.href))
        && (!item.permission || can(item.permission))
      )),
    }))
    .filter((group) => group.items.length > 0);
  const activeHref = visibleNavigation
    .flatMap((group) => group.items)
    .filter((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <div className="flex h-full flex-col bg-[var(--surface)]">
      <div className="flex h-16 items-center border-b border-[var(--stroke-subtle)] px-5">
        <Link
          href="/"
          onClick={onNavigate}
          className="focus-ring rounded-md text-[22px] font-semibold tracking-[-0.055em] text-[var(--text-primary)]"
        >
          Nora
        </Link>
      </div>
      <nav
        aria-label="主导航"
        className="nora-scrollbar flex-1 overflow-y-auto px-3 py-3"
      >
        {visibleNavigation.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-3 pb-1.5 pt-2 text-[10px] font-medium tracking-[0.08em] text-[var(--text-tertiary)]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-ring flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-[13px] font-medium",
                      active
                        ? "bg-[var(--interactive-soft)] text-[var(--interactive)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    <Icon size={17} strokeWidth={active ? 2.1 : 1.8} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {mode !== "production" || isProductionSupportedPath("/master-data/access") ? (
        <div className="border-t border-[var(--stroke-subtle)] p-3">
          <Link
            href="/master-data/access"
            onClick={onNavigate}
            className="focus-ring flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          >
            <Settings2 size={17} />
            系统设置
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const { currentRole, setRole, resetDemo, mode, runtimeMode, demoPreview, setDemoPreview } = useNoraStore();
  const { identity, can, logout } = useNoraIdentity();
  const hydrateBackend = useNoraStore((state) => state.hydrateBackend);
  const current = roles.find((role) => role.value === currentRole) ?? roles[0];
  const isHelpCenter = pathname === "/help" || pathname.startsWith("/help/");
  const capabilitySupported = mode === "production"
    ? isProductionSupportedPath(pathname)
    : isDevelopmentSupportedPath(pathname);
  const filtered = useMemo(
    () => commands.filter(([label, href, permission]) =>
      label.includes(query.trim())
      && (mode !== "production" || isProductionSupportedPath(href))
      && (!permission || can(permission)),
    ),
    [can, mode, query],
  );

  useEffect(() => {
    if (!isHelpCenter) void hydrateBackend();
  }, [hydrateBackend, isHelpCenter]);

  const changeRole = (role: UserRole) => {
    setRole(role);
    if (role === "worker") router.push("/mes");
    if (role === "customer") router.push("/portal/orders");
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[224px] border-r border-[var(--stroke)] lg:block">
        <SidebarContent />
      </aside>

      <header className="glass-bar fixed left-0 right-0 top-0 z-30 h-16 border-b lg:left-[224px]">
        <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="focus-ring min-h-11 min-w-11 rounded-[var(--radius-control)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] lg:hidden"
              aria-label="打开导航"
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => setCommandOpen(true)}
              aria-label="搜索"
              className="focus-ring flex h-10 w-[min(52vw,390px)] items-center gap-2 rounded-[var(--radius-control)] border border-[var(--stroke)] bg-white/72 px-3 text-left text-sm text-[var(--text-tertiary)] shadow-[0_1px_2px_rgba(16,24,40,.03)] hover:bg-white max-sm:h-11"
            >
              <Search size={17} />
              <span className="truncate">搜索</span>
              <kbd className="ml-auto hidden rounded-md border border-[var(--stroke)] bg-white px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] sm:block">
                ⌘ K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {runtimeMode === "development" ? (
              <button
                type="button"
                aria-pressed={demoPreview}
                onClick={() => void setDemoPreview(!demoPreview)}
                className={cn(
                  "focus-ring hidden min-h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium sm:inline-flex",
                  demoPreview
                    ? "border-[var(--status-ai)] bg-[var(--status-ai-soft)] text-[var(--status-ai)]"
                    : "border-[var(--stroke)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
                )}
              >
                <FlaskConical size={14} />
                {demoPreview ? "退出演示" : "预览演示数据"}
              </button>
            ) : null}
            {!isHelpCenter ? <span className="hidden xl:inline-flex"><EnvironmentStatus compact /></span> : null}
            <Link
              href="/help"
              aria-label="打开帮助中心"
              aria-current={pathname.startsWith("/help") ? "page" : undefined}
              className={cn(
                "focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)]",
                pathname.startsWith("/help")
                  ? "bg-[var(--interactive-soft)] text-[var(--interactive)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
              )}
            >
              <CircleQuestionMark size={19} />
            </Link>
            {mode === "production" && !identity ? (
              <Link
                href="/orders"
                className="focus-ring ml-1 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm font-medium text-[var(--interactive)] hover:bg-[var(--interactive-soft)]"
              >
                <LogIn size={17} />
                <span className="hidden sm:inline">进入工作台</span>
              </Link>
            ) : <DropdownMenu.Root>
              <DropdownMenu.Trigger
                aria-label={mode === "production" ? `当前登录用户：${identity?.displayName ?? "未知"}，打开身份菜单` : `当前预览身份：${current.label}，打开身份菜单`}
                className="focus-ring ml-0.5 flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-1.5 py-1.5 hover:bg-[var(--surface-muted)] sm:ml-1 sm:px-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-[var(--interactive-soft)] text-[var(--interactive)]">
                  <UserRound size={17} />
                </span>
                <span className="hidden text-left md:block">
                  <span className="block text-xs font-medium text-[var(--text-primary)]">
                    {mode === "production" ? identity?.displayName ?? "已登录" : current.label}
                  </span>
                  <span className="block text-[10px] text-[var(--text-tertiary)]">
                    {mode === "demo" ? "体验账号" : mode === "production" ? identity?.username ?? "生产账号" : "开发账号"}
                  </span>
                </span>
                <ChevronDown
                  size={14}
                  className="hidden text-[var(--text-tertiary)] sm:block"
                />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 min-w-56 rounded-[var(--radius-card)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-raised)] outline-none ring-1 ring-black/8"
                >
                  {mode === "production" ? (
                    <>
                      <p className="px-2 py-1.5 text-[10px] font-medium tracking-[0.08em] text-[var(--text-tertiary)]">当前登录身份</p>
                      <div className="px-2.5 py-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{identity?.displayName}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{identity?.username}</p>
                        <p className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">{identity?.permissions.length ? `${identity.permissions.length} 项业务权限` : "当前为只读身份"}</p>
                      </div>
                      <DropdownMenu.Separator className="my-1 h-px bg-[var(--stroke-subtle)]" />
                      <DropdownMenu.Item
                        onSelect={() => void logout()}
                        className="focus-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2.5 py-2 text-xs text-[var(--text-secondary)] outline-none hover:bg-[var(--surface-muted)]"
                      >
                        <LogOut size={15} />退出登录
                      </DropdownMenu.Item>
                    </>
                  ) : (
                    <>
                      <p className="px-2 py-1.5 text-[10px] font-medium tracking-[0.08em] text-[var(--text-tertiary)]">切换身份</p>
                      {roles.map((role) => (
                    <DropdownMenu.Item
                      key={role.value}
                      onSelect={() => changeRole(role.value)}
                      className={cn(
                        "focus-ring flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-2 outline-none",
                        role.value === currentRole
                          ? "bg-[var(--interactive-soft)]"
                          : "hover:bg-[var(--surface-muted)]",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          role.value === currentRole
                            ? "bg-[var(--interactive)]"
                            : "bg-[var(--stroke)]",
                        )}
                      />
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">
                          {role.label}
                        </span>
                        <span className="block text-[11px] text-[var(--text-tertiary)]">
                          {role.detail}
                        </span>
                      </span>
                    </DropdownMenu.Item>
                      ))}
                      <DropdownMenu.Separator className="my-1 h-px bg-[var(--stroke-subtle)]" />
                      <DropdownMenu.Item
                        onSelect={resetDemo}
                        className="focus-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2.5 py-2 text-xs text-[var(--text-secondary)] outline-none hover:bg-[var(--surface-muted)]"
                      >
                        <RotateCcw size={15} />
                        {mode === "demo" ? "重置演示数据" : "重新同步数据"}
                      </DropdownMenu.Item>
                    </>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>}
          </div>
        </div>
      </header>

      <main id="main-content" className="min-h-screen pt-16 lg:pl-[224px]">
        <div className="mx-auto max-w-[1680px] p-4 sm:p-5 lg:p-6">
          {!isHelpCenter ? <div className="mb-4 xl:hidden"><EnvironmentStatus compact /></div> : null}
          {isHelpCenter ? (
            children
          ) : (
            <ProductionCapabilityBoundary supported={capabilitySupported}>
              {children}
            </ProductionCapabilityBoundary>
          )}
        </div>
      </main>

      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px] lg:hidden" />
          <Dialog.Content
            className="fixed inset-y-0 left-0 z-50 w-[min(82vw,300px)] border-r border-[var(--stroke)] bg-[var(--surface)] shadow-[var(--shadow-raised)] outline-none lg:hidden"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">主导航</Dialog.Title>
            <Dialog.Close
              className="focus-ring absolute right-3 top-2.5 z-10 min-h-11 min-w-11 rounded-[var(--radius-control)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
              aria-label="关闭导航"
            >
              <X size={18} />
            </Dialog.Close>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[3px]" />
          <Dialog.Content className="fixed left-1/2 top-[16%] z-50 w-[min(92vw,620px)] -translate-x-1/2 overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] shadow-[var(--shadow-raised)] outline-none ring-1 ring-black/8">
            <Dialog.Title className="sr-only">搜索功能</Dialog.Title>
            <div className="flex items-center gap-3 border-b border-[var(--stroke-subtle)] px-4">
              <Search size={19} className="text-[var(--text-tertiary)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索功能…"
                aria-label="搜索功能"
                className="h-14 flex-1 border-0 bg-transparent text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--control-placeholder)]"
              />
              <Dialog.Close
                className="focus-ring min-h-11 min-w-11 rounded-[var(--radius-control)] p-2 text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)]"
                aria-label="关闭搜索"
              >
                <X size={18} />
              </Dialog.Close>
            </div>
            <div className="max-h-[360px] overflow-auto p-2">
              {filtered.map(([label, href]) => (
                <button
                  key={href}
                  onClick={() => {
                    router.push(href);
                    setCommandOpen(false);
                    setQuery("");
                  }}
                  className="focus-ring flex min-h-11 w-full items-center rounded-[var(--radius-control)] px-3 py-3 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                >
                  <span>{label}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="py-10 text-center text-sm text-[var(--text-tertiary)]">
                  没有找到相关功能
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
