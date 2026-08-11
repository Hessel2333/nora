export type MrpNodeType = "order" | "dish" | "semi" | "raw";
export type SupplyStatus = "normal" | "tight" | "shortage";

export interface OrderScenario {
  id: string;
  code: string;
  customer: string;
  deliveryAt: string;
  demandNo: string;
  factor: number;
}

export interface BomGraphNode {
  id: string;
  name: string;
  code: string;
  type: MrpNodeType;
  amount: number;
  unit: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: SupplyStatus;
  onHand?: number;
  allocated?: number;
  shortage?: number;
  yieldRate?: number;
  unitCost?: number;
  description: string;
}

export interface BomGraphEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  unit: string;
  formula: string;
  cost: number;
}

export interface BomTableRow {
  id: string;
  entityId: string;
  parentId: string | null;
  level: number;
  name: string;
  code: string;
  type: MrpNodeType;
  net: number | null;
  gross: number | null;
  unit: string;
  yieldRate: number | null;
  onHand: number | null;
  allocated: number | null;
  shortage: number | null;
  unitCost: number | null;
  formula: string;
  childCount: number;
}

export interface OrderWorkspace {
  scenario: OrderScenario;
  nodes: BomGraphNode[];
  edges: BomGraphEdge[];
  rows: BomTableRow[];
  summary: {
    portions: number;
    rawMaterialKinds: number;
    grossKg: number;
    shortageKg: number;
    estimatedCost: number;
  };
}

export interface DemandContribution {
  id: string;
  source: string;
  amount: number;
  orderCount: number;
  formula: string;
}

export interface DemandMaterial {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  demand: number;
  onHand: number;
  allocated: number;
  unitCost: number;
  leadTime: string;
  excludedFromWeightFlow?: boolean;
  contributions: DemandContribution[];
}

export interface DateScenario {
  id: string;
  label: string;
  weekday: string;
  orderCount: number;
  portions: number;
  multiplier: number;
}

