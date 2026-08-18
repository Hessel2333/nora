import type { Prisma } from "../../generated/prisma/client.js";

export const bomInclude = {
  product: true,
  versions: {
    include: {
      items: {
        include: { componentProduct: true },
        orderBy: { sortOrder: "asc" as const },
      },
      previousVersion: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.BomInclude;

export type BomRecord = Prisma.BomGetPayload<{ include: typeof bomInclude }>;

export function presentBom(bom: BomRecord, selectedVersionId?: string) {
  const selected =
    bom.versions.find((version) => version.id === selectedVersionId) ??
    bom.versions.find((version) => version.status === "effective") ??
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
    effectiveAt: selected.effectiveAt?.toISOString().slice(0, 10) ?? "",
    revision: selected.revision,
    items: selected.items.map((item) => ({
      id: item.id,
      componentId: item.componentProductId,
      componentCode: item.componentProduct.code,
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
      status: version.status,
      effectiveAt: version.effectiveAt?.toISOString() ?? null,
      revision: version.revision,
    })),
  };
}
