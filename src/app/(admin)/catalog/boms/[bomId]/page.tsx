import { BomsPage } from "@/features/catalog/catalog-pages";
export default async function Page({ params }: { params: Promise<{ bomId: string }> }) {
  const { bomId } = await params;
  return <BomsPage detail bomId={bomId} />;
}