export interface SankeyNode {
  name: string;
  depth: number;
  itemStyle?: { color: string };
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface DemandWorkspace {
  scenario: DateScenario;
  materials: DemandMaterial[];
  sankeyNodes: SankeyNode[];
  sankeyLinks: SankeyLink[];
  nameToMaterialId: Record<string, string>;
  summary: {
    grossKg: number;
    availableKg: number;
    shortageKg: number;
    shortageKinds: number;
    purchaseAmount: number;
  };
}

const round = (value: number, digits = 1) => {
  const multiple = 10 ** digits;
  return Math.round(value * multiple) / multiple;
};

const scale = (value: number, factor: number) => round(value * factor);

export const ORDER_SCENARIOS: OrderScenario[] = [
  {
    id: "o-018",
    code: "SO202608060018",
    customer: "华润万家深圳福田店",
    deliveryAt: "2026-08-06 11:00",
    demandNo: "SC20260806-018",
    factor: 1,
  },
  {
    id: "o-021",
    code: "SO202608060021",
    customer: "招商银行深圳分行",
    deliveryAt: "2026-08-06 12:00",
    demandNo: "SC20260806-021",
    factor: 0.65,
  },
];

type BaseNode = Omit<BomGraphNode, "amount" | "onHand" | "allocated" | "shortage"> & {
  amount: number;
  onHand?: number;
  allocated?: number;
};

const BASE_NODES: BaseNode[] = [
  { id: "order", name: "订单需求", code: "SC20260806-018", type: "order", amount: 2000, unit: "份", x: 24, y: 286, width: 202, height: 96, status: "normal", description: "订单审核后形成的独立生产需求" },
  { id: "dish-gongbao", name: "宫保鸡丁", code: "CP0001", type: "dish", amount: 1200, unit: "份", x: 288, y: 132, width: 204, height: 86, status: "normal", description: "热菜成品 · BOM V2.1" },
  { id: "dish-yuxiang", name: "鱼香肉丝", code: "CP0002", type: "dish", amount: 800, unit: "份", x: 288, y: 424, width: 204, height: 86, status: "normal", description: "热菜成品 · BOM V1.8" },
  { id: "semi-chicken", name: "腌制鸡肉丁", code: "SF01012", type: "semi", amount: 180, unit: "kg", x: 566, y: 42, width: 212, height: 86, status: "normal", yieldRate: 0.88, unitCost: 24.2, description: "肉类前处理 · 自制半成品" },
  { id: "semi-gongbao-sauce", name: "宫保调味汁", code: "SF02008", type: "semi", amount: 72, unit: "kg", x: 566, y: 188, width: 212, height: 86, status: "normal", yieldRate: 0.96, unitCost: 18.4, description: "调味间 · 共用料汁" },
  { id: "semi-pork", name: "腌制猪肉丝", code: "SF01018", type: "semi", amount: 128, unit: "kg", x: 566, y: 388, width: 212, height: 86, status: "normal", yieldRate: 0.88, unitCost: 22.6, description: "肉类前处理 · 自制半成品" },
  { id: "semi-yuxiang-sauce", name: "鱼香调味汁", code: "SF02011", type: "semi", amount: 56, unit: "kg", x: 566, y: 534, width: 212, height: 86, status: "normal", yieldRate: 0.96, unitCost: 17.8, description: "调味间 · 共用料汁" },
  { id: "raw-chicken", name: "冷冻鸡胸肉", code: "RM01234", type: "raw", amount: 204.5, unit: "kg", x: 928, y: 2, width: 218, height: 68, status: "shortage", onHand: 148, allocated: 28, unitCost: 20.7, yieldRate: 0.88, description: "禽肉类 · 冷冻库 A-03" },
  { id: "raw-starch", name: "腌制淀粉", code: "RM03018", type: "raw", amount: 12.6, unit: "kg", x: 928, y: 78, width: 218, height: 68, status: "normal", onHand: 36, allocated: 4, unitCost: 8.2, yieldRate: 1, description: "干货调料 · 常温库 C-06" },
  { id: "raw-sauce", name: "复合酱汁基料", code: "RM03026", type: "raw", amount: 96, unit: "kg", x: 928, y: 154, width: 218, height: 68, status: "normal", onHand: 142, allocated: 18, unitCost: 13.8, yieldRate: 1, description: "调料类 · 冷藏库 B-02" },
  { id: "raw-chili", name: "干辣椒段", code: "RM03110", type: "raw", amount: 18, unit: "kg", x: 928, y: 230, width: 218, height: 68, status: "normal", onHand: 31, allocated: 5, unitCost: 16, yieldRate: 0.97, description: "香辛料 · 常温库 C-02" },
  { id: "raw-pork", name: "冷鲜猪后腿肉", code: "RM01108", type: "raw", amount: 145.5, unit: "kg", x: 928, y: 306, width: 218, height: 68, status: "normal", onHand: 204, allocated: 28, unitCost: 19.6, yieldRate: 0.88, description: "畜肉类 · 冷藏库 B-01" },
  { id: "raw-bamboo", name: "鲜冬笋丝", code: "RM02116", type: "raw", amount: 64, unit: "kg", x: 928, y: 382, width: 218, height: 68, status: "shortage", onHand: 58, allocated: 8, unitCost: 12.8, yieldRate: 0.9, description: "蔬菜类 · 冷藏库 B-06" },
  { id: "raw-carrot", name: "胡萝卜丝", code: "RM02032", type: "raw", amount: 52, unit: "kg", x: 928, y: 458, width: 218, height: 68, status: "normal", onHand: 86, allocated: 14, unitCost: 4.2, yieldRate: 0.9, description: "根茎类 · 冷藏库 B-08" },
  { id: "raw-garlic", name: "葱姜蒜净料", code: "RM03004", type: "raw", amount: 28, unit: "kg", x: 928, y: 534, width: 218, height: 68, status: "shortage", onHand: 27, allocated: 7, unitCost: 11.2, yieldRate: 0.96, description: "净配调料 · 冷藏库 B-09" },
  { id: "raw-peanut", name: "花生米", code: "RM03108", type: "raw", amount: 48, unit: "kg", x: 928, y: 610, width: 218, height: 68, status: "shortage", onHand: 42, allocated: 6, unitCost: 14, yieldRate: 0.98, description: "干货类 · 常温库 C-03" },
];

const BASE_EDGES: BomGraphEdge[] = [
  { id: "e-order-gongbao", source: "order", target: "dish-gongbao", amount: 1200, unit: "份", formula: "订单明细 1,200份", cost: 39000 },
  { id: "e-order-yuxiang", source: "order", target: "dish-yuxiang", amount: 800, unit: "份", formula: "订单明细 800份", cost: 23840 },
  { id: "e-gongbao-chicken", source: "dish-gongbao", target: "semi-chicken", amount: 180, unit: "kg", formula: "1,200份 × 0.150kg", cost: 4356 },
  { id: "e-gongbao-sauce", source: "dish-gongbao", target: "semi-gongbao-sauce", amount: 72, unit: "kg", formula: "1,200份 × 0.060kg", cost: 1324.8 },
  { id: "e-gongbao-peanut", source: "dish-gongbao", target: "raw-peanut", amount: 48, unit: "kg", formula: "1,200份 × 0.0392kg ÷ 98%", cost: 672 },
  { id: "e-chicken-raw", source: "semi-chicken", target: "raw-chicken", amount: 204.5, unit: "kg", formula: "180kg ÷ 88%", cost: 4233.2 },
  { id: "e-chicken-starch", source: "semi-chicken", target: "raw-starch", amount: 12.6, unit: "kg", formula: "180kg × 0.070kg", cost: 103.3 },
  { id: "e-gbs-sauce", source: "semi-gongbao-sauce", target: "raw-sauce", amount: 54, unit: "kg", formula: "72kg × 75%", cost: 745.2 },
  { id: "e-gbs-chili", source: "semi-gongbao-sauce", target: "raw-chili", amount: 18, unit: "kg", formula: "72kg × 25%", cost: 288 },
  { id: "e-gbs-garlic", source: "semi-gongbao-sauce", target: "raw-garlic", amount: 12, unit: "kg", formula: "72kg × 16.7%", cost: 134.4 },
  { id: "e-yuxiang-pork", source: "dish-yuxiang", target: "semi-pork", amount: 128, unit: "kg", formula: "800份 × 0.160kg", cost: 2892.8 },
  { id: "e-yuxiang-sauce", source: "dish-yuxiang", target: "semi-yuxiang-sauce", amount: 56, unit: "kg", formula: "800份 × 0.070kg", cost: 996.8 },
  { id: "e-yuxiang-bamboo", source: "dish-yuxiang", target: "raw-bamboo", amount: 64, unit: "kg", formula: "800份 × 0.072kg ÷ 90%", cost: 819.2 },
  { id: "e-yuxiang-carrot", source: "dish-yuxiang", target: "raw-carrot", amount: 52, unit: "kg", formula: "800份 × 0.0585kg ÷ 90%", cost: 218.4 },
  { id: "e-pork-raw", source: "semi-pork", target: "raw-pork", amount: 145.5, unit: "kg", formula: "128kg ÷ 88%", cost: 2851.8 },
  { id: "e-yxs-sauce", source: "semi-yuxiang-sauce", target: "raw-sauce", amount: 42, unit: "kg", formula: "56kg × 75%", cost: 579.6 },
  { id: "e-yxs-garlic", source: "semi-yuxiang-sauce", target: "raw-garlic", amount: 16, unit: "kg", formula: "56kg × 28.6%", cost: 179.2 },
];

const childCountByParent = (rows: Array<Omit<BomTableRow, "childCount">>) => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    if (row.parentId) counts.set(row.parentId, (counts.get(row.parentId) ?? 0) + 1);
  });
  return rows.map((row) => ({ ...row, childCount: counts.get(row.id) ?? 0 }));
};

