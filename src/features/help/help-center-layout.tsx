"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { BookOpenText, ChevronRight, List, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { HelpNavigationSection } from "./help-documents";
import type { HelpHeading } from "./markdown";

function DocumentNavigation({
  sections,
  currentSlug,
  mobile = false,
}: {
  sections: HelpNavigationSection[];
  currentSlug: string;
  mobile?: boolean;
}) {
  return (
    <nav aria-label="帮助文档目录" className="space-y-5">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.08em] text-[var(--text-tertiary)]">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.documents.map((document) => {
              const active = document.slug === currentSlug;
              const link = (
                <Link
                  href={document.slug ? `/help/${document.slug}` : "/help"}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring flex min-h-11 items-center justify-between gap-2 rounded-[var(--radius-control)] px-3 py-2 text-[13px] font-medium",
                    active
                      ? "bg-[var(--interactive-soft)] text-[var(--interactive)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
                  )}
                >
                  <span>{document.title}</span>
                  {active && <ChevronRight size={14} aria-hidden="true" />}
                </Link>
              );
              return mobile ? <Dialog.Close asChild key={document.slug || "index"}>{link}</Dialog.Close> : <span key={document.slug || "index"}>{link}</span>;
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function HelpCenterLayout({
  sections,
  currentSlug,
  currentTitle,
  headings,
  children,
}: {
  sections: HelpNavigationSection[];
  currentSlug: string;
  currentTitle: string;
  headings: HelpHeading[];
  children: ReactNode;
}) {
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [activeHeading, setActiveHeading] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    const scroller = document.getElementById("help-article-scroll");
    if (scroller) scroller.scrollTop = 0;
    setActiveHeading(headings[0]?.id ?? "");
  }, [currentSlug, headings]);

  useEffect(() => {
    const scroller = document.getElementById("help-article-scroll");
    if (!scroller || headings.length === 0) return;
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveHeading(visible.target.id);
      },
      { root: scroller, rootMargin: "-12% 0px -72%", threshold: [0, 1] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [currentSlug, headings]);

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--stroke)] bg-[var(--surface)] xl:h-[calc(100dvh-7rem)]">
      <div className="flex min-h-14 items-center justify-between border-b border-[var(--stroke-subtle)] px-3 xl:hidden">
        <button
          type="button"
          onClick={() => setDirectoryOpen(true)}
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
        >
          <List size={17} />
          文档目录
        </button>
        <span className="truncate px-2 text-xs text-[var(--text-tertiary)]">{currentTitle}</span>
      </div>

      <div className="xl:grid xl:h-full xl:min-h-0 xl:grid-cols-[224px_minmax(0,1fr)_200px]">
        <aside className="hidden border-r border-[var(--stroke-subtle)] xl:flex xl:min-h-0 xl:flex-col">
          <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--stroke-subtle)] px-5">
            <BookOpenText size={18} className="text-[var(--interactive)]" />
            <span className="font-semibold text-[var(--text-primary)]">帮助中心</span>
          </div>
          <div className="flex-1 overflow-hidden px-3 py-4">
            <DocumentNavigation sections={sections} currentSlug={currentSlug} />
          </div>
        </aside>

        <div id="help-article-scroll" className="nora-scrollbar min-w-0 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:scroll-smooth">
          {children}
        </div>

        <aside className="hidden border-l border-[var(--stroke-subtle)] px-5 py-6 xl:block">
          <p className="mb-3 text-xs font-semibold text-[var(--text-primary)]">本文内容</p>
          {headings.length ? (
            <nav aria-label="本文内容" className="space-y-1">
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  onClick={() => setActiveHeading(heading.id)}
                  className={cn(
                    "focus-ring block rounded-md py-1.5 text-xs leading-5 hover:text-[var(--text-primary)]",
                    heading.level === 3 ? "pl-3" : "font-medium",
                    activeHeading === heading.id ? "text-[var(--interactive)]" : "text-[var(--text-tertiary)]",
                  )}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          ) : (
            <p className="text-xs leading-5 text-[var(--text-tertiary)]">本页没有分节。</p>
          )}
        </aside>
      </div>

      <Dialog.Root open={directoryOpen} onOpenChange={setDirectoryOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px] xl:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-[var(--stroke)] bg-[var(--surface)] shadow-[var(--shadow-raised)] outline-none xl:hidden" aria-describedby={undefined}>
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--stroke-subtle)] px-4">
              <Dialog.Title className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <BookOpenText size={18} className="text-[var(--interactive)]" />
                帮助中心
              </Dialog.Title>
              <Dialog.Close className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)]" aria-label="关闭文档目录">
                <X size={18} />
              </Dialog.Close>
            </div>
            <div className="nora-scrollbar flex-1 overflow-y-auto px-3 py-4">
              <DocumentNavigation sections={sections} currentSlug={currentSlug} mobile />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
