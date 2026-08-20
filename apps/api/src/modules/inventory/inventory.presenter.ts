import type { Prisma } from "../../generated/prisma/client.js";
import { formatLocalDateTime } from "../../common/date.js";

export const inventoryTransactionInclude = {
  location: true,
  product: true,
  lot: true,
} satisfies Prisma.InventoryTransactionInclude;

export const stockBalanceInclude = {
  location: true,
  product: true,
  lot: true,
} satisfies Prisma.StockBalanceProjectionInclude;

export type InventoryTransactionRecord = Prisma.InventoryTransactionGetPayload<{
  include: typeof inventoryTransactionInclude;
}>;

export type StockBalanceRecord = Prisma.StockBalanceProjectionGetPayload<{
  include: typeof stockBalanceInclude;
}>;

export function presentInventoryLocation(location: {
  id: string;
  factoryCode: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
}) {
  return {
    id: location.id,
    factoryCode: location.factoryCode,
    code: location.code,
    name: location.name,
    type: location.type,
    active: location.active,
  };
}

export function presentStockBalance(balance: StockBalanceRecord) {
  const onHandQuantity = balance.onHandQuantity.toFixed(3);
  return {
    id: balance.id,
    location: {
      id: balance.location.id,
      code: balance.location.code,
      name: balance.location.name,
      type: balance.location.type,
    },
    product: {
      id: balance.product.id,
      code: balance.product.code,
      name: balance.product.name,
      category: balance.product.category,
    },
    lot: {
      id: balance.lot.id,
      code: balance.lot.code,
      supplierLotCode: balance.lot.supplierLotCode,
      qualityStatus: balance.lot.qualityStatus,
      receivedAt: formatLocalDateTime(balance.lot.receivedAt),
      productionAt: balance.lot.productionAt ? formatLocalDateTime(balance.lot.productionAt) : null,
      expiresAt: balance.lot.expiresAt ? formatLocalDateTime(balance.lot.expiresAt) : null,
    },
    onHandQuantity,
    availableQuantity: balance.lot.qualityStatus === "released" ? onHandQuantity : "0.000",
    unit: balance.product.unit,
    revision: balance.revision,
    updatedAt: formatLocalDateTime(balance.updatedAt),
  };
}

export function presentInventoryTransaction(transaction: InventoryTransactionRecord) {
  return {
    id: transaction.id,
    location: {
      id: transaction.location.id,
      code: transaction.location.code,
      name: transaction.location.name,
    },
    product: {
      id: transaction.product.id,
      code: transaction.product.code,
      name: transaction.product.name,
    },
    lot: {
      id: transaction.lot.id,
      code: transaction.lot.code,
      qualityStatus: transaction.lot.qualityStatus,
    },
    type: transaction.type,
    direction: transaction.direction,
    quantity: transaction.quantity.toFixed(3),
    unit: transaction.unit,
    sourceType: transaction.sourceType,
    sourceId: transaction.sourceId,
    referenceCode: transaction.referenceCode,
    note: transaction.note,
    actor: transaction.actor,
    occurredAt: formatLocalDateTime(transaction.occurredAt),
    createdAt: formatLocalDateTime(transaction.createdAt),
  };
}