function createBaseRows(factor: number, scenario: OrderScenario): BomTableRow[] {
  const row = (
    id: string,
    entityId: string,
    parentId: string | null,
    level: number,
    name: string,
    code: string,
    type: MrpNodeType,
    net: number | null,
    gross: number | null,
    unit: string,
    yieldRate: number | null,
    onHand: number | null,
    allocated: number | null,
    unitCost: number | null,
    formula: string,
  ): Omit<BomTableRow, "childCount"> => {
    const scaledNet = net === null ? null : scale(net, factor);
    const scaledGross = gross === null ? null : scale(gross, factor);
    const shortage = scaledGross === null || onHand === null ? null : Math.max(0, round(scaledGross - Math.max(0, onHand - (allocated ?? 0))));
    return { id, entityId, parentId, level, name, code, type, net: scaledNet, gross: scaledGross, unit, yieldRate, onHand, allocated, shortage, unitCost, formula, };
  };

  return childCountByParent([
    row("row-order", "order", null, 0, scenario.code, scenario.demandNo, "order", 2000, 2000, "份", 1, null, null, null, `${scenario.customer} · ${scenario.deliveryAt}`),
    row("row-gongbao", "dish-gongbao", "row-order", 1, "宫保鸡丁", "CP0001", "dish", 1200, 1200, "份", 1, null, null, 18.62, "订单明细 × 标准份量"),
    row("row-semi-chicken", "semi-chicken", "row-gongbao", 2, "腌制鸡肉丁", "SF01012", "semi", 180, 180, "kg", 0.88, 46, 8, 24.2, "1,200份 × 0.150kg"),
    row("row-raw-chicken", "raw-chicken", "row-semi-chicken", 3, "冷冻鸡胸肉", "RM01234", "raw", 180, 204.5, "kg", 0.88, 148, 28, 20.7, "180kg ÷ 88%"),
    row("row-raw-starch", "raw-starch", "row-semi-chicken", 3, "腌制淀粉", "RM03018", "raw", 12.6, 12.6, "kg", 1, 36, 4, 8.2, "180kg × 7%"),
    row("row-gongbao-sauce", "semi-gongbao-sauce", "row-gongbao", 2, "宫保调味汁", "SF02008", "semi", 72, 72, "kg", 0.96, 22, 2, 18.4, "1,200份 × 0.060kg"),
    row("row-gbs-sauce", "raw-sauce", "row-gongbao-sauce", 3, "复合酱汁基料", "RM03026", "raw", 54, 54, "kg", 1, 142, 18, 13.8, "72kg × 75%"),
    row("row-gbs-chili", "raw-chili", "row-gongbao-sauce", 3, "干辣椒段", "RM03110", "raw", 17.5, 18, "kg", 0.97, 31, 5, 16, "17.5kg ÷ 97%"),
    row("row-gbs-garlic", "raw-garlic", "row-gongbao-sauce", 3, "葱姜蒜净料", "RM03004", "raw", 11.5, 12, "kg", 0.96, 27, 7, 11.2, "11.5kg ÷ 96%"),
    row("row-peanut", "raw-peanut", "row-gongbao", 2, "花生米", "RM03108", "raw", 47, 48, "kg", 0.98, 42, 6, 14, "1,200份 × 0.0392kg ÷ 98%"),
    row("row-yuxiang", "dish-yuxiang", "row-order", 1, "鱼香肉丝", "CP0002", "dish", 800, 800, "份", 1, null, null, 16.8, "订单明细 × 标准份量"),
    row("row-semi-pork", "semi-pork", "row-yuxiang", 2, "腌制猪肉丝", "SF01018", "semi", 128, 128, "kg", 0.88, 38, 5, 22.6, "800份 × 0.160kg"),
    row("row-raw-pork", "raw-pork", "row-semi-pork", 3, "冷鲜猪后腿肉", "RM01108", "raw", 128, 145.5, "kg", 0.88, 204, 28, 19.6, "128kg ÷ 88%"),
    row("row-yuxiang-sauce", "semi-yuxiang-sauce", "row-yuxiang", 2, "鱼香调味汁", "SF02011", "semi", 56, 56, "kg", 0.96, 18, 4, 17.8, "800份 × 0.070kg"),
    row("row-yxs-sauce", "raw-sauce", "row-yuxiang-sauce", 3, "复合酱汁基料", "RM03026", "raw", 42, 42, "kg", 1, 142, 18, 13.8, "56kg × 75%"),
    row("row-yxs-garlic", "raw-garlic", "row-yuxiang-sauce", 3, "葱姜蒜净料", "RM03004", "raw", 15.4, 16, "kg", 0.96, 27, 7, 11.2, "15.4kg ÷ 96%"),
    row("row-bamboo", "raw-bamboo", "row-yuxiang", 2, "鲜冬笋丝", "RM02116", "raw", 57.6, 64, "kg", 0.9, 58, 8, 12.8, "800份 × 0.072kg ÷ 90%"),
    row("row-carrot", "raw-carrot", "row-yuxiang", 2, "胡萝卜丝", "RM02032", "raw", 46.8, 52, "kg", 0.9, 86, 14, 4.2, "800份 × 0.0585kg ÷ 90%"),
  ]);
}

