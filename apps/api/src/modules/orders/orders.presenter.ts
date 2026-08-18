import type { Prisma } from "../../generated/prisma/client.js";
import type { SalesOrderSource } from "../../generated/prisma/enums.js";
import { formatLocalDateTime } from "../../common/date.js";

export const orderInclude = {
  lines: { orderBy: { sortOrder: "asc" as const } },
  events: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.SalesOrderInclude;

export type OrderRecord = Prisma.SalesOrderGetPayload<{ include: typeof orderInclude }>;

const sourceLabels: Record<SalesOrderSource, "客户下单" | "手工录入" | "AI预测" | "Excel导入"> = {
  customer: "客户下单",
  manual: "手工录入",
  ai_forecast: "AI预测",
  excel_import: "Excel导入",
};

export function presentOrder(order: OrderRecord) {
  return {
    id: order.id,
    code: order.code,
    customerId: order.customerId,
    customerName: order.customerName,
    deliveryAt: formatLocalDateTime(order.deliveryAt),
    status: order.status,
    source: sourceLabels[order.source],
    createdAt: formatLocalDateTime(order.createdAt),
    updatedAt: formatLocalDateTime(order.updatedAt),
    contact: order.contact,
    phone: order.phone,
    address: order.address,
    notes: order.notes ?? undefined,
    revision: order.revision,
    lines: order.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productCode: line.productCode,
      productName: line.productName,
      quantity: Number(line.quantity),
      unit: line.unit,
      unitPrice: Number(line.unitPrice),
    })),
    events: order.events.map((event) => ({
      id: event.id,
      type: event.type,
      label: event.label,
      actor: event.actor,
      comment: event.comment ?? undefined,
      at: formatLocalDateTime(event.createdAt),
    })),
  };
}
