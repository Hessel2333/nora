import type { BomOperation, BomOperationKind } from "./types";

export type PreprocessTemplateId =
  | "leafy-vegetable"
  | "root-vegetable"
  | "meat-basic"
  | "meat-marinated"
  | "kit-assembly";

type TemplateOperation = Omit<BomOperation, "id" | "sequence">;

export interface PreprocessTemplate {
  id: PreprocessTemplateId;
  name: string;
  appliesTo: string;
  description: string;
  operations: TemplateOperation[];
}

export const editablePreprocessKinds: BomOperationKind[] = [
  "receive",
  "wash",
  "cut",
  "marinate",
  "mix",
  "pack",
  "quality",
  "cool",
];

export const preprocessTemplates: PreprocessTemplate[] = [
  {
    id: "leafy-vegetable",
    name: "叶菜基础前处理",
    appliesTo: "叶菜、茄果和易损蔬菜",
    description: "从来料复核、清洗切配到冷藏暂存的完整净配流程。",
    operations: [
      { code: "OP10", name: "来料确认", kind: "receive", workCenter: "原料验收区", durationMinutes: 4, waitMinutes: 0, instructions: "核对品种、批次、数量和感官状态。" },
      { code: "OP20", name: "挑拣修整", kind: "cut", workCenter: "蔬菜前处理区", durationMinutes: 8, waitMinutes: 0, instructions: "去除不可食部分和不合格原料。" },
      { code: "OP30", name: "清洗沥水", kind: "wash", workCenter: "蔬菜清洗区", durationMinutes: 12, waitMinutes: 5, instructions: "按企业清洗 SOP 处理并充分沥水。" },
      { code: "OP40", name: "规格切配", kind: "cut", workCenter: "蔬菜切配区", durationMinutes: 8, waitMinutes: 0, instructions: "按产品规格切丝、片、丁或段。" },
      { code: "OP50", name: "复核称重", kind: "quality", workCenter: "称量组配区", durationMinutes: 4, waitMinutes: 0, instructions: "复核净重、规格和外观。" },
      { code: "OP60", name: "分装贴标", kind: "pack", workCenter: "蔬菜内包区", durationMinutes: 6, waitMinutes: 0, instructions: "按包装规格分装、封口并生成批次标签。" },
      { code: "OP70", name: "冷藏暂存", kind: "cool", workCenter: "成品冷藏区", durationMinutes: 2, waitMinutes: 0, temperatureMin: 0, temperatureMax: 4, instructions: "按冷链要求暂存并等待发运。" },
    ],
  },
  {
    id: "root-vegetable",
    name: "根茎基础前处理",
    appliesTo: "萝卜、土豆、笋类等",
    description: "包含清洗去皮、复洗和规格切配。",
    operations: [
      { code: "OP10", name: "来料确认", kind: "receive", workCenter: "原料验收区", durationMinutes: 4, waitMinutes: 0, instructions: "核对品种、批次、数量和腐损情况。" },
      { code: "OP20", name: "清洗去皮", kind: "wash", workCenter: "根茎前处理区", durationMinutes: 12, waitMinutes: 0, instructions: "去除泥沙和外皮，按产品要求保留可食部分。" },
      { code: "OP30", name: "修整切配", kind: "cut", workCenter: "蔬菜切配区", durationMinutes: 10, waitMinutes: 0, instructions: "按规格完成修整和切配。" },
      { code: "OP40", name: "复洗沥水", kind: "wash", workCenter: "蔬菜清洗区", durationMinutes: 8, waitMinutes: 5, instructions: "按企业 SOP 复洗并充分沥水。" },
      { code: "OP50", name: "复核称重", kind: "quality", workCenter: "称量组配区", durationMinutes: 4, waitMinutes: 0, instructions: "复核净重、规格和外观。" },
      { code: "OP60", name: "分装贴标", kind: "pack", workCenter: "蔬菜内包区", durationMinutes: 6, waitMinutes: 0, instructions: "分装、封口并生成批次标签。" },
      { code: "OP70", name: "冷藏暂存", kind: "cool", workCenter: "成品冷藏区", durationMinutes: 2, waitMinutes: 0, temperatureMin: 0, temperatureMax: 4, instructions: "按冷链要求暂存并等待发运。" },
    ],
  },
  {
    id: "meat-basic",
    name: "肉类基础前处理",
    appliesTo: "冷鲜或冷冻肉类",
    description: "低温解冻、修整切配、分装和冷藏。",
    operations: [
      { code: "OP10", name: "来料与温度确认", kind: "receive", workCenter: "肉类验收区", durationMinutes: 4, waitMinutes: 0, instructions: "核对批次、检疫信息、数量和来料温度。" },
      { code: "OP20", name: "低温解冻", kind: "cool", workCenter: "肉类前处理区", durationMinutes: 5, waitMinutes: 60, temperatureMin: 0, temperatureMax: 4, instructions: "按企业低温解冻 SOP 执行并记录时间。" },
      { code: "OP30", name: "修整切配", kind: "cut", workCenter: "肉类切配区", durationMinutes: 10, waitMinutes: 0, instructions: "去除筋膜等不可用部分，并按规格切片、丝或丁。" },
      { code: "OP40", name: "复核称重", kind: "quality", workCenter: "肉类称量区", durationMinutes: 4, waitMinutes: 0, instructions: "复核净重、规格和感官状态。" },
      { code: "OP50", name: "分装贴标", kind: "pack", workCenter: "肉类内包区", durationMinutes: 6, waitMinutes: 0, instructions: "分装、封口并关联原料批次。" },
      { code: "OP60", name: "冷藏暂存", kind: "cool", workCenter: "成品冷藏区", durationMinutes: 2, waitMinutes: 0, temperatureMin: 0, temperatureMax: 4, instructions: "按冷链要求暂存并等待发运。" },
    ],
  },
  {
    id: "meat-marinated",
    name: "肉类腌制前处理",
    appliesTo: "需要预腌的肉片、肉丝和肉丁",
    description: "在基础肉类前处理中增加低温腌制步骤。",
    operations: [
      { code: "OP10", name: "来料与温度确认", kind: "receive", workCenter: "肉类验收区", durationMinutes: 4, waitMinutes: 0, instructions: "核对批次、检疫信息、数量和来料温度。" },
      { code: "OP20", name: "低温解冻", kind: "cool", workCenter: "肉类前处理区", durationMinutes: 5, waitMinutes: 60, temperatureMin: 0, temperatureMax: 4, instructions: "按企业低温解冻 SOP 执行并记录时间。" },
      { code: "OP30", name: "修整切配", kind: "cut", workCenter: "肉类切配区", durationMinutes: 10, waitMinutes: 0, instructions: "去除筋膜等不可用部分，并按规格切片、丝或丁。" },
      { code: "OP40", name: "低温腌制", kind: "marinate", workCenter: "肉类腌制区", durationMinutes: 5, waitMinutes: 20, temperatureMin: 0, temperatureMax: 4, instructions: "按标准比例拌匀并记录静置起止时间。" },
      { code: "OP50", name: "复核称重", kind: "quality", workCenter: "肉类称量区", durationMinutes: 4, waitMinutes: 0, instructions: "复核净重、规格和感官状态。" },
      { code: "OP60", name: "分装贴标", kind: "pack", workCenter: "肉类内包区", durationMinutes: 6, waitMinutes: 0, instructions: "分装、封口并关联原料批次。" },
      { code: "OP70", name: "冷藏暂存", kind: "cool", workCenter: "成品冷藏区", durationMinutes: 2, waitMinutes: 0, temperatureMin: 0, temperatureMax: 4, instructions: "按冷链要求暂存并等待发运。" },
    ],
  },
  {
    id: "kit-assembly",
    name: "配菜包组配",
    appliesTo: "多份独立净菜或辅料组合",
    description: "只做称重、组合和包装，不改变原料加工状态。",
    operations: [
      { code: "OP10", name: "分区备料", kind: "receive", workCenter: "称量组配区", durationMinutes: 5, waitMinutes: 0, instructions: "按批次准备各独立净菜、肉类和辅料。" },
      { code: "OP20", name: "规格复核", kind: "quality", workCenter: "称量组配区", durationMinutes: 4, waitMinutes: 0, instructions: "复核品项、批次、规格和感官状态。" },
      { code: "OP30", name: "称重组配", kind: "mix", workCenter: "称量组配区", durationMinutes: 8, waitMinutes: 0, instructions: "各物料独立称重后按包装定义分隔组合。" },
      { code: "OP40", name: "分装封口", kind: "pack", workCenter: "综合内包区", durationMinutes: 6, waitMinutes: 0, instructions: "按包装定义分隔放置并完成封口。" },
      { code: "OP50", name: "标签复核", kind: "quality", workCenter: "综合内包区", durationMinutes: 3, waitMinutes: 0, instructions: "复核品名、净含量、批次、日期和储存条件。" },
      { code: "OP60", name: "冷藏暂存", kind: "cool", workCenter: "成品冷藏区", durationMinutes: 2, waitMinutes: 0, temperatureMin: 0, temperatureMax: 4, instructions: "按冷链要求暂存并等待发运。" },
    ],
  },
];