export function createOrderWorkspace(orderId: string): OrderWorkspace {
  const scenario = ORDER_SCENARIOS.find((item) => item.id === orderId) ?? ORDER_SCENARIOS[0];
  const nodes = BASE_NODES.map((node) => {
    const amount = scale(node.amount, scenario.factor);
    const available = node.onHand === undefined ? undefined : Math.max(0, node.onHand - (node.allocated ?? 0));
    const shortage = available === undefined || node.type !== "raw" ? undefined : Math.max(0, round(amount - available));
    const status: SupplyStatus = shortage && shortage > 0 ? "shortage" : available !== undefined && available < amount * 1.15 ? "tight" : node.status === "shortage" ? "normal" : node.status;
    return {
      ...node,
      code: node.id === "order" ? scenario.demandNo : node.code,
      amount,
      shortage,
      status,
    };
  });
  const edges = BASE_EDGES.map((edge) => ({ ...edge, amount: scale(edge.amount, scenario.factor), cost: round(edge.cost * scenario.factor, 2) }));
  const rawNodes = nodes.filter((node) => node.type === "raw");
  const grossKg = round(rawNodes.reduce((sum, node) => sum + node.amount, 0));
  const shortageKg = round(rawNodes.reduce((sum, node) => sum + (node.shortage ?? 0), 0));
  const estimatedCost = round(rawNodes.reduce((sum, node) => sum + node.amount * (node.unitCost ?? 0), 0), 2);
  return {
    scenario,
    nodes,
    edges,
    rows: createBaseRows(scenario.factor, scenario),
    summary: {
      portions: Math.round(2000 * scenario.factor),
      rawMaterialKinds: rawNodes.length,
      grossKg,
      shortageKg,
      estimatedCost,
    },
  };
}

