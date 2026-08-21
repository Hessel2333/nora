import { OrderReviewPage } from "@/features/orders/order-review-page";
import { PermissionBoundary } from "@/features/auth/permission-boundary";

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <PermissionBoundary
      permission="orders:approve"
      detail="当前账号可以查看订单，但不能执行审核或退回。请由订单审核人员处理。"
    >
      <OrderReviewPage id={orderId} />
    </PermissionBoundary>
  );
}
