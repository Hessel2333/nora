import { products } from "@/lib/mock-data";
import {
  FINISHED_PRODUCT,
  RECIPE_LAYERS,
  TOTAL_RAW_MATERIALS,
  type RecipeLayer,
} from "@/features/mrp/bom-explosion-data";
import {
  createDemandWorkspace,
  createOrderWorkspace,
  DATE_SCENARIOS,
  ORDER_SCENARIOS,
} from "@/features/mrp/mrp-data";

const kungPaoProduct = products.find((product) => product.id === "p-001");
const [baseChicken, baseSauce, baseVegetables, basePeanuts] = RECIPE_LAYERS;

export const SHOWROOM_CUSTOMER = "华润万家深圳福田店";

export const SHOWROOM_ORDER = {
  code: "202608130038",
  customer: SHOWROOM_CUSTOMER,
  portions: 350,
  deliveryAt: "11:30",
  lines: [
    { id: "p-001", name: "宫保鸡丁净菜包", quantity: 120, unit: "份", interactive: true },
    { id: "p-002", name: "鱼香肉丝净菜包", quantity: 80, unit: "份", interactive: false },
    { id: "p-showroom-003", name: "青椒肉丝净菜包", quantity: 150, unit: "份", interactive: false },
  ],
};

export const SHOWROOM_ORDER_METRICS = [
  { value: 350, suffix: "份", label: "订单需求" },
  { value: TOTAL_RAW_MATERIALS, suffix: "种", label: "原料" },
  { value: 8, suffix: "种", label: "半成品" },
  { value: 12, suffix: "个", label: "生产任务" },
  { value: 4, suffix: "批", label: "配送批次" },
];

const SHOWROOM_RECIPE_LAYERS: RecipeLayer[] = [
  {
    ...baseChicken,
    name: "鸡胸肉",
    quantity: 190,
    ratio: 63.3,
    rawInput: 203.2,
    yieldRate: 93.5,
    rawMaterials: [
      { ...baseChicken.rawMaterials[0], quantity: 190 },
      { ...baseChicken.rawMaterials[1], quantity: 6.6 },
      { ...baseChicken.rawMaterials[2], quantity: 6.6 },
    ],
  },
  {
    ...baseSauce,
    name: "宫保调味料包",
    quantity: 30,
    ratio: 10,
    rawInput: 30,
    rawMaterials: baseSauce.rawMaterials.map((material) => ({
      ...material,
      quantity: Number((material.quantity * 0.25).toFixed(1)),
    })),
  },
  {
    ...baseVegetables,
    id: "cucumber-dice",
    name: "蔬菜丁（黄瓜丁）",
    code: "SF02021-C",
    quantity: 30,
    ratio: 10,
    rawInput: 33,
    yieldRate: 90.9,
    rawMaterials: [{ ...baseVegetables.rawMaterials[0], quantity: 33 }],
  },
  {
    ...baseVegetables,
    id: "chili-segments",
    name: "辣椒段",
    code: "SF02021-P",
    quantity: 10,
    ratio: 3.3,
    image: baseSauce.rawImage,
    rawImage: baseSauce.rawImage,
    rawInput: 10.4,
    yieldRate: 96.2,
    station: "香辛料预制间",
    rawMaterials: [
      { ...baseSauce.rawMaterials[4], id: "dried-chili", name: "干辣椒", quantity: 10.4 },
    ],
  },
  {
    ...baseVegetables,
    id: "scallion-garnish",
    name: "葱花（可选）",
    code: "SF02021-S",
    quantity: 10,
    ratio: 3.3,
    rawInput: 10.6,
    yieldRate: 94.3,
    rawMaterials: [{ ...baseVegetables.rawMaterials[1], quantity: 10.6 }],
  },
  {
    ...basePeanuts,
    name: "花生米",
    quantity: 30,
    ratio: 10,
    rawInput: 30.6,
    yieldRate: 98,
    rawMaterials: [{ ...basePeanuts.rawMaterials[0], quantity: 30.6 }],
  },
];

const SHOWROOM_RECIPE_RAW_INPUT = SHOWROOM_RECIPE_LAYERS.reduce((sum, layer) => sum + layer.rawInput, 0);

export const SHOWROOM_BOM = {
  finished: { ...FINISHED_PRODUCT, quantity: 300 },
  layers: SHOWROOM_RECIPE_LAYERS,
  rawInput: SHOWROOM_RECIPE_RAW_INPUT,
  rawMaterialKinds: TOTAL_RAW_MATERIALS,
  yieldRate: (300 / SHOWROOM_RECIPE_RAW_INPUT) * 100,
  standardCost: Number(((kungPaoProduct?.cost ?? 18.62) * 0.6).toFixed(2)),
};

export interface ShowroomProcessStep {
  id: string;
  label: string;
  detail: string;
  outputWeight: number;
  tone?: "temperature" | "loss" | "specification";
}