export const DATE_SCENARIOS: DateScenario[] = [
  { id: "2026-08-06", label: "8月6日", weekday: "周四", orderCount: 8, portions: 5600, multiplier: 1 },
  { id: "2026-08-07", label: "8月7日", weekday: "周五", orderCount: 6, portions: 4592, multiplier: 0.82 },
  { id: "2026-08-08", label: "8月8日", weekday: "周六", orderCount: 11, portions: 6608, multiplier: 1.18 },
];

const BASE_MATERIALS: DemandMaterial[] = [
  { id: "raw-chicken", code: "RM01234", name: "冷冻鸡胸肉", category: "禽肉类", unit: "kg", demand: 476, onHand: 360, allocated: 42, unitCost: 20.7, leadTime: "4小时", contributions: [{ id: "c-chicken-gongbao", source: "宫保鸡丁", amount: 476, orderCount: 3, formula: "2,100份 × 标准净用量 ÷ 88%" }] },
  { id: "raw-pork", code: "RM01108", name: "冷鲜猪后腿肉", category: "畜肉类", unit: "kg", demand: 340, onHand: 438, allocated: 48, unitCost: 19.6, leadTime: "6小时", contributions: [{ id: "c-pork-yuxiang", source: "鱼香肉丝", amount: 340, orderCount: 3, formula: "1,900份 × 标准净用量 ÷ 88%" }] },
  { id: "raw-peanut", code: "RM03108", name: "花生米", category: "干货类", unit: "kg", demand: 84, onHand: 66, allocated: 10, unitCost: 14, leadTime: "1天", contributions: [{ id: "c-peanut-gongbao", source: "宫保鸡丁", amount: 84, orderCount: 3, formula: "2,100份 × 0.0392kg ÷ 98%" }] },
  { id: "raw-carrot", code: "RM02032", name: "胡萝卜", category: "根茎类", unit: "kg", demand: 265, onHand: 216, allocated: 28, unitCost: 4.2, leadTime: "3小时", contributions: [{ id: "c-carrot-yuxiang", source: "鱼香肉丝", amount: 120, orderCount: 3, formula: "1,900份 × 鱼香配菜标准" }, { id: "c-carrot-veg", source: "清炒时蔬", amount: 145, orderCount: 2, formula: "1,600份 × 净配时蔬标准" }] },
  { id: "raw-fungus", code: "RM02128", name: "水发木耳", category: "菌菇类", unit: "kg", demand: 72, onHand: 108, allocated: 18, unitCost: 9.8, leadTime: "4小时", contributions: [{ id: "c-fungus-yuxiang", source: "鱼香肉丝", amount: 72, orderCount: 3, formula: "1,900份 × 鱼香配菜标准" }] },
  { id: "raw-greens", code: "RM02086", name: "上海青", category: "叶菜类", unit: "kg", demand: 310, onHand: 296, allocated: 36, unitCost: 5.6, leadTime: "2小时", contributions: [{ id: "c-greens-veg", source: "清炒时蔬", amount: 310, orderCount: 2, formula: "1,600份 × 净配时蔬标准" }] },
  { id: "raw-garlic", code: "RM03004", name: "葱姜蒜净料", category: "净配调料", unit: "kg", demand: 96, onHand: 106, allocated: 24, unitCost: 11.2, leadTime: "3小时", contributions: [{ id: "c-garlic-gongbao", source: "宫保调味汁", amount: 30, orderCount: 3, formula: "宫保调味汁 × 46.2%" }, { id: "c-garlic-yuxiang", source: "鱼香调味汁", amount: 32, orderCount: 3, formula: "鱼香调味汁 × 44.4%" }, { id: "c-garlic-veg", source: "清炒料汁", amount: 34, orderCount: 2, formula: "清炒料汁 × 53.1%" }] },
  { id: "raw-sauce", code: "RM03026", name: "复合酱汁基料", category: "复合调料", unit: "kg", demand: 105, onHand: 188, allocated: 28, unitCost: 13.8, leadTime: "1天", contributions: [{ id: "c-sauce-gongbao", source: "宫保调味汁", amount: 35, orderCount: 3, formula: "宫保调味汁 × 53.8%" }, { id: "c-sauce-yuxiang", source: "鱼香调味汁", amount: 40, orderCount: 3, formula: "鱼香调味汁 × 55.6%" }, { id: "c-sauce-veg", source: "清炒料汁", amount: 30, orderCount: 2, formula: "清炒料汁 × 46.9%" }] },
  { id: "packaging", code: "PK0008", name: "标准餐盒套装", category: "包装物", unit: "套", demand: 5600, onHand: 4500, allocated: 600, unitCost: 1.46, leadTime: "2天", excludedFromWeightFlow: true, contributions: [{ id: "c-packaging-gongbao", source: "宫保鸡丁", amount: 2100, orderCount: 3, formula: "成品 1份 × 1套" }, { id: "c-packaging-yuxiang", source: "鱼香肉丝", amount: 1900, orderCount: 3, formula: "成品 1份 × 1套" }, { id: "c-packaging-veg", source: "清炒时蔬", amount: 1600, orderCount: 2, formula: "成品 1份 × 1套" }] },
];

