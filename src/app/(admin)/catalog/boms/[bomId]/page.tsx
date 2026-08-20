import { BomWorkbenchPage } from "@/features/catalog/bom-workbench-page";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ bomId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ bomId }, query] = await Promise.all([params, searchParams]);
  return <BomWorkbenchPage bomId={bomId} initialView={query.view} />;
}
