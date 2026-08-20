"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import Link from "next/link";
import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  HTMLAttributes,
  RefObject,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/types";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "border-transparent bg-[var(--interactive)] text-white shadow-[0_1px_2px_rgba(8,73,144,.18)] hover:bg-[var(--interactive-hover)]",
    secondary:
      "border-[var(--stroke)] bg-[var(--surface)] text-[var(--text-primary)] shadow-[0_1px_2px_rgba(16,24,40,.03)] hover:bg-[var(--surface-muted)]",
    ghost:
      "border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
    danger:
      "border-transparent bg-[var(--status-danger)] text-white hover:bg-[var(--status-danger-hover)]",
    success:
      "border-transparent bg-[var(--status-success)] text-white hover:bg-[var(--status-success-hover)]",
  };
  const sizes: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-xs max-sm:h-11",
    md: "h-10 px-4 text-sm max-sm:h-11",
    lg: "h-12 px-5 text-base",
  };
  return cn(
    "focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] border font-medium disabled:opacity-45",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}>(function Button({ className, variant = "primary", size = "md", ...props }, ref) {
  return <button ref={ref} className={buttonClassName({ variant, size, className })} {...props} />;
});

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...props }, ref) {
    return <div ref={ref} className={cn("panel", className)} {...props} />;
  },
);

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  const tones: Record<StatusTone, string> = {
    neutral: "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
    info: "bg-[var(--interactive-soft)] text-[var(--interactive)]",
    success: "bg-[var(--status-success-soft)] text-[var(--status-success)]",
    warning: "bg-[var(--status-warning-soft)] text-[var(--status-warning)]",
    danger: "bg-[var(--status-danger-soft)] text-[var(--status-danger)]",
    purple: "bg-[var(--status-ai-soft)] text-[var(--status-ai)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Progress({
  value,
  tone = "info",
  className,
}: {
  value: number;
  tone?: StatusTone;
  className?: string;
}) {
  const colors: Record<StatusTone, string> = {
    neutral: "bg-[var(--text-tertiary)]",
    info: "bg-[var(--interactive)]",
    success: "bg-[var(--status-success)]",
    warning: "bg-[var(--status-warning)]",
    danger: "bg-[var(--status-danger)]",
    purple: "bg-[var(--status-ai)]",
  };
  return (
    <div
      className={cn(
        "h-1.5 overflow-hidden rounded-full bg-[var(--progress-track)]",
        className,
      )}
      role="progressbar"
      aria-label={`完成度 ${value}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, Math.max(0, value))}
    >
      <div
        className={cn("h-full rounded-full transition-all", colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function IconBox({
  icon: Icon,
  tone = "info",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: StatusTone;
  size?: "sm" | "md" | "lg";
}) {
  const colors: Record<StatusTone, string> = {
    neutral: "bg-[var(--surface-muted)] text-[var(--text-tertiary)]",
    info: "bg-[var(--interactive-soft)] text-[var(--interactive)]",
    success: "bg-[var(--status-success-soft)] text-[var(--status-success)]",
    warning: "bg-[var(--status-warning-soft)] text-[var(--status-warning)]",
    danger: "bg-[var(--status-danger-soft)] text-[var(--status-danger)]",
    purple: "bg-[var(--status-ai-soft)] text-[var(--status-ai)]",
  };
  const sizes = {
    sm: "h-8 w-8 [&_svg]:size-4",
    md: "h-10 w-10 [&_svg]:size-5",
    lg: "h-12 w-12 [&_svg]:size-6",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl",
        colors[tone],
        sizes[size],
      )}
    >
      <Icon strokeWidth={1.9} />
    </span>
  );
}

export function MetricCard({
  label,
  value,
  suffix,
  icon,
  tone = "info",
  change,
  compact = false,
  className,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: LucideIcon;
  tone?: StatusTone;
  change?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex items-center",
        compact ? "min-h-[100px] gap-3 p-3" : "min-h-[112px] gap-3.5 p-4",
        className,
      )}
    >
      <IconBox icon={icon} tone={tone} size={compact ? "md" : "lg"} />
      <div className="min-w-0">
        <p className="mb-1 text-xs font-medium text-[var(--text-tertiary)]">
          {label}
        </p>
        <div className="flex items-end gap-1 tabular-nums">
          <strong
            className={cn(
              "truncate font-semibold leading-none tracking-[-0.035em] text-[var(--text-primary)]",
              compact ? "text-[21px]" : "text-[24px]",
            )}
          >
            {value}
          </strong>
          {suffix && (
            <span className="shrink-0 text-[11px] text-[var(--text-tertiary)]">
              {suffix}
            </span>
          )}
        </div>
        {change && (
          <p
            className={cn(
              "mt-2 truncate text-xs",
              tone === "danger"
                ? "text-[var(--status-danger)]"
                : "text-[var(--status-success)]",
            )}
          >
            {change}
          </p>
        )}
      </div>
    </Card>
  );
}

export function PageHeader({
  title,
  metadata,
  actions,
  children,
}: {
  title: string;
  metadata?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-balance text-[26px] font-semibold leading-tight tracking-[-0.04em] text-[var(--text-primary)] sm:text-[28px]">
          {title}
        </h1>
        {metadata && (
          <div className="mt-1.5 text-sm text-[var(--text-tertiary)]">
            {metadata}
          </div>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

export function DetailHeader({
  navigation,
  title,
  status,
  metadata,
  actions,
}: {
  navigation?: ReactNode;
  title: string;
  status?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5">
      {navigation && <div className="mb-3">{navigation}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-[26px] font-semibold leading-tight tracking-[-0.04em] text-[var(--text-primary)] sm:text-[30px]">
              {title}
            </h1>
            {status}
          </div>
          {metadata && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-tertiary)]">
              {metadata}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--stroke-subtle)] px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "xl";
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px]" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            if (!returnFocusRef?.current) return;
            event.preventDefault();
            returnFocusRef.current.focus();
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-auto overscroll-contain rounded-[var(--radius-card)] bg-[var(--surface)] shadow-[var(--shadow-raised)] outline-none ring-1 ring-black/8",
            size === "xl" ? "w-[min(96vw,1040px)]" : "w-[min(92vw,560px)]",
          )}
        >
          <div className="flex items-start justify-between border-b border-[var(--stroke-subtle)] px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-[var(--text-primary)]">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-[var(--text-tertiary)]">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="focus-ring min-h-11 min-w-11 rounded-[var(--radius-control)] p-2 text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] sm:min-h-0 sm:min-w-0"
              aria-label="关闭"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="p-5">{children}</div>
          {footer && (
            <div className="flex justify-end gap-2 border-t border-[var(--stroke-subtle)] px-5 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
        {label}
        {required && (
          <span className="ml-1 text-[var(--status-danger)]">*</span>
        )}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] text-[var(--text-tertiary)]">
          {hint}
        </span>
      )}
    </label>
  );
}

export const inputClass =
  "focus-ring h-11 w-full rounded-[var(--radius-control)] border border-[var(--stroke)] bg-[var(--surface)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--control-placeholder)] hover:border-[#c7ced8] disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-tertiary)] sm:h-10 sm:text-sm";
