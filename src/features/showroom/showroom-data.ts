import { products } from "@/lib/mock-data";
import { FINISHED_PRODUCT, RECIPE_LAYERS, TOTAL_RAW_INPUT, TOTAL_RAW_MATERIALS } from "@/features/mrp/bom-explosion-data";
import {
  createDemandWorkspace,
  createOrderWorkspace,
  DATE_SCENARIOS,
  ORDER_SCENARIOS,
} from "@/features/mrp/mrp-data";

const kungPaoProduct = products.find((product) => product.id === "p-001");

export const SHOWROOM_ORDER = {
  code: "202608130038",
  customer: "华润万家深圳福田店",
  portions: 350,
  deliveryAt: "11:30",
  lines: [
    { id: "p-001", name: "宫保鸡丁", quantity: 120, unit: "份", interactive: true },
    { id: "p-002", name: "鱼香肉丝", quantity: 80, unit: "份", interactive: false },
    { id: "p-showroom-003", name: "青椒肉丝", quantity: 150, unit: "份", interactive: false },
  ],
};

export const SHOWROOM_ORDER_METRICS = [
  { value: 350, suffix: "份", label: "订单需求" },
  { value: TOTAL_RAW_MATERIALS, suffix: "种", label: "原料" },
  { value: 8, suffix: "种", label: "半成品" },
  { value: 12, suffix: "个", label: "生产任务" },
  { value: 4, suffix: "批", label: "配送批次" },
];

export const SHOWROOM_BOM = {
  finished: FINISHED_PRODUCT,
  layers: RECIPE_LAYERS,
  rawInput: TOTAL_RAW_INPUT,
  rawMaterialKinds: TOTAL_RAW_MATERIALS,
  yieldRate: (FINISHED_PRODUCT.quantity / TOTAL_RAW_INPUT) * 100,
  standardCost: kungPaoProduct?.cost ?? 18.62,
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
    inputWeight: 246,
    outputWeight: 226,
    steps: [
      { id: "receive", label: "毛料", detail: "246 g", outputWeight: 246 },
      { id: "trim", label: "修整", detail: "损耗 2.8%", outputWeight: 239.1, tone: "loss" },
      { id: "dice", label: "切丁", detail: "15 × 15 mm", outputWeight: 235.6, tone: "specification" },
      { id: "marinate", label: "腌制", detail: "20 min · 0–4℃", outputWeight: 231.2, tone: "temperature" },
      { id: "rest", label: "静置", detail: "吸收 12 min", outputWeight: 228.4 },
      { id: "weigh", label: "称量", detail: "净料 226 g", outputWeight: 226 },
    ],
  },
  "diced-vegetables": {
    sourceLabel: "蔬菜毛料",
    inputWeight: 111,
    outputWeight: 100,
    steps: [
      { id: "receive", label: "验收", detail: "农残快检合格", outputWeight: 111 },
      { id: "wash", label: "清洗", detail: "流动水 3 min", outputWeight: 107.8 },
      { id: "peel", label: "去皮", detail: "损耗 4.6%", outputWeight: 102.7, tone: "loss" },
      { id: "dice", label: "切丁", detail: "12 × 12 mm", outputWeight: 101.2, tone: "specification" },
      { id: "weigh", label: "称量", detail: "净料 100 g", outputWeight: 100 },
    ],
  },
  "kung-pao-sauce": {
    sourceLabel: "调味原料",
    inputWeight: 120,
    outputWeight: 120,
    steps: [
      { id: "batch", label: "领料", detail: "7 项配料", outputWeight: 120 },
      { id: "weigh", label: "称量", detail: "误差 ±0.5 g", outputWeight: 120 },
      { id: "mix", label: "搅拌", detail: "120 rpm · 6 min", outputWeight: 120 },
      { id: "check", label: "复核", detail: "盐度 1.8%", outputWeight: 120, tone: "specification" },
    ],
  },
  "roasted-peanuts": {
    sourceLabel: "脱皮花生米",
    inputWeight: 55.1,
    outputWeight: 54,
    steps: [
      { id: "receive", label: "验收", detail: "55.1 g", outputWeight: 55.1 },
      { id: "sort", label: "挑选", detail: "异物剔除", outputWeight: 54.7 },
      { id: "roast", label: "烘烤", detail: "165℃ · 8 min", outputWeight: 54.2, tone: "temperature" },
      { id: "weigh", label: "称量", detail: "净料 54 g", outputWeight: 54 },
    ],
  },
};

export const SHOWROOM_MRP = {
  order: createOrderWorkspace(ORDER_SCENARIOS[0].id),
  demand: createDemandWorkspace(DATE_SCENARIOS[0].id),
  inputs: ["订单需求", "BOM", "库存", "安全库存", "在途库存", "供应商周期"],
  timeline: [
    { time: "08:00", task: "肉类切配" },
    { time: "08:10", task: "蔬菜切配" },
    { time: "08:30", task: "称量配料" },
    { time: "10:00", task: "包装" },
    { time: "10:40", task: "冷藏" },
    { time: "11:00", task: "装车" },
  ],
  calculation: {
    material: "明日鸡胸肉需求",
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
    { id: "zhenhai", name: "镇海店", portions: 684, change: 12.4, x: 15, y: 16 },
    { id: "beilun", name: "北仑店", portions: 572, change: 8.7, x: 5, y: 39 },
    { id: "yinzhou", name: "鄞州店", portions: 821, change: 21.2, x: 21, y: 61 },
    { id: "haishu", name: "海曙店", portions: 696, change: 6.1, x: 8, y: 82 },
    { id: "jiangbei", name: "江北店", portions: 591, change: -2.8, x: 29, y: 92 },
  ],
  dishes: [
    { name: "宫保鸡丁", portions: 1_286, change: 18.6 },
    { name: "鱼香肉丝", portions: 936, change: 7.4 },
    { name: "青椒肉丝", portions: 1_142, change: -3.2 },
  ],
  factors: ["历史销量", "星期特征", "天气", "节假日", "促销计划", "门店趋势"],
  dates: ["08/01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "明日"],
  actual: [1860, 2100, 1980, 2360, 2280, 2520, 2460, 2380, 2670, 2590, 2810, 2740, 2960, 3040],
  predicted: [1790, 2050, 2020, 2310, 2340, 2460, 2510, 2430, 2610, 2660, 2760, 2820, 3010, 3364],
};

export const TRACEABILITY_SCENARIO = {
  finished: { type: "成品批次", code: "CP260814018", label: "宫保鸡丁" },
  chain: [
    { type: "生产工单", code: "WO260814021", label: "宫保鸡丁 1,200 份" },
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

export const BUSINESS_SCENARIO = {
  product: "宫保鸡丁",
  revenue: 18_720,
  costs: [
    { label: "原料成本", value: 10_230 },
    { label: "人工成本", value: 1_460 },
    { label: "包材成本", value: 620 },
    { label: "配送成本", value: 840 },
    { label: "损耗成本", value: 310 },
  ],
  grossProfit: 5_260,
  grossMargin: 28.1,
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
