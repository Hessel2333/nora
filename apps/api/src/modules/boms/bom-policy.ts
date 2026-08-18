export function calculateGrossQuantity(netQuantity: number, yieldRate: number, factor = 1) {
  if (netQuantity <= 0) throw new Error("净用量必须大于 0");
  if (yieldRate <= 0 || yieldRate > 1) throw new Error("出成率必须大于 0 且不超过 1");
  if (factor <= 0) throw new Error("展开系数必须大于 0");
  return (netQuantity / yieldRate) * factor;
}
