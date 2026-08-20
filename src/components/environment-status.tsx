"use client";

import { AlertTriangle, CircleCheck, FlaskConical } from "lucide-react";
import { useNoraStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function EnvironmentStatus({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const { mode, runtimeMode, demoPreview, backendStatus } = useNoraStore();
  const isReady = backendStatus === "ready";
  const Icon = mode === "demo" ? FlaskConical : isReady ? CircleCheck : AlertTriangle;
  const label = mode === "demo"
    ? demoPreview ? "演示数据" : "演示模式"
    : mode === "production"
      ? isReady ? "生产服务已连接" : "生产服务不可用"
      : isReady ? "开发服务已连接" : "开发服务不可用";

  return (
    <span
      role={runtimeMode !== "demo" && !demoPreview && !isReady ? "status" : undefined}
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium",
        dark
          ? "border-white/15 bg-white/10 text-white/80"
          : mode !== "demo" && !isReady
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-[var(--stroke)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
        compact && "max-w-[190px] truncate",
      )}
    >
      <Icon size={13} aria-hidden="true" />
      <span className={compact ? "truncate" : undefined}>{label}</span>
    </span>
  );
}

export function ProductionCapabilityBoundary({
  children,
  supported,
}: {
  children: React.ReactNode;
  supported: boolean;
}) {
  const { mode, backendStatus } = useNoraStore();
  if (mode === "demo") return children;
  if (!supported) {
    return (
      <CapabilityPanel
        title="此功能暂未开放"
        detail="请联系管理员了解可用范围。"
      />
    );
  }
  if (backendStatus === "loading" || backendStatus === "idle") {
    return <CapabilityPanel title="正在连接服务" detail="连接完成后即可继续。" />;
  }
  if (backendStatus !== "ready") {
    return (
      <CapabilityPanel
        title={mode === "production" ? "生产服务暂不可用" : "开发服务暂不可用"}
        detail="暂时无法连接服务，请稍后重试。"
      />
    );
  }
  return children;
}

function CapabilityPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="mx-auto mt-10 max-w-2xl rounded-[var(--radius-card)] border border-[var(--stroke)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
        <AlertTriangle size={19} />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
    </section>
  );
}
