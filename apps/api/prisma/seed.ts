import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client.js";

config({ path: "../../.env" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 未配置");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function captureRecipeSnapshot(productId: string, asAt: Date, capturedAt: Date, path: string[] = []): Promise<Prisma.InputJsonValue> {
  if (path.includes(productId)) throw new Error("Seed BOM contains a cycle");
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const bom = await prisma.bom.findFirst({
    where: { organizationId: product.organizationId, productId },
    include: {
      versions: {
        where: {
          status: { not: "draft" },
          effectiveAt: { lte: asAt },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: asAt } }],
        },
        include: {
          operations: { orderBy: { sequence: "asc" } },
          items: { include: { componentProduct: true, operation: true }, orderBy: { sortOrder: "asc" } },
        },
        orderBy: { effectiveAt: "desc" },
        take: 1,
      },
    },
  });
  const version = bom?.versions[0];
  const productSnapshot = {
    id: product.id,
    code: product.code,
    name: product.name,
    type: product.type,
    unit: product.unit,
    unitCost: Number(product.cost),
  };
  if (!bom || !version || !version.effectiveAt) {
    return {
      schemaVersion: 2,
      capturedAt: capturedAt.toISOString(),
      asAt: asAt.toISOString(),
      product: productSnapshot,
      bomVersion: null,
      operations: [],
      components: [],
    };
  }
  return {
    schemaVersion: 2,
    capturedAt: capturedAt.toISOString(),
    asAt: asAt.toISOString(),
    product: productSnapshot,
    bomVersion: {
      id: version.id,
      bomId: bom.id,
      bomCode: bom.code,
      version: version.version,
      effectiveAt: version.effectiveAt.toISOString(),
      effectiveTo: version.effectiveTo?.toISOString() ?? null,
      outputQuantity: Number(version.outputQuantity),
      outputUnit: version.outputUnit,
    },
    operations: version.operations.map((operation) => ({
      code: operation.code,
      name: operation.name,
      kind: operation.kind,
      sequence: operation.sequence,
      workCenter: operation.workCenter,
      durationMinutes: operation.durationMinutes,
      waitMinutes: operation.waitMinutes,
      temperatureMin: operation.temperatureMin === null ? null : Number(operation.temperatureMin),
      temperatureMax: operation.temperatureMax === null ? null : Number(operation.temperatureMax),
      instructions: operation.instructions,
    })),
    components: await Promise.all(version.items.map(async (item) => ({
      product: {
        id: item.componentProduct.id,
        code: item.componentProduct.code,
        name: item.componentProduct.name,
        type: item.componentProduct.type,
        unit: item.componentProduct.unit,
        unitCost: Number(item.componentProduct.cost),
      },
      operationCode: item.operation.code,
      netQuantity: Number(item.netQuantity),
      yieldRate: Number(item.yieldRate),
      unit: item.unit,
      unitCostSnapshot: Number(item.unitCostSnapshot),
      sortOrder: item.sortOrder,
      notes: item.notes,
      recipe: await captureRecipeSnapshot(item.componentProductId, asAt, capturedAt, [...path, productId]),
    }))),
  };
}

const ids = {
  organization: "00000000-0000-4000-8000-000000000001",
  locations: {
    rawCold: "11000000-0000-4000-8000-000000000001",
    rawFrozen: "11000000-0000-4000-8000-000000000002",
    quarantine: "11000000-0000-4000-8000-000000000003",
    finishedCold: "11000000-0000-4000-8000-000000000004",
  },
  customers: [
    "10000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000002",
    "10000000-0000-4000-8000-000000000003",
    "10000000-0000-4000-8000-000000000004",
  ],
  products: {
    gongbao: "20000000-0000-4000-8000-000000000001",
    yuxiang: "20000000-0000-4000-8000-000000000002",
    vegetables: "20000000-0000-4000-8000-000000000003",
    chicken: "20000000-0000-4000-8000-000000000004",
    pork: "20000000-0000-4000-8000-000000000005",
    package: "20000000-0000-4000-8000-000000000006",
    peanuts: "20000000-0000-4000-8000-000000000007",
    chili: "20000000-0000-4000-8000-000000000008",
    aromatics: "20000000-0000-4000-8000-000000000009",
    sauce: "20000000-0000-4000-8000-000000000010",
    soySauce: "20000000-0000-4000-8000-000000000011",
    vinegar: "20000000-0000-4000-8000-000000000012",
    sugar: "20000000-0000-4000-8000-000000000013",
    greens: "20000000-0000-4000-8000-000000000014",
  },
};

