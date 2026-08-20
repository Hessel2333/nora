"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HelpTip({
  title,
  children,
  href,
  linkLabel = "查看完整说明",
  className,
}: {
  title: string;
  children: ReactNode;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={cn("relative inline-flex shrink-0", className)}>
      <button
        type="button"
        aria-label={`帮助：${title}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="focus-ring -my-2 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-[var(--text-tertiary)] hover:bg-black/5 hover:text-[var(--text-primary)] sm:-my-1 sm:h-8 sm:w-8"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[12px] font-semibold leading-none" aria-hidden="true">
          ?
        </span>
      </button>

      {open && (
        <span
          id={id}
          role="dialog"
          aria-label={title}
          className="absolute left-0 top-full z-40 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-[var(--radius-control)] border border-[var(--stroke)] bg-[var(--surface)] p-3.5 text-left shadow-[var(--shadow-raised)]"
        >
          <strong className="block text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </strong>
          <span className="mt-1.5 block text-xs leading-5 text-[var(--text-secondary)]">
            {children}
          </span>
          {href && (
            <Link
              href={href}
              className="focus-ring mt-2.5 inline-flex rounded-md text-xs font-medium text-[var(--interactive)] hover:underline"
            >
              {linkLabel}
            </Link>
          )}
        </span>
      )}
    </span>
  );
}
