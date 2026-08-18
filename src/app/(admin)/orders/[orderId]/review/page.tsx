import { OrderReviewPage } from "@/features/orders/order-review-page";

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <OrderReviewPage id={orderId} />;
}