const inventoryLocationSeeds = [
  { id: ids.locations.rawCold, factoryCode: "SZ-CENTRAL", code: "RAW-COLD-01", name: "原料冷藏库", type: "cold_storage" as const },
  { id: ids.locations.rawFrozen, factoryCode: "SZ-CENTRAL", code: "RAW-FROZEN-01", name: "原料冷冻库", type: "frozen_storage" as const },
  { id: ids.locations.quarantine, factoryCode: "SZ-CENTRAL", code: "QUARANTINE-01", name: "待检隔离区", type: "quarantine" as const },
  { id: ids.locations.finishedCold, factoryCode: "SZ-CENTRAL", code: "FG-COLD-01", name: "成品冷藏库", type: "finished_goods" as const },
];

const operationIds = {
  gongbao: {
    wash: "41000000-0000-4000-8000-000000000101",
    cut: "41000000-0000-4000-8000-000000000102",
    marinate: "41000000-0000-4000-8000-000000000103",
    assemble: "41000000-0000-4000-8000-000000000104",
    pack: "41000000-0000-4000-8000-000000000105",
  },
  sauce: {
    mix: "41000000-0000-4000-8000-000000000201",
    quality: "41000000-0000-4000-8000-000000000202",
  },
  yuxiang: {
    wash: "41000000-0000-4000-8000-000000000301",
    cut: "41000000-0000-4000-8000-000000000302",
    marinate: "41000000-0000-4000-8000-000000000303",
    assemble: "41000000-0000-4000-8000-000000000304",
    pack: "41000000-0000-4000-8000-000000000305",
  },
  vegetables: {
    wash: "41000000-0000-4000-8000-000000000401",
    cut: "41000000-0000-4000-8000-000000000402",
    quality: "41000000-0000-4000-8000-000000000403",
    pack: "41000000-0000-4000-8000-000000000404",
  },
};

