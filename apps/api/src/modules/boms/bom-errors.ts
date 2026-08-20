const validityConstraint = "bom_versions_no_overlapping_validity";

function errorSignature(error: unknown) {
  if (!error || typeof error !== "object") return String(error);
  const candidate = error as { code?: unknown; message?: unknown; meta?: unknown };
  let meta = "";
  try {
    meta = JSON.stringify(candidate.meta ?? "");
  } catch {
    meta = String(candidate.meta ?? "");
  }
  return `${String(candidate.code ?? "")} ${String(candidate.message ?? "")} ${meta}`;
}

/**
 * Prisma exposes PostgreSQL exclusion violations through a database constraint
 * error. Match only Nora's named validity constraint so unrelated database
 * failures continue to surface instead of being mislabeled as a timeline race.
 */
export function isBomValidityConstraintConflict(error: unknown) {
  return errorSignature(error).includes(validityConstraint);
}