const BASE_SANKEY_NODES: SankeyNode[] = [
  { name: "8月6日订单", depth: 0, itemStyle: { color: "#1768f2" } },
  { name: "宫保鸡丁", depth: 1, itemStyle: { color: "#5b8ff9" } },
  { name: "鱼香肉丝", depth: 1, itemStyle: { color: "#6858e8" } },
  { name: "清炒时蔬", depth: 1, itemStyle: { color: "#08a879" } },
  { name: "鸡丁预处理", depth: 2, itemStyle: { color: "#7aa8fb" } },
  { name: "宫保调味汁", depth: 2, itemStyle: { color: "#7aa8fb" } },
  { name: "肉丝预处理", depth: 2, itemStyle: { color: "#8d82ec" } },
  { name: "鱼香配菜", depth: 2, itemStyle: { color: "#8d82ec" } },
  { name: "鱼香调味汁", depth: 2, itemStyle: { color: "#8d82ec" } },
  { name: "净配时蔬", depth: 2, itemStyle: { color: "#4fc5a2" } },
  { name: "清炒料汁", depth: 2, itemStyle: { color: "#4fc5a2" } },
  { name: "冷冻鸡胸肉", depth: 3, itemStyle: { color: "#ef6a6a" } },
  { name: "冷鲜猪后腿肉", depth: 3, itemStyle: { color: "#71809a" } },
  { name: "花生米", depth: 3, itemStyle: { color: "#ef9500" } },
  { name: "胡萝卜", depth: 3, itemStyle: { color: "#f2a14a" } },
  { name: "水发木耳", depth: 3, itemStyle: { color: "#71809a" } },
  { name: "上海青", depth: 3, itemStyle: { color: "#08a879" } },
  { name: "葱姜蒜净料", depth: 3, itemStyle: { color: "#ef6a6a" } },
  { name: "复合酱汁基料", depth: 3, itemStyle: { color: "#71809a" } },
];

