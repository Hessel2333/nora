export type ExplosionMode = "finished" | "semi" | "raw";

export type MaterialStatus = "normal" | "tight" | "shortage";

export interface RawMaterial {
  id: string;
  name: string;
  code: string;
  quantity: number;
  unit: string;
  available: number;
  status: MaterialStatus;
  storage: string;
  cropPosition: string;
}

export interface RecipeLayer {
  id: string;
  name: string;
  code: string;
  quantity: number;
  ratio: number;
  unit: string;
  image: string;
  rawImage: string;
  rawInput: number;
  yieldRate: number;
  station: string;
  stageTop: number;
  rawStageTop: number;
  labelSide: "left" | "right";
  rawMaterials: RawMaterial[];
}

export const EXPLOSION_MODES: Array<{ id: ExplosionMode; label: string }> = [
  { id: "finished", label: "成品" },
  { id: "semi", label: "半成品" },
  { id: "raw", label: "原料" },
];

export const RECIPE_LAYERS: RecipeLayer[] = [
  {
    id: "marinated-chicken",
    name: "腌制鸡肉丁",
    code: "SF01012",
    quantity: 226,
    ratio: 45.2,
    unit: "g",
    image: "/images/bom-explosion/semi-marinated-chicken.png",
    rawImage: "/images/bom-explosion/raw-chicken-group.png",
    rawInput: 246,
    yieldRate: 91.9,
    station: "肉类前处理间",
    stageTop: 5,
    rawStageTop: 6,
    labelSide: "left",
    rawMaterials: [
      { id: "chicken-breast", name: "冷鲜鸡胸肉", code: "RM01234", quantity: 231, unit: "g", available: 18.4, status: "tight", storage: "冷藏库 B-03", cropPosition: "18% 48%" },
      { id: "egg-white", name: "巴氏蛋清", code: "RM03042", quantity: 8, unit: "g", available: 26.8, status: "normal", storage: "冷藏库 B-08", cropPosition: "88% 16%" },
      { id: "potato-starch", name: "马铃薯淀粉", code: "RM03018", quantity: 7, unit: "g", available: 32, status: "normal", storage: "常温库 C-06", cropPosition: "88% 84%" },
    ],
  },
  {
    id: "kung-pao-sauce",
    name: "宫保调味汁",
    code: "SF02008",
    quantity: 120,
    ratio: 24,
    unit: "g",
    image: "/images/bom-explosion/semi-kung-pao-sauce.png",
    rawImage: "/images/bom-explosion/raw-sauce-group.png",
    rawInput: 120,
    yieldRate: 100,
    station: "调味汁间",
    stageTop: 27,
    rawStageTop: 30,
    labelSide: "right",
    rawMaterials: [
      { id: "soy-sauce", name: "酿造生抽", code: "RM03026", quantity: 30, unit: "g", available: 46.2, status: "normal", storage: "常温库 C-04", cropPosition: "18% 8%" },
      { id: "rice-vinegar", name: "米醋", code: "RM03028", quantity: 20, unit: "g", available: 28.6, status: "normal", storage: "常温库 C-04", cropPosition: "82% 8%" },
      { id: "sugar", name: "白砂糖", code: "RM03012", quantity: 22, unit: "g", available: 84, status: "normal", storage: "常温库 C-02", cropPosition: "18% 50%" },
      { id: "cooking-wine", name: "料酒", code: "RM03031", quantity: 12, unit: "g", available: 19.5, status: "normal", storage: "常温库 C-04", cropPosition: "82% 50%" },
      { id: "chili-spice", name: "干辣椒花椒", code: "RM03110", quantity: 8, unit: "g", available: 3.1, status: "tight", storage: "香辛料库 C-08", cropPosition: "18% 92%" },
      { id: "sauce-starch", name: "调味汁淀粉", code: "RM03019", quantity: 8, unit: "g", available: 23.4, status: "normal", storage: "常温库 C-06", cropPosition: "82% 92%" },
      { id: "water", name: "净化水", code: "RM00001", quantity: 20, unit: "g", available: 999, status: "normal", storage: "生产供水", cropPosition: "82% 8%" },
    ],
  },
  {
    id: "diced-vegetables",
    name: "净配蔬菜丁",
    code: "SF02021",
    quantity: 100,
    ratio: 20,
    unit: "g",
    image: "/images/bom-explosion/semi-diced-vegetables.png",
    rawImage: "/images/bom-explosion/raw-vegetable-group.png",
    rawInput: 111,
    yieldRate: 90.1,
    station: "蔬菜净配间",
    stageTop: 49,
    rawStageTop: 56,
    labelSide: "left",
    rawMaterials: [
      { id: "cucumber", name: "鲜黄瓜", code: "RM02018", quantity: 68, unit: "g", available: 4.2, status: "shortage", storage: "蔬菜库 A-02", cropPosition: "12% 10%" },
      { id: "scallion", name: "净大葱", code: "RM02004", quantity: 21, unit: "g", available: 8.6, status: "normal", storage: "蔬菜库 A-04", cropPosition: "52% 12%" },
      { id: "red-pepper", name: "红甜椒", code: "RM02027", quantity: 22, unit: "g", available: 6.8, status: "normal", storage: "蔬菜库 A-03", cropPosition: "90% 18%" },
    ],
  },
  {
    id: "roasted-peanuts",
    name: "熟花生米",
    code: "RM03108",
    quantity: 54,
    ratio: 10.8,
    unit: "g",
    image: "/images/bom-explosion/semi-roasted-peanuts.png",
    rawImage: "/images/bom-explosion/semi-roasted-peanuts.png",
    rawInput: 55.1,
    yieldRate: 98,
    station: "干货预制间",
    stageTop: 69,
    rawStageTop: 79,
    labelSide: "right",
    rawMaterials: [
      { id: "raw-peanuts", name: "脱皮花生米", code: "RM03108", quantity: 55.1, unit: "g", available: 0, status: "shortage", storage: "常温库 C-03", cropPosition: "50% 50%" },
    ],
  },
];

export const FINISHED_PRODUCT = {
  id: "CP0001",
  name: "宫保鸡丁",
  code: "CP0001",
  bomVersion: "V2.1",
  quantity: 500,
  unit: "g/份",
  image: "/images/bom-explosion/kung-pao-finished.png",
  bowlImage: "/images/bom-explosion/empty-black-bowl.png",
  effectiveAt: "2026-08-01 08:00",
  owner: "研发工艺组",
};

export const TOTAL_RAW_INPUT = RECIPE_LAYERS.reduce((sum, layer) => sum + layer.rawInput, 0);
export const TOTAL_RAW_MATERIALS = RECIPE_LAYERS.reduce((sum, layer) => sum + layer.rawMaterials.length, 0);
