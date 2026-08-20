export interface BatchCandidate {
  factoryCode: string;
  productId: string;
  unit: string;
  selectedBomVersionId?: string | null;
  snapshotComplete: boolean;
}

export type BatchCompatibilityIssue =
  | "snapshot_incomplete"
  | "factory_mismatch"
  | "product_mismatch"
  | "unit_mismatch"
  | "bom_version_mismatch";

export function getBatchCompatibilityIssue(candidates: BatchCandidate[]): BatchCompatibilityIssue | undefined {
  const first = candidates[0];
  if (!first || candidates.some((candidate) => !candidate.snapshotComplete || !candidate.selectedBomVersionId)) {
    return "snapshot_incomplete";
  }
  if (candidates.some((candidate) => candidate.factoryCode !== first.factoryCode)) return "factory_mismatch";
  if (candidates.some((candidate) => candidate.productId !== first.productId)) return "product_mismatch";
  if (candidates.some((candidate) => candidate.unit !== first.unit)) return "unit_mismatch";
  if (candidates.some((candidate) => candidate.selectedBomVersionId !== first.selectedBomVersionId)) {
    return "bom_version_mismatch";
  }
  return undefined;
}

export type ProductionBatchTransition = "confirm" | "release";

export type BatchTransitionIssue = "invalid_status" | "revision_conflict";

export function getBatchTransitionIssue(
  status: string,
  revision: number,
  expectedRevision: number,
  transition: ProductionBatchTransition,
): BatchTransitionIssue | undefined {
  const expectedStatus = transition === "confirm" ? "draft" : "confirmed";
  if (status !== expectedStatus) return "invalid_status";
  if (revision !== expectedRevision) return "revision_conflict";
  return undefined;
}
