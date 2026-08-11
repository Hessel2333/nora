"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/types";

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "success"; size?: "sm" | "md" | "lg" }) {
  const variants = {
    primary: "bg-[#1768f2] text-white border-[#1768f2] hover:bg-[#0f57d4]",
    secondary: "bg-white text-[#263557] border-[#dce3ed] hover:bg-[#f6f8fb]",
    ghost: "bg-transparent text-[#52607a] border-transparent hover:bg-[#f0f4f9]",
    danger: "bg-[#ef4444] text-white border-[#ef4444] hover:bg-[#d93636]",
    success: "bg-[#08a879] text-white border-[#08a879] hover:bg-[#078a64]",
  };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-base" };
  return <button className={cn("focus-ring inline-flex items-center justify-center gap-2 rounded-[9px] border font-medium transition disabled:cursor-not-allowed disabled:opacity-45", variants[variant], sizes[size], className)} {...props} />;
}

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card({ className, ...props }, ref) {
  return <div ref={ref} className={cn("panel", className)} {...props} />;
});

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: StatusTone; className?: string }) {
  const tones: Record<StatusTone, string> = {
    neutral: "bg-[#f0f3f7] text-[#68758d]",
    info: "bg-[#eaf2ff] text-[#1768f2]",
    success: "bg-[#e7f8f2] text-[#078663]",
    warning: "bg-[#fff4df] text-[#c77800]",
    danger: "bg-[#ffebeb] text-[#dc3c3c]",
    purple: "bg-[#efedff] text-[#6554dd]",
  };
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", tones[tone], className)}>{children}</span>;
}

export function Progress({ value, tone = "info", className }: { value: number; tone?: StatusTone; className?: string }) {
  const colors: Record<StatusTone, string> = { neutral: "bg-[#8c98ad]", info: "bg-[#1768f2]", success: "bg-[#08a879]", warning: "bg-[#f59e0b]", danger: "bg-[#ef4444]", purple: "bg-[#6858e8]" };
  return <div className={cn("h-1.5 overflow-hidden rounded-full bg-[#e9edf3]", className)} aria-label={`完成度 ${value}%`}><div className={cn("h-full rounded-full transition-all", colors[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function IconBox({ icon: Icon, tone = "info", size = "md" }: { icon: LucideIcon; tone?: StatusTone; size?: "sm" | "md" | "lg" }) {
  const colors: Record<StatusTone, string> = { neutral: "bg-[#eef1f5] text-[#66738a]", info: "bg-[#eaf2ff] text-[#1768f2]", success: "bg-[#e7f8f2] text-[#08a879]", warning: "bg-[#fff2db] text-[#ef9500]", danger: "bg-[#ffebeb] text-[#ef4444]", purple: "bg-[#efedff] text-[#6858e8]" };
  const sizes = { sm: "h-8 w-8 [&_svg]:size-4", md: "h-10 w-10 [&_svg]:size-5", lg: "h-12 w-12 [&_svg]:size-6" };
  return <span className={cn("inline-flex shrink-0 items-center justify-center rounded-xl", colors[tone], sizes[size])}><Icon strokeWidth={1.9} /></span>;
}

export function MetricCard({ label, value, suffix, icon, tone = "info", change, className }: { label: string; value: string; suffix?: string; icon: LucideIcon; tone?: StatusTone; change?: string; className?: string }) {
  return <Card className={cn("flex min-h-[116px] items-center gap-4 p-4", className)}><IconBox icon={icon} tone={tone} size="lg" /><div className="min-w-0"><p className="mb-1 text-xs font-medium text-[#68758d]">{label}</p><div className="flex items-end gap-1"><strong className="text-[24px] leading-none tracking-[-0.03em] text-[#111c3b]">{value}</strong>{suffix && <span className="text-xs text-[#68758d]">{suffix}</span>}</div>{change && <p className={cn("mt-2 text-xs", tone === "danger" ? "text-[#ef4444]" : "text-[#079b71]")}>{change}</p>}</div></Card>;
}

export function PageHeader({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-[26px] font-semibold tracking-[-0.035em] text-[#111c3b]">{title}</h1>{description && <p className="mt-1 text-sm text-[#74809a]">{description}</p>}{children}</div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</div>;
}

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="flex items-center justify-between gap-3 border-b border-[#e9edf3] px-4 py-3"><div><h2 className="text-sm font-semibold text-[#182342]">{title}</h2>{description && <p className="mt-0.5 text-xs text-[#7b879d]">{description}</p>}</div>{action}</div>;
}

export function Modal({ open, onOpenChange, title, description, children, footer }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-[#0d1833]/35 backdrop-blur-[2px]" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-[#dfe5ee] bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-[#e8edf4] px-5 py-4"><div><Dialog.Title className="text-lg font-semibold text-[#17213d]">{title}</Dialog.Title>{description && <Dialog.Description className="mt-1 text-sm text-[#74809a]">{description}</Dialog.Description>}</div><Dialog.Close className="focus-ring rounded-lg p-2 text-[#74809a] hover:bg-[#f2f5f9]" aria-label="关闭"><X size={18} /></Dialog.Close></div><div className="p-5">{children}</div>{footer && <div className="flex justify-end gap-2 border-t border-[#e8edf4] px-5 py-4">{footer}</div>}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-[#384866]">{label}{required && <span className="ml-1 text-[#ef4444]">*</span>}</span>{children}{hint && <span className="mt-1 block text-[11px] text-[#8894a8]">{hint}</span>}</label>;
}

export const inputClass = "focus-ring h-10 w-full rounded-[9px] border border-[#dce3ed] bg-white px-3 text-sm text-[#243250] placeholder:text-[#a0aabd] hover:border-[#c6d0df]";
