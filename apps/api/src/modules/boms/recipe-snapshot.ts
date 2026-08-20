import type { BomOperationKind, ProductType } from "../../generated/prisma/enums.js";

export type RecipeSnapshotProduct = {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  unit: string;
  unitCost: number;
};

export type RecipeSnapshotComponent = {
  product: RecipeSnapshotProduct;
  netQuantity: number;
  yieldRate: number;
  unit: string;
  unitCostSnapshot: number;
  sortOrder: number;
  notes: string | null;
  operationCode?: string;
  recipe: RecipeSnapshot;
};

export type RecipeSnapshotOperation = {
  code: string;
  name: string;
  kind: BomOperationKind;
  sequence: number;
  workCenter: string | null;
  durationMinutes: number;
  waitMinutes: number;
  temperatureMin: number | null;
  temperatureMax: number | null;
  instructions: string | null;
};

export type RecipeSnapshot = {
  schemaVersion: 1 | 2;
  capturedAt: string;
  asAt: string;
  product: RecipeSnapshotProduct;
  bomVersion: null | {
    id: string;
    bomId: string;
    bomCode: string;
    version: string;
    effectiveAt: string;
    effectiveTo: string | null;
    outputQuantity: number;
    outputUnit: string;
  };
  operations?: RecipeSnapshotOperation[];
  components: RecipeSnapshotComponent[];
};

export function isCompleteRecipeSnapshot(value: unknown): value is RecipeSnapshot {
  return isRecipeSnapshot(value, 0);
}

export function isExecutableRecipeSnapshot(
  value: unknown,
): value is RecipeSnapshot & { schemaVersion: 2; operations: RecipeSnapshotOperation[] } {
  return isCompleteRecipeSnapshot(value)
    && value.schemaVersion === 2
    && Array.isArray(value.operations)
    && value.operations.length > 0;
}

function isRecipeSnapshot(value: unknown, depth: number): value is RecipeSnapshot {
  if (!isRecord(value) || depth > 64) return false;
  if (![1, 2].includes(Number(value.schemaVersion)) || !isIsoDate(value.capturedAt) || !isIsoDate(value.asAt)) return false;
  const schemaVersion = value.schemaVersion as 1 | 2;
  if (!isProduct(value.product) || !Array.isArray(value.components)) return false;
  if (schemaVersion === 2 && !isOperations(value.operations)) return false;
  const operations: RecipeSnapshotOperation[] = schemaVersion === 2
    ? value.operations as RecipeSnapshotOperation[]
    : [];
  if (value.bomVersion === null) return value.components.length === 0 && (schemaVersion === 1 || operations.length === 0);
  if (!isRecord(value.bomVersion)) return false;
  if (
    !isString(value.bomVersion.id)
    || !isString(value.bomVersion.bomId)
    || !isString(value.bomVersion.bomCode)
    || !isString(value.bomVersion.version)
    || !isIsoDate(value.bomVersion.effectiveAt)
    || !(value.bomVersion.effectiveTo === null || isIsoDate(value.bomVersion.effectiveTo))
    || !isPositiveNumber(value.bomVersion.outputQuantity)
    || !isString(value.bomVersion.outputUnit)
  ) return false;
  if (schemaVersion === 2 && operations.length === 0) return false;
  const operationCodes = new Set(operations.map((operation) => operation.code));
  return value.components.every((component) => {
    if (!isRecord(component) || !isProduct(component.product)) return false;
    if (
      !isNonNegativeNumber(component.netQuantity)
      || !isPositiveNumber(component.yieldRate)
      || !isString(component.unit)
      || !isNonNegativeNumber(component.unitCostSnapshot)
      || !Number.isInteger(component.sortOrder)
      || !(component.notes === null || typeof component.notes === "string")
      || (schemaVersion === 2 && (!isString(component.operationCode) || !operationCodes.has(component.operationCode)))
      || !isRecipeSnapshot(component.recipe, depth + 1)
    ) return false;
    return component.recipe.product.id === component.product.id
      && component.recipe.schemaVersion === schemaVersion;
  });
}

function isOperations(value: unknown): value is RecipeSnapshotOperation[] {
  if (!Array.isArray(value)) return false;
  const codes = new Set<string>();
  const sequences = new Set<number>();
  for (const operation of value) {
    if (!isRecord(operation)
      || !isString(operation.code)
      || !isString(operation.name)
      || !["receive", "wash", "cut", "marinate", "mix", "cool", "pack", "quality"].includes(String(operation.kind))
      || !Number.isInteger(operation.sequence)
      || Number(operation.sequence) <= 0
      || !(operation.workCenter === null || typeof operation.workCenter === "string")
      || !isNonNegativeInteger(operation.durationMinutes)
      || !isNonNegativeInteger(operation.waitMinutes)
      || !(operation.temperatureMin === null || typeof operation.temperatureMin === "number")
      || !(operation.temperatureMax === null || typeof operation.temperatureMax === "number")
      || !(operation.instructions === null || typeof operation.instructions === "string")
      || codes.has(operation.code)
      || sequences.has(Number(operation.sequence))
    ) return false;
    if (typeof operation.temperatureMin === "number" && typeof operation.temperatureMax === "number" && operation.temperatureMin > operation.temperatureMax) return false;
    codes.add(operation.code);
    sequences.add(Number(operation.sequence));
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isIsoDate(value: unknown): value is string {
  return isString(value) && !Number.isNaN(Date.parse(value));
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isProduct(value: unknown): value is RecipeSnapshotProduct {
  if (!isRecord(value)) return false;
  return isString(value.id)
    && isString(value.code)
    && isString(value.name)
    && ["raw", "semi", "processed", "finished", "combo"].includes(String(value.type))
    && isString(value.unit)
    && isNonNegativeNumber(value.unitCost);
}
