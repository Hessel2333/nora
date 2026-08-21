import { Prisma } from "../../generated/prisma/client.js";

export type MaterialReconciliationIssue = "not_fully_issued" | "unreconciled";

export function isMaterialUsageAllowed(status: string) {
  return status === "running";
}

export function remainingIssuedQuantity(
  netIssued: Prisma.Decimal,
  consumed: Prisma.Decimal,
  scrapped: Prisma.Decimal,
) {
  return Prisma.Decimal.max(netIssued.sub(consumed).sub(scrapped), 0);
}

export function getMaterialReconciliationIssue(rows: Array<{
  planned: Prisma.Decimal;
  netIssued: Prisma.Decimal;
  consumed: Prisma.Decimal;
  scrapped: Prisma.Decimal;
}>): MaterialReconciliationIssue | undefined {
  if (rows.some((row) => !row.netIssued.equals(row.planned))) return "not_fully_issued";
  if (rows.some((row) => !row.consumed.add(row.scrapped).equals(row.netIssued))) return "unreconciled";
  return undefined;
}
