import { getBomVersionValidityState } from "./bom-validity";
import type { Bom, ProductType, SalesOrder } from "./types";

export interface BomStructureNode {
  id: string;
  productId: string;
  code: string;
  name: string;
  type: ProductType;
  unit: string;
  depth: number;
  path: string[];
  netQuantity: number;
  grossQuantity: number;
  yieldRate: number;
  unitCost: number;
  directCost: number;
  expandedCost: number;
  lossQuantity: number;
  bomVersion?: string;
  operationCode?: string;
  operationName?: string;
  cycle: boolean;
  children: BomStructureNode[];
}

export interface ExplodedMaterial {
  productId: string;
  code: string;
  name: string;
  type: ProductType;
  unit: string;
  grossQuantity: number;
  estimatedCost: number;
  lossQuantity: number;
  sources: string[];
}

export interface RecipeUsageTrial {
  bomId: string;
  productId: string;
  requestedOutput: number;
  outputUnit: string;
  scaleFactor: number;
  items: ExplodedMaterial[];
  totalEstimatedCost: number;
}

function round(value: number, precision = 6) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function currentBomForProduct(productId: string, boms: Bom[], asAt: Date) {
  return boms.find(
    (bom) =>
      bom.productId === productId &&
      getBomVersionValidityState(
        {
          status: bom.status,
          effectiveAt: bom.effectiveAt || null,
          effectiveTo: bom.effectiveTo,
        },
        asAt,
      ) === "current",
  );
}

export function buildBomStructure(
  bom: Bom,
  boms: Bom[],
  requestedOutput = bom.outputQuantity,
  asAt = new Date(),
): BomStructureNode {
  const outputFactor = requestedOutput / bom.outputQuantity;

  const buildChildren = (
    source: Bom,
    factor: number,
    depth: number,
    path: string[],
    productPath: string[],
  ): BomStructureNode[] =>
    source.items.map((item) => {
      const operation = source.operations.find((candidate) => candidate.code === item.operationCode);
      const netQuantity = item.netQuantity * factor;
      const grossQuantity = netQuantity / item.yieldRate;
      const directCost = grossQuantity * item.unitCost;
      const nestedBom = currentBomForProduct(item.componentId, boms, asAt);
      const cycle = productPath.includes(item.componentId);
      const nodePath = [...path, item.name];
      const children =
        nestedBom && !cycle
          ? buildChildren(
              nestedBom,
              grossQuantity / nestedBom.outputQuantity,
              depth + 1,
              nodePath,
              [...productPath, item.componentId],
            )
          : [];
      return {
        id: item.id,
        productId: item.componentId,
        code: item.componentCode ?? item.componentId,
        name: item.name,
        type: item.type ?? (nestedBom ? "semi" : "raw"),
        unit: item.unit,
        depth,
        path: nodePath,
        netQuantity: round(netQuantity),
        grossQuantity: round(grossQuantity),
        yieldRate: item.yieldRate,
        unitCost: item.unitCost,
        directCost: round(directCost, 4),
        expandedCost: round(
          children.length
            ? children.reduce((sum, child) => sum + child.expandedCost, 0)
            : directCost,
          4,
        ),
        lossQuantity: round(grossQuantity - netQuantity),
        bomVersion: nestedBom?.version,
        operationCode: item.operationCode,
        operationName: operation?.name,
        cycle,
        children,
      };
    });

  const children = buildChildren(
    bom,
    outputFactor,
    1,
    [bom.productName],
    [bom.productId],
  );
  return {
    id: `root-${bom.id}`,
    productId: bom.productId,
    code: bom.code ?? bom.productId,
    name: bom.productName,
    type: "finished",
    unit: bom.outputUnit,
    depth: 0,
    path: [bom.productName],
    netQuantity: round(requestedOutput),
    grossQuantity: round(requestedOutput),
    yieldRate: 1,
    unitCost: 0,
    directCost: round(
      children.reduce((sum, child) => sum + child.directCost, 0),
      4,
    ),
    expandedCost: round(
      children.reduce((sum, child) => sum + child.expandedCost, 0),
      4,
    ),
    // Child losses can use different units (kg, 套, 份), so the root must not
    // present their arithmetic sum as a meaningful finished-product loss.
    lossQuantity: 0,
    bomVersion: bom.version,
    cycle: false,
    children,
  };
}

