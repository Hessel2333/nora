import { OrderApprovalsPage, type ApprovalFeedback } from "@/features/orders/order-approvals-page";

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
  return <OrderApprovalsPage feedback={feedback} />;
}
