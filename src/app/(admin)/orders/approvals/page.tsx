import { OrderApprovalsPage, type ApprovalFeedback } from "@/features/orders/order-approvals-page";
import { PermissionBoundary } from "@/features/auth/permission-boundary";

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const result = first(query.result);
  const orderCode = first(query.orderCode);
  const feedback: ApprovalFeedback | undefined = orderCode && (result === "approved" || result === "returned")
    ? {
        result,
        orderCode,
        demandCode: first(query.demandCode),
        demo: first(query.demo) === "true",
      }
    : undefined;
  return (
    <PermissionBoundary
      permission="orders:approve"
      detail="审核工作台仅对订单审核人员开放。普通订单查看请返回订单中心。"
    >
      <OrderApprovalsPage feedback={feedback} />
    </PermissionBoundary>
  );
}