export function flattenBomStructure(root: BomStructureNode) {
  const result: BomStructureNode[] = [];
  const visit = (node: BomStructureNode) => {
    result.push(node);
    node.children.forEach(visit);
  };
  visit(root);
  return result;
}

export function aggregateExplodedMaterials(root: BomStructureNode) {
  const totals = new Map<string, ExplodedMaterial>();
  const visit = (node: BomStructureNode) => {
    if (node.children.length) {
      node.children.forEach(visit);
      return;
    }
    const key = `${node.productId}:${node.unit}`;
    const existing = totals.get(key);
    if (existing) {
      existing.grossQuantity = round(existing.grossQuantity + node.grossQuantity);
      existing.estimatedCost = round(existing.estimatedCost + node.directCost, 4);
      existing.lossQuantity = round(existing.lossQuantity + node.lossQuantity);
      existing.sources = [...new Set([...existing.sources, node.path.join(" → ")])];
      return;
    }
    totals.set(key, {
      productId: node.productId,
      code: node.code,
      name: node.name,
      type: node.type,
      unit: node.unit,
      grossQuantity: node.grossQuantity,
      estimatedCost: node.directCost,
      lossQuantity: node.lossQuantity,
      sources: [node.path.join(" → ")],
    });
  };
  root.children.forEach(visit);
  return [...totals.values()].sort((left, right) =>
    right.estimatedCost === left.estimatedCost
      ? left.code.localeCompare(right.code)
      : right.estimatedCost - left.estimatedCost,
  );
}

/**
 * Calculates a what-if usage trial for one recipe version only.
 *
 * Order-wide aggregation belongs to the order/planning context and must not be
 * introduced here. Nested semi-finished recipes are still recursively expanded
 * because they are part of the selected recipe's material structure.
 */
export function calculateRecipeUsageTrial(
  bom: Bom,
  boms: Bom[],
  requestedOutput = bom.outputQuantity,
  asAt = new Date(),
): RecipeUsageTrial {
  const items = aggregateExplodedMaterials(
    buildBomStructure(bom, boms, requestedOutput, asAt),
  );
  return {
    bomId: bom.id,
    productId: bom.productId,
    requestedOutput,
    outputUnit: bom.outputUnit,
    scaleFactor: requestedOutput / bom.outputQuantity,
    items,
    totalEstimatedCost: round(
      items.reduce((sum, item) => sum + item.estimatedCost, 0),
      4,
    ),
  };
}

export function getOrderBomCoverage(order: SalesOrder, boms: Bom[], asAt = new Date()) {
  const lines = order.lines.map((line) => {
    const bom = currentBomForProduct(line.productId, boms, asAt);
    return { line, bom };
  });
  return {
    readyCount: lines.filter((item) => item.bom).length,
    totalCount: lines.length,
    ready: lines.length > 0 && lines.every((item) => item.bom),
    missing: lines.filter((item) => !item.bom).map((item) => item.line.productName),
    lines,
  };
}

export function explodeDraftOrder(order: SalesOrder, boms: Bom[], asAt = new Date()) {
  const totals = new Map<string, ExplodedMaterial>();
  const missing: string[] = [];
  for (const line of order.lines) {
    const bom = currentBomForProduct(line.productId, boms, asAt);
    if (!bom) {
      missing.push(line.productName);
      continue;
    }
    for (const material of aggregateExplodedMaterials(
      buildBomStructure(bom, boms, line.quantity, asAt),
    )) {
      const key = `${material.productId}:${material.unit}`;
      const existing = totals.get(key);
      if (existing) {
        existing.grossQuantity = round(existing.grossQuantity + material.grossQuantity);
        existing.estimatedCost = round(existing.estimatedCost + material.estimatedCost, 4);
        existing.lossQuantity = round(existing.lossQuantity + material.lossQuantity);
        existing.sources = [...new Set([...existing.sources, ...material.sources])];
      } else {
        totals.set(key, { ...material });
      }
    }
  }
  return {
    items: [...totals.values()].sort((left, right) => right.estimatedCost - left.estimatedCost),
    missing,
  };
}
