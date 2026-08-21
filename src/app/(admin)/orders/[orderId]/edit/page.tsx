import { NewOrderPage } from "@/features/orders/new-order-page";
import { PermissionBoundary } from "@/features/auth/permission-boundary";

export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <PermissionBoundary
      permission="orders:write"
      detail="当前账号可以查看订单，但不能修改订单。请联系管理员分配订单录入权限。"
    >
      <NewOrderPage orderId={orderId} />
    </PermissionBoundary>
  );
}
