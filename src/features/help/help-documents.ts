import { readFile } from "node:fs/promises";
import path from "node:path";

export interface HelpDocumentDefinition {
  slug: string;
  title: string;
  file: string;
}

export interface HelpNavigationSection {
  title: string;
  documents: HelpDocumentDefinition[];
}

export const helpNavigation: HelpNavigationSection[] = [
  {
    title: "开始使用",
    documents: [{ slug: "", title: "流程总览", file: "index.md" }],
  },
  {
    title: "订单与需求",
    documents: [
      {
        slug: "order-and-demand/order-review",
        title: "提交与审核订单",
        file: "order-and-demand/order-review.md",
      },
      {
        slug: "order-and-demand/production-demand",
        title: "理解生产需求",
        file: "order-and-demand/production-demand.md",
      },
    ],
  },
  {
    title: "配方与计划",
    documents: [
      {
        slug: "recipe-and-planning/recipe-basis",
        title: "配方与快照",
        file: "recipe-and-planning/recipe-basis.md",
      },
      {
        slug: "recipe-and-planning/planning-and-work-orders",
        title: "从需求到工单",
        file: "recipe-and-planning/planning-and-work-orders.md",
      },
    ],
  },
  {
    title: "执行与追溯",
    documents: [
      {
        slug: "execution/execution-and-traceability",
        title: "执行、质量与追溯",
        file: "execution/execution-and-traceability.md",
      },
    ],
  },
  {
    title: "参考",
    documents: [
      {
        slug: "reference/terms-and-statuses",
        title: "术语与状态",
        file: "reference/terms-and-statuses.md",
      },
    ],
  },
];

const documents = helpNavigation.flatMap((section) => section.documents);

export function findHelpDocument(slug: string) {
  return documents.find((document) => document.slug === slug);
}

export function allHelpDocuments() {
  return documents;
}

export async function readHelpDocument(document: HelpDocumentDefinition) {
  const root = path.join(process.cwd(), "web-docs");
  const filePath = path.join(root, document.file);
  return readFile(filePath, "utf8");
}
