import { MasterDataPage } from "@/features/master-data/master-data-page";

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <MasterDataPage section={section} />;
}
