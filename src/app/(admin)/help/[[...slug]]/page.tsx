import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpCenterLayout } from "@/features/help/help-center-layout";
import {
  allHelpDocuments,
  findHelpDocument,
  helpNavigation,
  readHelpDocument,
} from "@/features/help/help-documents";
import { MarkdownDocument } from "@/features/help/markdown-document";
import { parseMarkdown } from "@/features/help/markdown";

export function generateStaticParams() {
  return allHelpDocuments().map((document) => ({
    slug: document.slug ? document.slug.split("/") : [],
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug: segments = [] } = await params;
  const document = findHelpDocument(segments.join("/"));
  return { title: document ? `${document.title} · Nora 帮助中心` : "Nora 帮助中心" };
}

export default async function HelpDocumentPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug: segments = [] } = await params;
  const slug = segments.join("/");
  const definition = findHelpDocument(slug);
  if (!definition) notFound();

  const document = parseMarkdown(await readHelpDocument(definition));
  return (
    <HelpCenterLayout
      sections={helpNavigation}
      currentSlug={slug}
      currentTitle={definition.title}
      headings={document.headings}
    >
      <MarkdownDocument document={document} currentSlug={slug} />
    </HelpCenterLayout>
  );
}