const BASE_SANKEY_LINKS: SankeyLink[] = [
  { source: "8月6日订单", target: "宫保鸡丁", value: 625 },
  { source: "8月6日订单", target: "鱼香肉丝", value: 604 },
  { source: "8月6日订单", target: "清炒时蔬", value: 519 },
  { source: "宫保鸡丁", target: "鸡丁预处理", value: 476 },
  { source: "宫保鸡丁", target: "宫保调味汁", value: 65 },
  { source: "宫保鸡丁", target: "花生米", value: 84 },
  { source: "鸡丁预处理", target: "冷冻鸡胸肉", value: 476 },
  { source: "宫保调味汁", target: "葱姜蒜净料", value: 30 },
  { source: "宫保调味汁", target: "复合酱汁基料", value: 35 },
  { source: "鱼香肉丝", target: "肉丝预处理", value: 340 },
  { source: "鱼香肉丝", target: "鱼香配菜", value: 192 },
  { source: "鱼香肉丝", target: "鱼香调味汁", value: 72 },
  { source: "肉丝预处理", target: "冷鲜猪后腿肉", value: 340 },
  { source: "鱼香配菜", target: "胡萝卜", value: 120 },
  { source: "鱼香配菜", target: "水发木耳", value: 72 },
  { source: "鱼香调味汁", target: "葱姜蒜净料", value: 32 },
  { source: "鱼香调味汁", target: "复合酱汁基料", value: 40 },
  { source: "清炒时蔬", target: "净配时蔬", value: 455 },
  { source: "清炒时蔬", target: "清炒料汁", value: 64 },
  { source: "净配时蔬", target: "胡萝卜", value: 145 },
  { source: "净配时蔬", target: "上海青", value: 310 },
  { source: "清炒料汁", target: "葱姜蒜净料", value: 34 },
  { source: "清炒料汁", target: "复合酱汁基料", value: 30 },
];

