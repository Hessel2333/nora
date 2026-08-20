import type { Prisma } from "../../generated/prisma/client.js";
import { getBomVersionValidityState } from "./bom-policy.js";

export const bomInclude = {
  product: true,
  versions: {
    include: {
      operations: { orderBy: { sequence: "asc" as const } },
      items: {
        include: { componentProduct: true, operation: true },
        orderBy: { sortOrder: "asc" as const },
      },
      previousVersion: true,
      events: { orderBy: { createdAt: "desc" as const } },
    },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.BomInclude;

export type BomRecord = Prisma.BomGetPayload<{ include: typeof bomInclude }>;

export function presentBom(bom: BomRecord, selectedVersionId?: string) {
  const now = new Date();
  const selected =
    bom.versions.find((version) => version.id === selectedVersionId) ??
    bom.versions.find(
      (version) =>
        version.status !== "draft" &&
        version.effectiveAt !== null &&
        version.effectiveAt <= now &&
        (version.effectiveTo === null || version.effectiveTo > now),
    ) ??
    bom.versions[0];
  if (!selected) throw new Error(`BOM ${bom.id} 没有版本`);
  return {
    id: bom.id,
    code: bom.code,
    productId: bom.productId,
    productName: bom.product.name,
    versionId: selected.id,
    version: selected.version,
    previousVersion: selected.previousVersion?.version ?? "—",
    outputQuantity: Number(selected.outputQuantity),
    outputUnit: selected.outputUnit,
    status: selected.status,
    validityState: getBomVersionValidityState(selected, now),
    effectiveAt: selected.effectiveAt?.toISOString() ?? "",
    effectiveTo: selected.effectiveTo?.toISOString() ?? null,
    revision: selected.revision,
    operations: selected.operations.map((operation) => ({
      id: operation.id,
      code: operation.code,
      name: operation.name,
      kind: operation.kind,
      sequence: operation.sequence,
      workCenter: operation.workCenter ?? undefined,
      durationMinutes: operation.durationMinutes,
      waitMinutes: operation.waitMinutes,
      temperatureMin: operation.temperatureMin === null ? undefined : Number(operation.temperatureMin),
      temperatureMax: operation.temperatureMax === null ? undefined : Number(operation.temperatureMax),
      instructions: operation.instructions ?? undefined,
    })),
    items: selected.items.map((item) => ({
      id: item.id,
      componentId: item.componentProductId,
      componentCode: item.componentProduct.code,
      operationId: item.operationId,
      operationCode: item.operation.code,
      name: item.componentProduct.name,
      type: item.componentProduct.type,
      unit: item.unit,
      netQuantity: Number(item.netQuantity),
      yieldRate: Number(item.yieldRate),
      unitCost: Number(item.unitCostSnapshot),
      level: 1,
      notes: item.notes ?? undefined,
    })),
    versions: bom.versions.map((version) => ({
      id: version.id,
      version: version.version,
      previousVersion: version.previousVersion?.version ?? "—",
      outputQuantity: Number(version.outputQuantity),
      outputUnit: version.outputUnit,
      status: version.status,
      validityState: getBomVersionValidityState(version, now),
      effectiveAt: version.effectiveAt?.toISOString() ?? null,
      effectiveTo: version.effectiveTo?.toISOString() ?? null,
      publishedAt: version.publishedAt?.toISOString() ?? null,
      revision: version.revision,
      operationCount: version.operations.length,
      operations: version.operations.map((operation) => ({
        id: operation.id,
        code: operation.code,
        name: operation.name,
        kind: operation.kind,
        sequence: operation.sequence,
        workCenter: operation.workCenter ?? undefined,
        durationMinutes: operation.durationMinutes,
        waitMinutes: operation.waitMinutes,
        temperatureMin: operation.temperatureMin === null ? undefined : Number(operation.temperatureMin),
        temperatureMax: operation.temperatureMax === null ? undefined : Number(operation.temperatureMax),
        instructions: operation.instructions ?? undefined,
      })),
      items: version.items.map((item) => ({
        id: item.id,
        componentId: item.componentProductId,
        componentCode: item.componentProduct.code,
        operationId: item.operationId,
        operationCode: item.operation.code,
        name: item.componentProduct.name,
        type: item.componentProduct.type,
        unit: item.unit,
        netQuantity: Number(item.netQuantity),
        yieldRate: Number(item.yieldRate),
        unitCost: Number(item.unitCostSnapshot),
        level: 1,
        notes: item.notes ?? undefined,
      })),
      events: version.events.map((event) => ({
        id: event.id,
        type: event.type,
        actor: event.actor,
        revision: event.revision,
        effectiveAt: event.effectiveAt?.toISOString() ?? null,
        createdAt: event.createdAt.toISOString(),
      })),
    })),
  };
}