export const BOM_PROCESS_ROUTES: Record<string, {
  sourceLabel: string;
  inputWeight: number;
  outputWeight: number;
  steps: ShowroomProcessStep[];
}> = {
  "marinated-chicken": {
    sourceLabel: "冷鲜鸡胸肉",
    inputWeight: 203.2,
    outputWeight: 190,
    steps: [
      { id: "receive", label: "毛料", detail: "203.2 g", outputWeight: 203.2 },
      { id: "trim", label: "修整", detail: "损耗 2.8%", outputWeight: 197.5, tone: "loss" },
      { id: "dice", label: "切丁", detail: "15 × 15 mm", outputWeight: 194.8, tone: "specification" },
      { id: "marinate", label: "腌制", detail: "20 min · 0–4℃", outputWeight: 192.4, tone: "temperature" },
      { id: "rest", label: "静置", detail: "吸收 12 min", outputWeight: 191.1 },
      { id: "weigh", label: "称量", detail: "净料 190 g", outputWeight: 190 },
    ],
  },
  "cucumber-dice": {
    sourceLabel: "鲜黄瓜",
    inputWeight: 33,
    outputWeight: 30,
    steps: [
      { id: "receive", label: "验收", detail: "农残快检合格", outputWeight: 33 },
      { id: "wash", label: "清洗", detail: "流动水 3 min", outputWeight: 32.1 },
      { id: "trim", label: "修整", detail: "损耗 6.1%", outputWeight: 30.1, tone: "loss" },
      { id: "dice", label: "切丁", detail: "12 × 12 mm", outputWeight: 30, tone: "specification" },
      { id: "weigh", label: "称量", detail: "净料 30 g", outputWeight: 30 },
    ],
  },
  "kung-pao-sauce": {
    sourceLabel: "调味原料",
    inputWeight: 30,
    outputWeight: 30,
    steps: [
      { id: "batch", label: "领料", detail: "7 项配料", outputWeight: 30 },
      { id: "weigh", label: "称量", detail: "误差 ±0.5 g", outputWeight: 30 },
      { id: "mix", label: "搅拌", detail: "120 rpm · 6 min", outputWeight: 30 },
      { id: "check", label: "复核", detail: "盐度 1.8%", outputWeight: 30, tone: "specification" },
    ],
  },
  "chili-segments": {
    sourceLabel: "干辣椒",
    inputWeight: 10.4,
    outputWeight: 10,
    steps: [
      { id: "receive", label: "验收", detail: "色泽与水分合格", outputWeight: 10.4 },
      { id: "sort", label: "挑选", detail: "去蒂除杂", outputWeight: 10.2, tone: "loss" },
      { id: "cut", label: "切段", detail: "15–20 mm", outputWeight: 10, tone: "specification" },
      { id: "weigh", label: "称量", detail: "净料 10 g", outputWeight: 10 },
    ],
  },
  "scallion-garnish": {
    sourceLabel: "净大葱",
    inputWeight: 10.6,
    outputWeight: 10,
    steps: [
      { id: "receive", label: "验收", detail: "10.6 g", outputWeight: 10.6 },
      { id: "wash", label: "清洗", detail: "流动水 2 min", outputWeight: 10.3 },
      { id: "cut", label: "切葱花", detail: "3–5 mm", outputWeight: 10, tone: "specification" },
      { id: "weigh", label: "可选投料", detail: "净料 10 g", outputWeight: 10 },
    ],
  },
  "peanut-pack": {
    sourceLabel: "脱皮花生米",
    inputWeight: 30.6,
    outputWeight: 30,
    steps: [
      { id: "receive", label: "验收", detail: "30.6 g", outputWeight: 30.6 },
      { id: "sort", label: "挑选", detail: "异物剔除", outputWeight: 30.3 },
      { id: "check", label: "复核", detail: "外观与异物合格", outputWeight: 30.1, tone: "specification" },
      { id: "weigh", label: "称量", detail: "净料 30 g", outputWeight: 30 },
    ],
  },
};

export const SHOWROOM_MRP = {
  order: createOrderWorkspace(ORDER_SCENARIOS[0].id),
  demand: createDemandWorkspace(DATE_SCENARIOS[0].id),
  inputs: ["订单需求", "BOM", "库存", "安全库存", "在途库存", "供应商周期"],
  timeline: [
    { time: "08:00", task: "鸡胸肉修整" },
    { time: "08:20", task: "鸡胸肉切丁" },
    { time: "08:40", task: "鸡胸肉腌制" },
    { time: "09:00", task: "静置入味" },
    { time: "09:20", task: "净料称量" },
  ],
  calculation: {
    material: "今日鸡胸肉需求",
    demandKg: 868.6,
    onHandKg: 522,
    inTransitKg: 126,
    safetyStockKg: 80,
    steps: [868.6, 346.6, 220.6, 300.6],
    shortageKg: 300.6,
    purchaseOrderCode: "PO-260814-018",
  },
};