export function instantiatePreprocessTemplate(template: PreprocessTemplate, idPrefix = `template-${template.id}`): BomOperation[] {
  return template.operations.map((operation, index) => ({
    ...operation,
    id: `${idPrefix}-${index + 1}`,
    sequence: (index + 1) * 10,
  }));
}

export function detectPreprocessTemplate(operations: BomOperation[]) {
  return preprocessTemplates.find((template) =>
    template.operations.length === operations.length &&
    template.operations.every((operation, index) =>
      operation.name === operations[index]?.name && operation.kind === operations[index]?.kind,
    ),
  );
}

export function suggestPreprocessOperationCode(
  operations: BomOperation[],
  material: { type?: string; category?: string },
) {
  const operationCode = (kind: BomOperationKind) => operations.find((operation) => operation.kind === kind)?.code;
  const category = material.category ?? "";
  if (category.includes("包装")) return operationCode("pack");

  const assemblyOnly = Boolean(operationCode("mix"))
    && !operations.some((operation) => ["wash", "cut", "marinate"].includes(operation.kind));
  if (assemblyOnly) return operationCode("mix");
  if (/肉|禽/.test(category)) return operationCode("receive") ?? operationCode("cut");
  if (material.type === "semi" || /调味料|酱料|腌料/.test(category)) {
    return operationCode("marinate") ?? operationCode("mix") ?? operationCode("quality");
  }
  if (/干货|辅料/.test(category)) return operationCode("mix") ?? operationCode("quality");
  if (/蔬菜|叶菜|根茎|瓜果/.test(category)) {
    return operationCode("wash") ?? operationCode("cut") ?? operationCode("receive");
  }
  return operationCode("wash") ?? operationCode("mix") ?? operationCode("quality") ?? operationCode("receive");
}
