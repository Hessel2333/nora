import Link from "next/link";
import path from "node:path";
import type { ReactNode } from "react";
import type { MarkdownBlock, ParsedMarkdownDocument } from "./markdown";

function helpHref(currentSlug: string, href: string) {
  if (!href || href.startsWith("#") || /^(?:https?:|mailto:|tel:)/u.test(href)) return href;
  const [target, hash = ""] = href.split("#", 2);
  if (!target.endsWith(".md")) return href;

  const currentDirectory = currentSlug ? path.posix.dirname(`/${currentSlug}`) : "/";
  let resolved = path.posix.resolve(currentDirectory, target).replace(/^\//u, "").replace(/\.md$/u, "");
  if (resolved === "index" || resolved.endsWith("/index")) resolved = resolved.replace(/(?:^|\/)index$/u, "");
  return `/help${resolved ? `/${resolved}` : ""}${hash ? `#${hash}` : ""}`;
}

function InlineText({ text, currentSlug }: { text: string; currentSlug: string }) {
  const tokens = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/gu);
  return tokens.map((token, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/u.exec(token);
    if (link) {
      const href = helpHref(currentSlug, link[2]);
      const external = /^https?:/u.test(href);
      return (
        <Link
          key={`${token}-${index}`}
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="focus-ring rounded-sm font-medium text-[var(--interactive)] underline decoration-[#a8cfff] underline-offset-4 hover:decoration-[var(--interactive)]"
        >
          {link[1]}
        </Link>
      );
    }
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={`${token}-${index}`} className="font-semibold text-[var(--text-primary)]">{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return <code key={`${token}-${index}`} className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[.9em] text-[var(--text-primary)]">{token.slice(1, -1)}</code>;
    }
    return token;
  });
}

function ListItems({ items, currentSlug }: { items: string[]; currentSlug: string }) {
  return items.map((item, index) => (
    <li key={`${item}-${index}`}>
      <InlineText text={item} currentSlug={currentSlug} />
    </li>
  ));
}

function MarkdownBlockView({ block, currentSlug }: { block: MarkdownBlock; currentSlug: string }): ReactNode {
  if (block.type === "heading") {
    const content = <InlineText text={block.text} currentSlug={currentSlug} />;
    if (block.level === 1) return <h1 id={block.id} className="text-balance text-[30px] font-semibold leading-tight tracking-[-0.045em] text-[var(--text-primary)] sm:text-[36px]">{content}</h1>;
    if (block.level === 2) return <h2 id={block.id} className="scroll-mt-6 border-t border-[var(--stroke-subtle)] pt-9 text-[22px] font-semibold tracking-[-0.025em] text-[var(--text-primary)] first:border-0 first:pt-0">{content}</h2>;
    if (block.level === 3) return <h3 id={block.id} className="scroll-mt-6 text-[17px] font-semibold text-[var(--text-primary)]">{content}</h3>;
    return <h4 id={block.id} className="scroll-mt-6 text-sm font-semibold text-[var(--text-primary)]">{content}</h4>;
  }
  if (block.type === "paragraph") return <p className="text-[15px] leading-7 text-[var(--text-secondary)]"><InlineText text={block.text} currentSlug={currentSlug} /></p>;
  if (block.type === "unordered-list") return <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-[var(--text-secondary)] marker:text-[var(--interactive)]"><ListItems items={block.items} currentSlug={currentSlug} /></ul>;
  if (block.type === "ordered-list") return <ol className="list-decimal space-y-3 pl-5 text-[15px] leading-7 text-[var(--text-secondary)] marker:font-semibold marker:text-[var(--interactive)]"><ListItems items={block.items} currentSlug={currentSlug} /></ol>;
  if (block.type === "blockquote") return <blockquote className="rounded-r-[var(--radius-control)] border-l-2 border-[var(--interactive)] bg-[var(--interactive-soft)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]"><InlineText text={block.text} currentSlug={currentSlug} /></blockquote>;
  if (block.type === "code") return <pre className="nora-scrollbar overflow-x-auto rounded-[var(--radius-control)] bg-[#101828] p-4 text-[13px] leading-6 text-[#e6edf7]"><code data-language={block.language || undefined}>{block.code}</code></pre>;
  if (block.type === "table") return (
    <div className="nora-scrollbar overflow-x-auto rounded-[var(--radius-control)] border border-[var(--stroke)]">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead className="bg-[var(--surface-muted)] text-[var(--text-secondary)]">
          <tr>{block.headers.map((header) => <th key={header} className="border-b border-[var(--stroke)] px-4 py-3 font-semibold"><InlineText text={header} currentSlug={currentSlug} /></th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[var(--stroke-subtle)]">
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{block.headers.map((_, cellIndex) => <td key={cellIndex} className="px-4 py-3 align-top leading-6 text-[var(--text-secondary)]"><InlineText text={row[cellIndex] ?? ""} currentSlug={currentSlug} /></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return <hr className="border-0 border-t border-[var(--stroke-subtle)]" />;
}

export function MarkdownDocument({ document, currentSlug }: { document: ParsedMarkdownDocument; currentSlug: string }) {
  return (
    <article className="mx-auto max-w-[780px] space-y-5 px-5 py-8 sm:px-8 sm:py-10 xl:px-10 xl:py-12">
      {document.blocks.map((block, index) => (
        <MarkdownBlockView key={`${block.type}-${index}`} block={block} currentSlug={currentSlug} />
      ))}
    </article>
  );
}
