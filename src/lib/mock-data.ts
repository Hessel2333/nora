import type { ActivityEvent, Bom, Customer, MasterRecord, Product, SalesOrder, TwinZone, WorkOrder } from "./types";

const demoDateTime = (offsetDays: number, time: string) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.toISOString().slice(0, 10)} ${time}`;
};

const demoDate = (offsetDays: number) => demoDateTime(offsetDays, "00:00").slice(0, 10);

export const products: Product[] = [
  { id: "p-001", code: "CP0001", name: "宫保鸡丁净菜包", type: "finished", category: "净菜包", unit: "份", cost: 18.62, price: 32.5, stock: 1260, safetyStock: 800, taxRate: 6, tags: ["冷藏", "分隔组配", "肉类前处理"], status: "active" },
  { id: "p-002", code: "CP0002", name: "鱼香肉丝净菜包", type: "finished", category: "净菜包", unit: "份", cost: 16.8, price: 29.8, stock: 860, safetyStock: 600, taxRate: 6, tags: ["冷藏", "分隔组配", "肉类前处理"], status: "active" },
  { id: "p-003", code: "CP0003", name: "时蔬净菜包", type: "finished", category: "净菜包", unit: "份", cost: 8.4, price: 16.8, stock: 420, safetyStock: 500, taxRate: 6, tags: ["冷藏", "分隔组配", "蔬菜前处理"], status: "active" },
  { id: "p-004", code: "RM01234", name: "冷冻鸡胸肉", type: "raw", category: "禽肉类", unit: "kg", cost: 20.7, price: 0, stock: 120, safetyStock: 200, taxRate: 9, tags: ["冷冻", "核心原料"], status: "active" },
  { id: "p-005", code: "SF01012", name: "腌制鸡肉丁", type: "semi", category: "半成品", unit: "kg", cost: 24.2, price: 0, stock: 46, safetyStock: 60, taxRate: 9, tags: ["冷藏", "自制"], status: "active" },
  { id: "p-006", code: "PK0008", name: "净菜包装套装", type: "combo", category: "包装", unit: "套", cost: 1.46, price: 2.2, stock: 3200, safetyStock: 3000, taxRate: 13, tags: ["包装", "冷藏"], status: "active" },
];

export const boms: Bom[] = [
  {
    id: "bom-001", productId: "p-001", productName: "宫保鸡丁净菜包", version: "V2.1", previousVersion: "V2.0", outputQuantity: 1, outputUnit: "份", status: "effective", effectiveAt: demoDate(-30),
    operations: [
      { id: "bo-01", code: "OP10", name: "低温解冻与来料确认", kind: "receive", sequence: 10, workCenter: "肉类前处理间", durationMinutes: 12, waitMinutes: 0, temperatureMin: 0, temperatureMax: 10, instructions: "核对批次与中心温度，在受控低温条件下解冻并沥水。" },
      { id: "bo-02", code: "OP20", name: "修整切丁", kind: "cut", sequence: 20, workCenter: "肉类切配间", durationMinutes: 8, waitMinutes: 0, temperatureMax: 12, instructions: "去除筋膜并切为约 15 mm 均匀鸡丁。" },
      { id: "bo-03", code: "OP30", name: "低温腌制", kind: "marinate", sequence: 30, workCenter: "低温腌制间", durationMinutes: 5, waitMinutes: 20, temperatureMin: 0, temperatureMax: 4, instructions: "加入调味汁拌匀，冷藏静置 20 分钟。" },
      { id: "bo-04", code: "OP40", name: "辅料称重组配", kind: "mix", sequence: 40, workCenter: "净菜组配间", durationMinutes: 8, waitMinutes: 0, temperatureMax: 12, instructions: "按份称量辅料，并与肉类原料分隔组配。" },
      { id: "bo-05", code: "OP50", name: "分装贴标", kind: "pack", sequence: 50, workCenter: "净菜包装间", durationMinutes: 6, waitMinutes: 0, temperatureMax: 12, instructions: "复核净重、批次和标签后封装，转入冷藏。" },
    ],
    items: [
      { id: "bi-01", componentId: "p-004", name: "鸡胸肉（去皮）", operationCode: "OP10", unit: "kg", netQuantity: 0.57, yieldRate: 0.95, unitCost: 20.7, level: 1 },
      { id: "bi-02", componentId: "r-02", name: "花生米", operationCode: "OP40", unit: "kg", netQuantity: 0.078, yieldRate: 0.98, unitCost: 14, level: 1 },
      { id: "bi-03", componentId: "r-03", name: "干辣椒段", operationCode: "OP40", unit: "kg", netQuantity: 0.029, yieldRate: 0.97, unitCost: 16, level: 1 },
      { id: "bi-04", componentId: "r-04", name: "葱姜蒜", operationCode: "OP40", unit: "kg", netQuantity: 0.036, yieldRate: 0.96, unitCost: 11.2, level: 1 },
      { id: "bi-05", componentId: "r-05", name: "宫保调味汁", operationCode: "OP30", unit: "kg", netQuantity: 0.065, yieldRate: 1, unitCost: 18.4, level: 2 },
      { id: "bi-06", componentId: "p-006", name: "净菜包装套装", operationCode: "OP50", unit: "套", netQuantity: 1, yieldRate: 1, unitCost: 1.46, level: 1 },
    ],
  },
];

export const customers: Customer[] = [
  { id: "c-001", code: "KH0001", name: "华润万家深圳福田店", type: "A类", contact: "张店长", phone: "138 0000 8888", address: "深圳市福田区深南大道2008号", settlement: "月结30天", tags: ["商超", "重点客户"], status: "active", orderCount: 86, revenue: 486200 },
  { id: "c-002", code: "KH0002", name: "盒马鲜生南山店", type: "A类", contact: "李经理", phone: "137 1020 6688", address: "深圳市南山区科苑路15号", settlement: "月结30天", tags: ["新零售"], status: "active", orderCount: 62, revenue: 362800 },
  { id: "c-003", code: "KH0003", name: "招商银行深圳分行", type: "B类", contact: "王主管", phone: "136 2208 5166", address: "深圳市福田区深南大道7088号", settlement: "月结45天", tags: ["团餐", "企业"], status: "active", orderCount: 38, revenue: 248500 },
  { id: "c-004", code: "KH0004", name: "中山大学深圳校区", type: "B类", contact: "陈老师", phone: "135 8831 9072", address: "深圳市光明区公常路66号", settlement: "月结30天", tags: ["团餐", "学校"], status: "pending", orderCount: 12, revenue: 98200 },
];

export const orders: SalesOrder[] = [
  { id: "o-048", code: "DEMO-SO-0048", customerId: "c-001", customerName: "华润万家深圳福田店", deliveryAt: demoDateTime(0, "11:00"), status: "in_production", source: "客户下单", createdAt: demoDateTime(0, "08:47"), contact: "张店长", phone: "138 0000 8888", address: "深圳市福田区深南大道2008号", lines: [{ id: "ol-1", productId: "p-001", productName: "宫保鸡丁净菜包", quantity: 1200, unit: "份", unitPrice: 32.5 }, { id: "ol-2", productId: "p-002", productName: "鱼香肉丝净菜包", quantity: 800, unit: "份", unitPrice: 29.8 }] },
  { id: "o-047", code: "DEMO-SO-0047", customerId: "c-002", customerName: "盒马鲜生南山店", deliveryAt: demoDateTime(0, "14:30"), status: "pending", source: "客户下单", createdAt: demoDateTime(0, "08:32"), contact: "李经理", phone: "137 1020 6688", address: "深圳市南山区科苑路15号", lines: [{ id: "ol-3", productId: "p-001", productName: "宫保鸡丁净菜包", quantity: 600, unit: "份", unitPrice: 32.5 }] },
  { id: "o-046", code: "DEMO-SO-0046", customerId: "c-003", customerName: "招商银行深圳分行", deliveryAt: demoDateTime(1, "11:30"), status: "delivering", source: "Excel导入", createdAt: demoDateTime(-1, "17:20"), contact: "王主管", phone: "136 2208 5166", address: "深圳市福田区深南大道7088号", lines: [{ id: "ol-4", productId: "p-003", productName: "时蔬净菜包", quantity: 500, unit: "份", unitPrice: 16.8 }] },
  { id: "o-045", code: "DEMO-SO-0045", customerId: "c-004", customerName: "中山大学深圳校区", deliveryAt: demoDateTime(1, "12:00"), status: "approved", source: "手工录入", createdAt: demoDateTime(-1, "16:05"), contact: "陈老师", phone: "135 8831 9072", address: "深圳市光明区公常路66号", lines: [{ id: "ol-5", productId: "p-002", productName: "鱼香肉丝净菜包", quantity: 1000, unit: "份", unitPrice: 29.8 }, { id: "ol-6", productId: "p-003", productName: "时蔬净菜包", quantity: 1000, unit: "份", unitPrice: 16.8 }] },
  { id: "o-044", code: "DEMO-SO-0044", customerId: "c-001", customerName: "华润万家深圳福田店", deliveryAt: demoDateTime(2, "11:00"), status: "completed", source: "AI预测", createdAt: demoDateTime(-2, "09:10"), contact: "张店长", phone: "138 0000 8888", address: "深圳市福田区深南大道2008号", lines: [{ id: "ol-7", productId: "p-001", productName: "宫保鸡丁净菜包", quantity: 900, unit: "份", unitPrice: 32.5 }] },
];

export const workOrders: WorkOrder[] = [
  { id: "wo-003", code: "DEMO-WO-003", productId: "p-001", productName: "宫保鸡丁净菜包切配", line: "肉类切配间", zoneId: "meat-cutting", plannedQuantity: 2000, completedQuantity: 1160, unit: "份", startAt: "08:30", endAt: "11:30", owner: "王强", priority: "high", status: "in_progress", progress: 58, operations: [{ id: "op-1", name: "脱包", status: "completed", at: "08:15" }, { id: "op-2", name: "低温前处理", status: "completed", at: "08:34" }, { id: "op-3", name: "称重", status: "completed", at: "08:42" }, { id: "op-4", name: "切配", status: "in_progress" }, { id: "op-5", name: "内包装", status: "waiting" }] },
  { id: "wo-002", code: "DEMO-WO-002", productId: "p-002", productName: "鱼香肉丝净菜包切配", line: "肉类切配间", zoneId: "meat-cutting", plannedQuantity: 1500, completedQuantity: 1080, unit: "份", startAt: "07:30", endAt: "10:30", owner: "刘芳", priority: "normal", status: "in_progress", progress: 72, operations: [{ id: "op-6", name: "来料确认", status: "completed", at: "07:35" }, { id: "op-7", name: "切配", status: "in_progress" }, { id: "op-8", name: "低温腌制", status: "waiting" }, { id: "op-9", name: "内包装", status: "waiting" }] },
  { id: "wo-001", code: "DEMO-WO-001", productId: "p-003", productName: "时蔬净菜包", line: "蔬菜前处理加工", zoneId: "vegetable-prep", plannedQuantity: 1200, completedQuantity: 1020, unit: "份", startAt: "06:00", endAt: "09:00", owner: "张伟", priority: "normal", status: "in_progress", progress: 85, operations: [{ id: "op-10", name: "挑拣清洗", status: "in_progress" }, { id: "op-11", name: "沥水切配", status: "waiting" }, { id: "op-12", name: "分装贴标", status: "waiting" }] },
  { id: "wo-004", code: "DEMO-WO-004", productId: "p-001", productName: "宫保鸡丁净菜包分装", line: "肉类内包装间", zoneId: "meat-packing", plannedQuantity: 2000, completedQuantity: 0, unit: "份", startAt: "11:30", endAt: "13:30", owner: "李娜", priority: "normal", status: "released", progress: 0, operations: [{ id: "op-13", name: "分装贴标", status: "waiting" }, { id: "op-14", name: "质量复核", status: "waiting" }] },
  { id: "wo-005", code: "DEMO-WO-005", productId: "p-002", productName: "鱼香肉丝净菜包外包", line: "综合外包间", zoneId: "outer-packing", plannedQuantity: 1500, completedQuantity: 1500, unit: "份", startAt: "09:00", endAt: "10:30", owner: "陈勇", priority: "normal", status: "completed", progress: 100, operations: [{ id: "op-15", name: "外包装", status: "completed", at: "10:18" }, { id: "op-16", name: "入冷库", status: "completed", at: "10:25" }] },
];

export const twinZones: TwinZone[] = [
  { id: "receiving", name: "收货与更衣区", shortName: "收货", status: "normal", progress: 95, temperature: "18°C", humidity: "52%RH", equipment: "收货台、换鞋区、更衣柜", owner: "赵敏" },
  { id: "depacking", name: "脱包暂存", shortName: "脱包", status: "normal", progress: 92, temperature: "16°C", humidity: "54%RH", equipment: "脱包台与暂存架", owner: "周工" },
  { id: "inspection", name: "检验室", shortName: "检验", status: "normal", progress: 98, temperature: "20°C", humidity: "50%RH", equipment: "快速检测台 QC-02", owner: "孙工" },
  { id: "meat-prep", name: "肉类前处理加工", shortName: "肉类前处理", status: "running", progress: 68, temperature: "12.4°C", humidity: "55%RH", equipment: "解冻池、工作台、杀鱼台", owner: "王强" },
  { id: "vegetable-prep", name: "蔬菜前处理加工", shortName: "蔬菜前处理", status: "running", progress: 85, temperature: "14.2°C", humidity: "58%RH", workOrderId: "wo-001", equipment: "带垃圾桶、脱水机、去皮机", owner: "张伟" },
  { id: "meat-cutting", name: "肉类切配间", shortName: "肉类切配", status: "running", progress: 58, temperature: "12.6°C", humidity: "55%RH", workOrderId: "wo-003", equipment: "切肉机、绞肉机、锯骨机", owner: "王强" },
  { id: "vegetable-cutting", name: "蔬菜切配间", shortName: "蔬菜切配", status: "running", progress: 72, temperature: "12.6°C", humidity: "58%RH", workOrderId: "wo-002", equipment: "双列切配台与刀具架", owner: "刘芳" },
  { id: "vegetable-packing", name: "蔬菜内包装间", shortName: "蔬菜内包", status: "normal", progress: 64, temperature: "12.4°C", humidity: "50%RH", equipment: "双室真空包装机", owner: "陈勇" },
  { id: "meat-packing", name: "肉类内包装间", shortName: "肉类内包", status: "waiting", progress: 0, temperature: "12.2°C", humidity: "51%RH", workOrderId: "wo-004", equipment: "双室真空包装机", owner: "李娜" },
  { id: "outer-packing", name: "综合外包间", shortName: "综合外包", status: "normal", progress: 100, temperature: "12.8°C", humidity: "49%RH", workOrderId: "wo-005", equipment: "外包装台与覆膜机", owner: "陈勇" },
  { id: "cold-chain", name: "冷链仓储区", shortName: "冷链仓储", status: "warning", progress: 76, temperature: "2.8°C", humidity: "46%RH", equipment: "冷藏库、冷冻库、包材库", owner: "李婷" },
  { id: "dispatch", name: "发货缓冲区", shortName: "发货", status: "running", progress: 70, temperature: "18°C", humidity: "52%RH", equipment: "发货缓冲台与货梯", owner: "陈凯" },
];

export const activityEvents: ActivityEvent[] = [
  { id: "a-1", title: "温度告警", detail: "肉类前处理间温度超过控制值 12°C", time: "09:15", tone: "danger" },
  { id: "a-2", title: "设备停机", detail: "切配机 CT-02 异常停机", time: "08:47", tone: "warning" },
  { id: "a-3", title: "能耗异常", detail: "包装区能耗较基准上升 18%", time: "08:20", tone: "warning" },
  { id: "a-4", title: "库存预警", detail: "鸡胸肉低于安全库存 80kg", time: "07:55", tone: "warning" },
  { id: "a-5", title: "环境异常", detail: "冷藏暂存区湿度高于 75%RH", time: "07:30", tone: "danger" },
];

export const masterData: Record<string, MasterRecord[]> = {
  company: [{ id: "m-1", code: "ORG001", name: "美味中央厨房", meta: "统一社会信用代码 91440300MA5NORA01", status: "正常" }, { id: "m-2", code: "CERT01", name: "食品生产许可证", meta: "有效期至 2028-06-30", status: "正常" }],
  organization: [{ id: "m-3", code: "FAC001", name: "深圳净配菜工厂", meta: "下设 3 个前处理车间、4 条包装线", status: "正常" }, { id: "m-4", code: "LINE03", name: "净菜组配线", meta: "负责人 王强 · 产能 800份/小时", status: "正常" }],
  employees: [{ id: "m-5", code: "E10028", name: "张伟", meta: "切配员 · A班 07:00-15:00", status: "正常" }, { id: "m-6", code: "E10036", name: "王强", meta: "前处理组长 · 生产主管", status: "正常" }, { id: "m-7", code: "E10052", name: "李娜", meta: "包装员 · B班", status: "待审核" }],
  suppliers: [{ id: "m-8", code: "GYS001", name: "佳农食品（中国）有限公司", meta: "禽肉类 · 月结30天", status: "正常" }, { id: "m-9", code: "GYS008", name: "深圳市绿源蔬菜有限公司", meta: "叶菜类 · 周结", status: "正常" }],
  access: [{ id: "m-10", code: "ROLE01", name: "老板", meta: "经营分析与全局查看", status: "正常" }, { id: "m-11", code: "ROLE02", name: "生产主管", meta: "排产、工单、异常与质检", status: "正常" }, { id: "m-12", code: "ROLE03", name: "工位员工", meta: "MES任务执行", status: "正常" }, { id: "m-13", code: "ROLE04", name: "客户", meta: "仅查看本客户订单", status: "正常" }],
  dictionaries: [{ id: "m-14", code: "UNIT_KG", name: "千克", meta: "重量单位 · kg", status: "正常" }, { id: "m-15", code: "TAX_06", name: "商品税率 6%", meta: "净菜商品默认税率", status: "正常" }, { id: "m-16", code: "CAT_PREP", name: "净菜包", meta: "产品分类", status: "正常" }],
  numbering: [{ id: "m-17", code: "SO", name: "销售订单", meta: "SO + YYYYMMDD + 4位流水", status: "正常" }, { id: "m-18", code: "RW", name: "生产工单", meta: "RW + YYYYMMDD + 3位流水", status: "正常" }, { id: "m-19", code: "LL", name: "领料单", meta: "LL + YYYYMMDD + 3位流水", status: "正常" }],
  "print-templates": [{ id: "m-20", code: "TPL001", name: "生产箱签", meta: "100×70mm · 批次/品名/数量/日期", status: "正常" }, { id: "m-21", code: "TPL002", name: "配送清单", meta: "A4 纵向 · 客户维度", status: "正常" }],
  initialization: [{ id: "m-22", code: "IMP001", name: "商品与生产配方初始化", meta: "校验通过 1,286 条", status: "正常" }, { id: "m-23", code: "IMP002", name: "客户与供应商导入", meta: "待处理 12 条重复编码", status: "待审核" }],
};
