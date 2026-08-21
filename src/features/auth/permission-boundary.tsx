"use client";

import { ArrowLeft, ShieldAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import type { NoraPermission } from "@/lib/identity";
import { useNoraIdentity } from "./nora-identity-provider";

export function PermissionBoundary({
  permission,
  title = "没有操作权限",
  detail,
  returnHref = "/orders",
  returnLabel = "返回订单中心",
  children,
}: {
  permission: NoraPermission;
  title?: string;
  detail: string;
  returnHref?: string;
  returnLabel?: string;
  children: React.ReactNode;
}) {
  const { can } = useNoraIdentity();

  if (can(permission)) return children;

  return (
    <section
      className="panel mx-auto mt-8 max-w-2xl px-6 py-12 text-center sm:px-10"
      aria-live="polite"
    >
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--status-warning-soft)] text-[var(--status-warning)]">
        <ShieldAlert size={22} aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
        {detail}
      </p>
      <div className="mt-6 flex justify-center">
        <ButtonLink href={returnHref} variant="secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          {returnLabel}
        </ButtonLink>
      </div>
    </section>
  );
}
