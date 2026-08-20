import { Prisma } from "../../generated/prisma/client.js";
import type { RecipeSnapshot } from "../boms/recipe-snapshot.js";

export type WorkOrderMaterialMovement = "issue" | "return";

export interface WorkOrderMaterialRequirement {
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  plannedQuantity: Prisma.Decimal;
}

export function calculateWorkOrderMaterialRequirements(
  snapshot: RecipeSnapshot,
  plannedQuantity: Prisma.Decimal,
) {
  const totals = new Map<string, WorkOrderMaterialRequirement>();
  visitSnapshot(snapshot, plannedQuantity, undefined, totals);
  return [...totals.values()]
    .map((item) => ({
      ...item,
      plannedQuantity: item.plannedQuantity.toDecimalPlaces(3, Prisma.Decimal.ROUND_CEIL),
    }))
    .filter((item) => item.plannedQuantity.gt(0))
    .sort((left, right) => left.productCode.localeCompare(right.productCode));
}

export function isMaterialMovementAllowed(status: string, movement: WorkOrderMaterialMovement) {
  if (movement === "issue") return ["pending", "running", "paused"].includes(status);
  return ["pending", "running", "paused", "exception"].includes(status);
}

function visitSnapshot(
  snapshot: RecipeSnapshot,
  quantity: Prisma.Decimal,
  unitOverride: string | undefined,
  totals: Map<string, WorkOrderMaterialRequirement>,
) {
  if (!snapshot.bomVersion) {
    const unit = unitOverride ?? snapshot.product.unit;
    const key = `${snapshot.product.id}:${unit}`;
    const current = totals.get(key);
    if (current) {
      current.plannedQuantity = current.plannedQuantity.add(quantity);
      return;
    }
    totals.set(key, {
      productId: snapshot.product.id,
      productCode: snapshot.product.code,
      productName: snapshot.product.name,
      unit,
      plannedQuantity: quantity,
    });
    return;
  }

  const factor = quantity.div(new Prisma.Decimal(snapshot.bomVersion.outputQuantity.toString()));
  for (const component of snapshot.components) {
    const grossQuantity = factor
      .mul(new Prisma.Decimal(component.netQuantity.toString()))
      .div(new Prisma.Decimal(component.yieldRate.toString()));
    visitSnapshot(component.recipe, grossQuantity, component.unit, totals);
  }
}
