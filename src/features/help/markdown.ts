export interface HelpHeading {
  id: string;
  level: 2 | 3;
  text: string;
}

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4; id: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "code"; language: string; code: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "rule" };

export interface ParsedMarkdownDocument {
  title: string;
  headings: HelpHeading[];
  blocks: MarkdownBlock[];
}

function headingId(text: string, index: number, used: Map<string, number>) {
  const base = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/[\s-]+/gu, "-") || `section-${index + 1}`;
  const occurrence = used.get(base) ?? 0;
  used.set(base, occurrence + 1);
  return occurrence === 0 ? base : `${base}-${occurrence + 1}`;
}

function isTableDivider(line: string) {
  const cells = line.replace(/^\||\|$/gu, "").split("|");
  return cells.length > 1 && cells.every((cell) => /^\s*:?-{3,}:?\s*$/u.test(cell));
}

function tableCells(line: string) {
  return line
    .replace(/^\s*\||\|\s*$/gu, "")
    .split("|")
    .map((cell) => cell.trim());
}

function startsBlock(lines: string[], index: number) {
  const line = lines[index] ?? "";
  const next = lines[index + 1] ?? "";
  return /^(?:#{1,4}\s+|```|\s*[-*]\s+|\s*\d+\.\s+|\s*>|\s*---+\s*$)/u.test(line)
    || (line.includes("|") && isTableDivider(next));
}

export function parseMarkdown(source: string): ParsedMarkdownDocument {
  const lines = source.replace(/^---\n[\s\S]*?\n---\n/u, "").replace(/\r\n?/gu, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  const headings: HelpHeading[] = [];
  const usedIds = new Map<string, number>();
  let title = "帮助文档";
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/u.exec(line);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4;
      const text = heading[2].trim();
      const id = headingId(text, blocks.length, usedIds);
      if (level === 1) title = text;
      if (level === 2 || level === 3) headings.push({ id, level, text });
      blocks.push({ type: "heading", level, id, text });
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", language, code: code.join("\n") });
      continue;
    }

    if (/^\s*---+\s*$/u.test(line)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    if (line.includes("|") && isTableDivider(lines[index + 1] ?? "")) {
      const headers = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (/^\s*[-*]\s+/u.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/u.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/u, "").trim());
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    if (/^\s*\d+\.\s+/u.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/u.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/u, "").trim());
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    if (/^\s*>/u.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>/u.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/u, "").trim());
        index += 1;
      }
      blocks.push({ type: "blockquote", text: quote.join(" ") });
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !startsBlock(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return { title, headings, blocks };
}