export function createDemandWorkspace(dateId: string): DemandWorkspace {
  const scenario = DATE_SCENARIOS.find((item) => item.id === dateId) ?? DATE_SCENARIOS[0];
  const scaleFormulaPortions = (formula: string) => formula
    .replace("2,100份", `${Math.round(2100 * scenario.multiplier).toLocaleString("zh-CN")}份`)
    .replace("1,900份", `${Math.round(1900 * scenario.multiplier).toLocaleString("zh-CN")}份`)
    .replace("1,600份", `${Math.round(1600 * scenario.multiplier).toLocaleString("zh-CN")}份`);
  const materials = BASE_MATERIALS.map((material) => ({
    ...material,
    demand: scale(material.demand, scenario.multiplier),
    contributions: material.contributions.map((contribution) => ({
      ...contribution,
      amount: scale(contribution.amount, scenario.multiplier),
      formula: scaleFormulaPortions(contribution.formula),
    })),
  }));
  const dateNodeName = `${scenario.label}订单`;
  const sankeyNodes = BASE_SANKEY_NODES.map((node) => ({ ...node, name: node.name === "8月6日订单" ? dateNodeName : node.name }));
  const sankeyLinks = BASE_SANKEY_LINKS.map((link) => ({
    source: link.source === "8月6日订单" ? dateNodeName : link.source,
    target: link.target,
    value: scale(link.value, scenario.multiplier),
  }));
  const weightedMaterials = materials.filter((material) => !material.excludedFromWeightFlow);
  const grossKg = round(weightedMaterials.reduce((sum, material) => sum + material.demand, 0));
  const availableKg = round(weightedMaterials.reduce((sum, material) => sum + Math.max(0, material.onHand - material.allocated), 0));
  const shortages = materials.map((material) => Math.max(0, round(material.demand - Math.max(0, material.onHand - material.allocated))));
  const shortageKg = round(weightedMaterials.reduce((sum, material) => sum + Math.max(0, material.demand - Math.max(0, material.onHand - material.allocated)), 0));
  const purchaseAmount = round(materials.reduce((sum, material, index) => sum + shortages[index] * material.unitCost, 0), 2);
  return {
    scenario,
    materials,
    sankeyNodes,
    sankeyLinks,
    nameToMaterialId: Object.fromEntries(materials.map((material) => [material.name, material.id])),
    summary: {
      grossKg,
      availableKg,
      shortageKg,
      shortageKinds: shortages.filter((value) => value > 0).length,
      purchaseAmount,
    },
  };
}

export function flattenVisibleRows(rows: BomTableRow[], expanded: Set<string>) {
  const rowById = new Map(rows.map((row) => [row.id, row]));
  return rows.filter((row) => {
    let parentId = row.parentId;
    while (parentId) {
      if (!expanded.has(parentId)) return false;
      parentId = rowById.get(parentId)?.parentId ?? null;
    }
    return true;
  });
}

export function materialShortage(material: DemandMaterial) {
  return Math.max(0, round(material.demand - Math.max(0, material.onHand - material.allocated)));
}

export function materialCoverage(material: DemandMaterial) {
  if (material.demand <= 0) return 100;
  return Math.min(100, Math.round((Math.max(0, material.onHand - material.allocated) / material.demand) * 100));
}

export function formatMrpNumber(value: number, digits = 1) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: digits }).format(value);
}
