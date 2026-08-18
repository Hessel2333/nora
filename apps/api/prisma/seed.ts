import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

config({ path: "../../.env" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 未配置");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const ids = {
  organization: "00000000-0000-4000-8000-000000000001",
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

async function main() {
  const exists = await prisma.organization.findUnique({ where: { code: "NORA-DEMO" } });
  if (exists) {
    console.log("Nora 本地演示数据已存在，跳过 Seed。");
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
          { id: ids.products.gongbao, code: "CP0001", name: "宫保鸡丁", type: "finished", category: "热菜", unit: "份", cost: 8.62, price: 32.5, stock: 1260, safetyStock: 800, taxRate: 6, tags: ["川菜", "热菜", "高蛋白"] },
          { id: ids.products.yuxiang, code: "CP0002", name: "鱼香肉丝", type: "finished", category: "热菜", unit: "份", cost: 7.8, price: 29.8, stock: 860, safetyStock: 600, taxRate: 6, tags: ["川菜", "热菜"] },
          { id: ids.products.vegetables, code: "CP0003", name: "清炒时蔬", type: "finished", category: "热菜", unit: "份", cost: 4.4, price: 16.8, stock: 420, safetyStock: 500, taxRate: 6, tags: ["素食", "时蔬"] },
          { id: ids.products.chicken, code: "RM01234", name: "冷冻鸡胸肉", type: "raw", category: "禽肉类", unit: "kg", cost: 20.7, stock: 120, safetyStock: 200, taxRate: 9, tags: ["冷冻", "核心原料"] },
          { id: ids.products.pork, code: "RM01235", name: "冷鲜猪里脊", type: "raw", category: "猪肉类", unit: "kg", cost: 31.8, stock: 86, safetyStock: 120, taxRate: 9, tags: ["冷藏"] },
          { id: ids.products.package, code: "PK0008", name: "标准餐盒套装", type: "raw", category: "包装", unit: "套", cost: 1.46, price: 2.2, stock: 3200, safetyStock: 3000, taxRate: 13, tags: ["包装"] },
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
      documentNumbers: {
        create: [
          { kind: "SO", dateKey: "20260817", currentValue: 3 },
          { kind: "PD", dateKey: "20260817", currentValue: 1 },
        ],
      },
    },
  });

  const effectiveAt = new Date("2026-08-01T00:00:00+08:00");
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
          items: {
            create: [
              { componentProductId: ids.products.chicken, netQuantity: 0.12, yieldRate: 0.95, unit: "kg", unitCostSnapshot: 20.7, sortOrder: 0 },
              { componentProductId: ids.products.peanuts, netQuantity: 0.018, yieldRate: 0.98, unit: "kg", unitCostSnapshot: 14, sortOrder: 1 },
              { componentProductId: ids.products.chili, netQuantity: 0.006, yieldRate: 0.97, unit: "kg", unitCostSnapshot: 16, sortOrder: 2 },
              { componentProductId: ids.products.aromatics, netQuantity: 0.01, yieldRate: 0.96, unit: "kg", unitCostSnapshot: 11.2, sortOrder: 3 },
              { componentProductId: ids.products.sauce, netQuantity: 0.03, yieldRate: 1, unit: "kg", unitCostSnapshot: 18.4, sortOrder: 4 },
              { componentProductId: ids.products.package, netQuantity: 1, yieldRate: 1, unit: "套", unitCostSnapshot: 1.46, sortOrder: 5 },
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
          items: {
            create: [
              { componentProductId: ids.products.soySauce, netQuantity: 0.45, yieldRate: 1, unit: "kg", unitCostSnapshot: 9.8, sortOrder: 0 },
              { componentProductId: ids.products.vinegar, netQuantity: 0.25, yieldRate: 1, unit: "kg", unitCostSnapshot: 8.6, sortOrder: 1 },
              { componentProductId: ids.products.sugar, netQuantity: 0.3, yieldRate: 1, unit: "kg", unitCostSnapshot: 7.2, sortOrder: 2 },
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
          items: {
            create: [
              { componentProductId: ids.products.pork, netQuantity: 0.11, yieldRate: 0.92, unit: "kg", unitCostSnapshot: 31.8, sortOrder: 0 },
              { componentProductId: ids.products.aromatics, netQuantity: 0.015, yieldRate: 0.96, unit: "kg", unitCostSnapshot: 11.2, sortOrder: 1 },
              { componentProductId: ids.products.package, netQuantity: 1, yieldRate: 1, unit: "套", unitCostSnapshot: 1.46, sortOrder: 2 },
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
          items: {
            create: [
              { componentProductId: ids.products.greens, netQuantity: 0.22, yieldRate: 0.9, unit: "kg", unitCostSnapshot: 8.4, sortOrder: 0 },
              { componentProductId: ids.products.aromatics, netQuantity: 0.008, yieldRate: 0.96, unit: "kg", unitCostSnapshot: 11.2, sortOrder: 1 },
              { componentProductId: ids.products.package, netQuantity: 1, yieldRate: 1, unit: "套", unitCostSnapshot: 1.46, sortOrder: 2 },
            ],
          },
        },
      },
    },
  });

  const orderSeeds = [
    { id: "50000000-0000-4000-8000-000000000001", code: "SO202608170001", customerIndex: 0, deliveryAt: "2026-08-18T11:00:00+08:00", status: "approved" as const, productId: ids.products.gongbao, quantity: 1200, productCode: "CP0001", productName: "宫保鸡丁", unitPrice: 32.5 },
    { id: "50000000-0000-4000-8000-000000000002", code: "SO202608170002", customerIndex: 1, deliveryAt: "2026-08-18T14:30:00+08:00", status: "pending" as const, productId: ids.products.yuxiang, quantity: 600, productCode: "CP0002", productName: "鱼香肉丝", unitPrice: 29.8 },
    { id: "50000000-0000-4000-8000-000000000003", code: "SO202608170003", customerIndex: 2, deliveryAt: "2026-08-19T11:30:00+08:00", status: "draft" as const, productId: ids.products.vegetables, quantity: 500, productCode: "CP0003", productName: "清炒时蔬", unitPrice: 16.8 },
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
