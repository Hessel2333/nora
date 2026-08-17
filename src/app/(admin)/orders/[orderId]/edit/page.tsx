import { NewOrderPage } from "@/features/orders/new-order-page";

export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <NewOrderPage orderId={orderId} />;
}
