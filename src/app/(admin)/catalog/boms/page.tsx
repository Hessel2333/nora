import { BomWorkbenchPage } from "@/features/catalog/bom-workbench-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const query = await searchParams;
  return <BomWorkbenchPage initialView={query.view} />;
}
