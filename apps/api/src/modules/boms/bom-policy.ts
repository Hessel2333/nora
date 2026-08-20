export function calculateGrossQuantity(netQuantity: number, yieldRate: number, factor = 1) {
  if (netQuantity <= 0) throw new Error("净用量必须大于 0");
  if (yieldRate <= 0 || yieldRate > 1) throw new Error("出成率必须大于 0 且不超过 1");
  if (factor <= 0) throw new Error("展开系数必须大于 0");
  return (netQuantity / yieldRate) * factor;
}

export function isEffectiveAt(
  version: { status: "draft" | "effective" | "retired"; effectiveAt: Date | null; effectiveTo: Date | null },
  asAt: Date,
) {
  return (
    version.status !== "draft" &&
    version.effectiveAt !== null &&
    version.effectiveAt <= asAt &&
    (version.effectiveTo === null || version.effectiveTo > asAt)
  );
}

export type BomVersionValidityState = "draft" | "scheduled" | "current" | "historical";

export function getBomVersionValidityState(
  version: { status: "draft" | "effective" | "retired"; effectiveAt: Date | null; effectiveTo: Date | null },
  asAt: Date,
): BomVersionValidityState {
  if (version.status === "draft") return "draft";
  if (version.effectiveAt && version.effectiveAt > asAt) return "scheduled";
  if (isEffectiveAt(version, asAt)) return "current";
  return "historical";
}
