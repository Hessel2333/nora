import type { WorkOrderMaterialsView } from "@/lib/types";

type Requirement = WorkOrderMaterialsView["requirements"][number];

export function materialIssueProgress(requirement: Requirement) {
  const planned = Number(requirement.plannedQuantity);
  if (!Number.isFinite(planned) || planned <= 0) return 0;
  return Math.min(100, Math.max(0, (Number(requirement.netIssuedQuantity) / planned) * 100));
}

export function materialReconciliationProgress(requirement: Requirement) {
  const netIssued = Number(requirement.netIssuedQuantity);
  if (!Number.isFinite(netIssued) || netIssued <= 0) return 0;
  return Math.min(100, Math.max(0, (Number(requirement.reconciledQuantity) / netIssued) * 100));
}

export function suggestedMovementQuantity(limit: string, onHand?: string) {
  const max = onHand === undefined ? Number(limit) : Math.min(Number(limit), Number(onHand));
  if (!Number.isFinite(max) || max <= 0) return "0.000";
  return max.toFixed(3);
}
