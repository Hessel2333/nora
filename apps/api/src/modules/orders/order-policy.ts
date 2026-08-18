import type { SalesOrderStatus } from "../../generated/prisma/enums.js";

const transitions: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  draft: ["pending"],
  pending: ["approved", "draft"],
  approved: ["in_production"],
  in_production: ["delivering"],
  delivering: ["completed"],
  completed: ["reconciled"],
  reconciled: [],
};

export function canTransitionOrder(from: SalesOrderStatus, to: SalesOrderStatus) {
  return transitions[from].includes(to);
}