export const FORECAST_SCENARIO = {
  stores: [
    { id: "customer-huarun", name: SHOWROOM_CUSTOMER, portions: 684, change: 12.4, x: 15, y: 16 },
    { id: "beilun", name: "北仑店", portions: 572, change: 8.7, x: 5, y: 39 },
    { id: "yinzhou", name: "鄞州店", portions: 821, change: 21.2, x: 21, y: 61 },
    { id: "haishu", name: "海曙店", portions: 696, change: 6.1, x: 8, y: 82 },
    { id: "jiangbei", name: "江北店", portions: 591, change: -2.8, x: 29, y: 92 },
  ],
  dishes: [
    { name: "宫保鸡丁净菜包", portions: 1_286, change: 18.6 },
    { name: "鱼香肉丝净菜包", portions: 936, change: 7.4 },
    { name: "青椒肉丝净菜包", portions: 1_142, change: -3.2 },
  ],
  factors: ["历史销量", "星期特征", "天气", "节假日", "门店趋势"],
  dates: ["08/01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "今日"],
  actual: [1860, 2100, 1980, 2360, 2280, 2520, 2460, 2380, 2670, 2590, 2810, 2740, 2960, 3040],
  predicted: [1790, 2050, 2020, 2310, 2340, 2460, 2510, 2430, 2610, 2660, 2760, 2820, 3010, 3364],
};

export const TRACEABILITY_SCENARIO = {
  finished: { type: "净菜成品批次", code: "CP260814018", label: "宫保鸡丁净菜包" },
  chain: [
    { type: "生产工单", code: "WO260814021", label: "宫保鸡丁净菜包 1,200 份" },
    { type: "半成品批次", code: "SP260814034", label: "腌制鸡丁" },
    { type: "原料批次", code: "RM260813124", label: "冷鲜鸡胸肉" },
    { type: "供应商", code: "SUP-018", label: "深农优品" },
    { type: "到货检验", code: "IQC260813046", label: "合格" },
  ],
  facts: [
    { label: "操作人员", value: "张伟" },
    { label: "生产时间", value: "08:36" },
    { label: "生产区域", value: "R02" },
    { label: "冷链温度", value: "2.8℃" },
  ],
  recall: { batches: 3, stores: 5, portions: 326 },
};

export interface SupplierQuote {
  id: string;
  name: string;
  price: number;
  change: number;
  quality: number;
  fulfillment: number;
  yieldRate: number;
  stability: number;
  recommended?: boolean;
}

export const PROCUREMENT_SCENARIO = {
  material: "鸡胸肉",
  quantity: 860,
  unit: "kg",
  suppliers: [
    { id: "supplier-a", name: "深农优品", price: 12.6, change: -2.3, quality: 98, fulfillment: 97, yieldRate: 96.4, stability: 98, recommended: true },
    { id: "supplier-b", name: "鲜达供应链", price: 12.85, change: -0.8, quality: 99, fulfillment: 94, yieldRate: 96.8, stability: 94 },
    { id: "supplier-c", name: "岭南食材", price: 12.4, change: -3.1, quality: 94, fulfillment: 91, yieldRate: 93.6, stability: 90 },
  ] satisfies SupplierQuote[],
};

export const SCHEDULING_SCENARIO = {
  deliveryAt: "11:30",
  orderPortions: 350,
  criticalPath: [
    { id: "trim", time: "08:00", label: "鸡胸肉修整", detail: "先处理最长前置工序", duration: 20 },
    { id: "dice", time: "08:20", label: "切丁", detail: "15 × 15 mm", duration: 20 },
    { id: "marinate", time: "08:40", label: "腌制与静置", detail: "等待窗口 40 min", duration: 40 },
    { id: "combine", time: "09:20", label: "合料称量", detail: "六项配方齐套", duration: 20 },
    { id: "pack", time: "09:40", label: "包装入冷链", detail: "按配送批次归集", duration: 40 },
  ],
  parallelTasks: [
    { time: "08:45", label: "黄瓜丁与辣椒段", detail: "利用腌制等待窗口完成" },
    { time: "09:00", label: "宫保调味料包称量", detail: "与主路径并行，不占肉类工位" },
  ],
  reasons: ["交付时间", "工艺前置关系", "工位负荷", "冷链窗口"],
};

export const BUSINESS_SCENARIO = {
  product: "宫保鸡丁净菜包",
  revenue: 238_600,
  costs: [
    { label: "原料成本", value: 138_420 },
    { label: "人工成本", value: 22_860 },
    { label: "包材成本", value: 9_740 },
    { label: "配送成本", value: 14_260 },
    { label: "损耗成本", value: 9_418 },
  ],
  grossProfit: 43_902,
  grossMargin: 18.4,
  marginChange: -2.3,
  attribution: [
    { label: "鸡胸肉上涨", value: -0.8 },
    { label: "实际出成率下降", value: -0.6 },
    { label: "加班增加", value: -0.3 },
    { label: "促销", value: -0.9 },
    { label: "配送优化", value: 0.3 },
  ],
};

export const PLATFORM_NODES = [
  "Factory Node A",
  "中央厨房 B",
  "净配菜工厂 C",
  "团餐企业 D",
  "连锁餐饮 E",
  "区域中心 F",
];

export const PLATFORM_CAPABILITIES = ["ERP", "MRP", "MES", "WMS", "Digital Twin", "AI"];