async function main() {
  const exists = await prisma.organization.findUnique({ where: { code: "NORA-DEMO" } });
  if (exists) {
    for (const location of inventoryLocationSeeds) {
      await prisma.inventoryLocation.upsert({
        where: { organizationId_code: { organizationId: exists.id, code: location.code } },
        update: { name: location.name, factoryCode: location.factoryCode, type: location.type, active: true },
        create: { ...location, organizationId: exists.id, createdBy: "seed:demo-data" },
      });
    }
    console.log("Nora 本地演示数据已存在，已同步库存库位主数据。");
    return;
  }

  await prisma.organization.create({
    data: {
      id: ids.organization,
      code: "NORA-DEMO",
      name: "美味中央厨房",
      customers: {
        create: [
          { id: ids.customers[0], code: "KH0001", name: "华润万家深圳福田店", type: "A类", contact: "张店长", phone: "138 0000 8888", address: "深圳市福田区深南大道2008号", settlement: "月结30天", tags: ["商超", "重点客户"] },
          { id: ids.customers[1], code: "KH0002", name: "盒马鲜生南山店", type: "A类", contact: "李经理", phone: "137 1020 6688", address: "深圳市南山区科苑路15号", settlement: "月结30天", tags: ["新零售"] },
          { id: ids.customers[2], code: "KH0003", name: "招商银行深圳分行", type: "B类", contact: "王主管", phone: "136 2208 5166", address: "深圳市福田区深南大道7088号", settlement: "月结45天", tags: ["团餐", "企业"] },
          { id: ids.customers[3], code: "KH0004", name: "中山大学深圳校区", type: "B类", contact: "陈老师", phone: "135 8831 9072", address: "深圳市光明区公常路66号", settlement: "月结30天", tags: ["团餐", "学校"] },
        ],
      },
      products: {
        create: [
          { id: ids.products.gongbao, code: "CP0001", name: "宫保鸡丁净菜包", type: "finished", category: "净菜包", unit: "份", cost: 8.62, price: 32.5, stock: 1260, safetyStock: 800, taxRate: 6, tags: ["冷藏", "分隔组配", "肉类前处理"] },
          { id: ids.products.yuxiang, code: "CP0002", name: "鱼香肉丝净菜包", type: "finished", category: "净菜包", unit: "份", cost: 7.8, price: 29.8, stock: 860, safetyStock: 600, taxRate: 6, tags: ["冷藏", "分隔组配", "肉类前处理"] },
          { id: ids.products.vegetables, code: "CP0003", name: "时蔬净菜包", type: "finished", category: "净菜包", unit: "份", cost: 4.4, price: 16.8, stock: 420, safetyStock: 500, taxRate: 6, tags: ["冷藏", "分隔组配", "蔬菜前处理"] },
          { id: ids.products.chicken, code: "RM01234", name: "冷冻鸡胸肉", type: "raw", category: "禽肉类", unit: "kg", cost: 20.7, stock: 120, safetyStock: 200, taxRate: 9, tags: ["冷冻", "核心原料"] },
          { id: ids.products.pork, code: "RM01235", name: "冷鲜猪里脊", type: "raw", category: "猪肉类", unit: "kg", cost: 31.8, stock: 86, safetyStock: 120, taxRate: 9, tags: ["冷藏"] },
          { id: ids.products.package, code: "PK0008", name: "净菜包装套装", type: "raw", category: "包装", unit: "套", cost: 1.46, price: 2.2, stock: 3200, safetyStock: 3000, taxRate: 13, tags: ["包装", "冷藏"] },
          { id: ids.products.peanuts, code: "RM02001", name: "花生米", type: "raw", category: "干货", unit: "kg", cost: 14, stock: 80, safetyStock: 30, taxRate: 9 },
          { id: ids.products.chili, code: "RM02002", name: "干辣椒段", type: "raw", category: "调味料", unit: "kg", cost: 16, stock: 36, safetyStock: 12, taxRate: 9 },
          { id: ids.products.aromatics, code: "RM02003", name: "葱姜蒜", type: "raw", category: "辅料", unit: "kg", cost: 11.2, stock: 52, safetyStock: 18, taxRate: 9 },
          { id: ids.products.sauce, code: "SF01012", name: "宫保调味汁", type: "semi", category: "半成品", unit: "kg", cost: 18.4, stock: 46, safetyStock: 60, taxRate: 9, tags: ["冷藏", "自制"] },
          { id: ids.products.soySauce, code: "RM03001", name: "生抽", type: "raw", category: "调味料", unit: "kg", cost: 9.8, stock: 100, safetyStock: 30, taxRate: 13 },
          { id: ids.products.vinegar, code: "RM03002", name: "香醋", type: "raw", category: "调味料", unit: "kg", cost: 8.6, stock: 80, safetyStock: 20, taxRate: 13 },
          { id: ids.products.sugar, code: "RM03003", name: "白砂糖", type: "raw", category: "调味料", unit: "kg", cost: 7.2, stock: 120, safetyStock: 30, taxRate: 13 },
          { id: ids.products.greens, code: "RM04001", name: "当日时蔬", type: "raw", category: "叶菜类", unit: "kg", cost: 8.4, stock: 65, safetyStock: 80, taxRate: 9 },
        ],
      },
      inventoryLocations: {
        create: inventoryLocationSeeds.map((location) => ({
          ...location,
          createdBy: "seed:demo-data",
        })),
      },
      documentNumbers: {
        create: [
          { kind: "SO", dateKey: "20260817", currentValue: 3 },
          { kind: "PD", dateKey: "20260817", currentValue: 1 },
        ],
      },
    },
  });

  const effectiveAt = new Date("2026-08-01T00:00:00+08:00");
  const seedVersionEvents = () => ({
    create: [
      {
        organizationId: ids.organization,
        type: "created" as const,
        actor: "seed:demo-data",
        revision: 1,
        createdAt: effectiveAt,
      },
      {
        organizationId: ids.organization,
        type: "published" as const,
        actor: "seed:demo-data",
        revision: 1,
        effectiveAt,
        createdAt: effectiveAt,
      },
    ],
  });
  await prisma.bom.create({
    data: {
      id: "30000000-0000-4000-8000-000000000001",
      organizationId: ids.organization,
      productId: ids.products.gongbao,
      code: "BOM-CP0001",
      versions: {
        create: {
          id: "40000000-0000-4000-8000-000000000001",
          version: "V2.1",
          outputQuantity: 1,
          outputUnit: "份",
          status: "effective",
          effectiveAt,
          publishedAt: effectiveAt,
          events: seedVersionEvents(),
          operations: {
            create: [
              { id: operationIds.gongbao.wash, code: "OP10", name: "低温解冻与来料确认", kind: "receive", sequence: 10, workCenter: "肉类前处理间", durationMinutes: 12, temperatureMin: 0, temperatureMax: 10, instructions: "核对批次与中心温度，在受控低温条件下解冻并沥水。" },
              { id: operationIds.gongbao.cut, code: "OP20", name: "修整切丁", kind: "cut", sequence: 20, workCenter: "肉类切配间", durationMinutes: 8, temperatureMax: 12, instructions: "去除筋膜并切为约 15 mm 均匀鸡丁。" },
              { id: operationIds.gongbao.marinate, code: "OP30", name: "低温腌制", kind: "marinate", sequence: 30, workCenter: "低温腌制间", durationMinutes: 5, waitMinutes: 20, temperatureMin: 0, temperatureMax: 4, instructions: "加入调味汁拌匀，冷藏静置 20 分钟。" },
              { id: operationIds.gongbao.assemble, code: "OP40", name: "辅料称重组配", kind: "mix", sequence: 40, workCenter: "净菜组配间", durationMinutes: 8, temperatureMax: 12, instructions: "按份称量花生米、干辣椒段与葱姜蒜，并与肉类原料分隔组配。" },
              { id: operationIds.gongbao.pack, code: "OP50", name: "分装贴标", kind: "pack", sequence: 50, workCenter: "净菜包装间", durationMinutes: 6, temperatureMax: 12, instructions: "复核净重、批次和标签后封装，转入冷藏。" },
            ],
          },
          items: {
            create: [
              { operationId: operationIds.gongbao.wash, componentProductId: ids.products.chicken, netQuantity: 0.12, yieldRate: 0.95, unit: "kg", unitCostSnapshot: 20.7, sortOrder: 0 },
              { operationId: operationIds.gongbao.assemble, componentProductId: ids.products.peanuts, netQuantity: 0.018, yieldRate: 0.98, unit: "kg", unitCostSnapshot: 14, sortOrder: 1 },
              { operationId: operationIds.gongbao.assemble, componentProductId: ids.products.chili, netQuantity: 0.006, yieldRate: 0.97, unit: "kg", unitCostSnapshot: 16, sortOrder: 2 },
              { operationId: operationIds.gongbao.assemble, componentProductId: ids.products.aromatics, netQuantity: 0.01, yieldRate: 0.96, unit: "kg", unitCostSnapshot: 11.2, sortOrder: 3 },
              { operationId: operationIds.gongbao.marinate, componentProductId: ids.products.sauce, netQuantity: 0.03, yieldRate: 1, unit: "kg", unitCostSnapshot: 18.4, sortOrder: 4 },
              { operationId: operationIds.gongbao.pack, componentProductId: ids.products.package, netQuantity: 1, yieldRate: 1, unit: "套", unitCostSnapshot: 1.46, sortOrder: 5 },
            ],
          },
        },
      },
    },
  });

  await prisma.bom.create({
    data: {
      id: "30000000-0000-4000-8000-000000000002",
      organizationId: ids.organization,
      productId: ids.products.sauce,
      code: "BOM-SF01012",
      versions: {
        create: {
          id: "40000000-0000-4000-8000-000000000002",
          version: "V1.0",
          outputQuantity: 1,
          outputUnit: "kg",
          status: "effective",
          effectiveAt,
          publishedAt: effectiveAt,
          events: seedVersionEvents(),
          operations: {
            create: [
              { id: operationIds.sauce.mix, code: "OP10", name: "称量混合", kind: "mix", sequence: 10, workCenter: "调味品预制间", durationMinutes: 8, instructions: "按顺序称量并搅拌至白砂糖溶解。" },
              { id: operationIds.sauce.quality, code: "OP20", name: "质量确认", kind: "quality", sequence: 20, workCenter: "调味品预制间", durationMinutes: 3, instructions: "确认外观、重量和批次标签。" },
            ],
          },
          items: {
            create: [
              { operationId: operationIds.sauce.mix, componentProductId: ids.products.soySauce, netQuantity: 0.45, yieldRate: 1, unit: "kg", unitCostSnapshot: 9.8, sortOrder: 0 },
              { operationId: operationIds.sauce.mix, componentProductId: ids.products.vinegar, netQuantity: 0.25, yieldRate: 1, unit: "kg", unitCostSnapshot: 8.6, sortOrder: 1 },
              { operationId: operationIds.sauce.mix, componentProductId: ids.products.sugar, netQuantity: 0.3, yieldRate: 1, unit: "kg", unitCostSnapshot: 7.2, sortOrder: 2 },
            ],
          },
        },
      },
    },
  });

  await prisma.bom.create({
    data: {
      id: "30000000-0000-4000-8000-000000000003",
      organizationId: ids.organization,
      productId: ids.products.yuxiang,
      code: "BOM-CP0002",
      versions: {
        create: {
          id: "40000000-0000-4000-8000-000000000003",
          version: "V1.0",
          outputQuantity: 1,
          outputUnit: "份",
          status: "effective",
          effectiveAt,
          publishedAt: effectiveAt,
          events: seedVersionEvents(),
          operations: {
            create: [
              { id: operationIds.yuxiang.wash, code: "OP10", name: "来料与温度确认", kind: "receive", sequence: 10, workCenter: "肉类前处理间", durationMinutes: 6, temperatureMin: 0, temperatureMax: 4, instructions: "核对肉品批次、感官与中心温度。" },
              { id: operationIds.yuxiang.cut, code: "OP20", name: "修整切丝", kind: "cut", sequence: 20, workCenter: "肉类切配间", durationMinutes: 8, temperatureMax: 12, instructions: "去除筋膜并切为规格均匀的肉丝。" },
              { id: operationIds.yuxiang.marinate, code: "OP30", name: "低温腌制", kind: "marinate", sequence: 30, workCenter: "低温腌制间", durationMinutes: 5, waitMinutes: 15, temperatureMin: 0, temperatureMax: 4, instructions: "辅料拌匀后冷藏静置 15 分钟。" },
              { id: operationIds.yuxiang.assemble, code: "OP40", name: "辅料称重组配", kind: "mix", sequence: 40, workCenter: "净菜组配间", durationMinutes: 7, temperatureMax: 12, instructions: "按份称量辅料，并与肉丝分隔组配。" },
              { id: operationIds.yuxiang.pack, code: "OP50", name: "分装贴标", kind: "pack", sequence: 50, workCenter: "净菜包装间", durationMinutes: 6, temperatureMax: 12, instructions: "按标准份量分装，复核批次与标签后转冷藏。" },
            ],
          },
          items: {
            create: [
              { operationId: operationIds.yuxiang.wash, componentProductId: ids.products.pork, netQuantity: 0.11, yieldRate: 0.92, unit: "kg", unitCostSnapshot: 31.8, sortOrder: 0 },
              { operationId: operationIds.yuxiang.assemble, componentProductId: ids.products.aromatics, netQuantity: 0.015, yieldRate: 0.96, unit: "kg", unitCostSnapshot: 11.2, sortOrder: 1 },
              { operationId: operationIds.yuxiang.pack, componentProductId: ids.products.package, netQuantity: 1, yieldRate: 1, unit: "套", unitCostSnapshot: 1.46, sortOrder: 2 },
            ],
          },
        },
      },
    },
  });

  await prisma.bom.create({
    data: {
      id: "30000000-0000-4000-8000-000000000004",
      organizationId: ids.organization,
      productId: ids.products.vegetables,
      code: "BOM-CP0003",
      versions: {
        create: {
          id: "40000000-0000-4000-8000-000000000004",
          version: "V1.0",
          outputQuantity: 1,
          outputUnit: "份",
          status: "effective",
          effectiveAt,
          publishedAt: effectiveAt,
          events: seedVersionEvents(),
          operations: {
            create: [
              { id: operationIds.vegetables.wash, code: "OP10", name: "挑拣清洗", kind: "wash", sequence: 10, workCenter: "蔬菜前处理间", durationMinutes: 12, instructions: "去除不可食部分，按标准水洗并沥水。" },
              { id: operationIds.vegetables.cut, code: "OP20", name: "沥水切配", kind: "cut", sequence: 20, workCenter: "蔬菜切配间", durationMinutes: 8, temperatureMax: 15, instructions: "按净菜规格切配，控制交叉污染。" },
              { id: operationIds.vegetables.quality, code: "OP30", name: "复核称重", kind: "quality", sequence: 30, workCenter: "净菜组配间", durationMinutes: 4, instructions: "复核规格、净重、感官状态和可见异物。" },
              { id: operationIds.vegetables.pack, code: "OP40", name: "分装贴标", kind: "pack", sequence: 40, workCenter: "净菜包装间", durationMinutes: 5, temperatureMax: 12, instructions: "称重封装，核对批次标签后转入冷藏。" },
            ],
          },
          items: {
            create: [
              { operationId: operationIds.vegetables.wash, componentProductId: ids.products.greens, netQuantity: 0.22, yieldRate: 0.9, unit: "kg", unitCostSnapshot: 8.4, sortOrder: 0 },
              { operationId: operationIds.vegetables.quality, componentProductId: ids.products.aromatics, netQuantity: 0.008, yieldRate: 0.96, unit: "kg", unitCostSnapshot: 11.2, sortOrder: 1 },
              { operationId: operationIds.vegetables.pack, componentProductId: ids.products.package, netQuantity: 1, yieldRate: 1, unit: "套", unitCostSnapshot: 1.46, sortOrder: 2 },
            ],
          },
        },
      },
    },
  });

  const orderSeeds = [
    { id: "50000000-0000-4000-8000-000000000001", code: "SO202608170001", customerIndex: 0, deliveryAt: "2026-08-18T11:00:00+08:00", status: "approved" as const, productId: ids.products.gongbao, quantity: 1200, productCode: "CP0001", productName: "宫保鸡丁净菜包", unitPrice: 32.5 },
    { id: "50000000-0000-4000-8000-000000000002", code: "SO202608170002", customerIndex: 1, deliveryAt: "2026-08-18T14:30:00+08:00", status: "pending" as const, productId: ids.products.yuxiang, quantity: 600, productCode: "CP0002", productName: "鱼香肉丝净菜包", unitPrice: 29.8 },
    { id: "50000000-0000-4000-8000-000000000003", code: "SO202608170003", customerIndex: 2, deliveryAt: "2026-08-19T11:30:00+08:00", status: "draft" as const, productId: ids.products.vegetables, quantity: 500, productCode: "CP0003", productName: "时蔬净菜包", unitPrice: 16.8 },
  ];
  const customerSnapshots = [
    { name: "华润万家深圳福田店", contact: "张店长", phone: "138 0000 8888", address: "深圳市福田区深南大道2008号" },
    { name: "盒马鲜生南山店", contact: "李经理", phone: "137 1020 6688", address: "深圳市南山区科苑路15号" },
    { name: "招商银行深圳分行", contact: "王主管", phone: "136 2208 5166", address: "深圳市福田区深南大道7088号" },
  ];
  for (const [index, order] of orderSeeds.entries()) {
    const customer = customerSnapshots[index];
    const createdOrder = await prisma.salesOrder.create({
      data: {
        id: order.id,
        organizationId: ids.organization,
        code: order.code,
        customerId: ids.customers[order.customerIndex],
        customerName: customer.name,
        deliveryAt: new Date(order.deliveryAt),
        status: order.status,
        source: "manual",
        contact: customer.contact,
        phone: customer.phone,
        address: customer.address,
        lines: { create: { productId: order.productId, productCode: order.productCode, productName: order.productName, quantity: order.quantity, unit: "份", unitPrice: order.unitPrice } },
        events: {
          create: [
            { type: "created", label: "创建订单", actor: "演示用户" },
            ...(order.status !== "draft" ? [{ type: "submitted" as const, label: "提交审核", actor: "演示用户" }] : []),
            ...(order.status === "approved" ? [{ type: "approved" as const, label: "审核通过", actor: "演示用户" }] : []),
          ],
        },
      },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });
    if (order.status === "approved") {
      const selectedBomVersionByProduct: Record<string, { id: string; version: string }> = {
        [ids.products.gongbao]: { id: "40000000-0000-4000-8000-000000000001", version: "V2.1" },
        [ids.products.yuxiang]: { id: "40000000-0000-4000-8000-000000000003", version: "V1.0" },
        [ids.products.vegetables]: { id: "40000000-0000-4000-8000-000000000004", version: "V1.0" },
      };
      const capturedAt = createdOrder.updatedAt;
      const recipeSnapshots = await Promise.all(
        createdOrder.lines.map((line) => captureRecipeSnapshot(line.productId, createdOrder.deliveryAt, capturedAt)),
      );
      await prisma.productionDemand.create({
        data: {
          organizationId: ids.organization,
          code: "PD202608170001",
          salesOrderId: createdOrder.id,
          factoryCode: "SZ-CENTRAL",
          factoryName: "深圳中央工厂",
          requiredAt: createdOrder.deliveryAt,
          status: "pending_planning",
          approvedAt: createdOrder.updatedAt,
          lines: {
            create: createdOrder.lines.map((line, lineIndex) => {
              const selectedVersion = selectedBomVersionByProduct[line.productId];
              return {
                salesOrderLineId: line.id,
                productId: line.productId,
                productCode: line.productCode,
                productName: line.productName,
                requiredQuantity: line.quantity,
                unit: line.unit,
                selectedBomVersionId: selectedVersion?.id,
                bomVersionSnapshot: selectedVersion?.version,
                recipeSnapshot: recipeSnapshots[lineIndex],
                sortOrder: lineIndex,
              };
            }),
          },
        },
      });
    }
  }

  console.log("Nora 本地演示数据初始化完成。");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
