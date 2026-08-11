# Nora 数字孪生设计 QA

## 比对对象

- 视觉与信息密度基准：`/Users/tian/Codes/nora/prototype/ChatGPT Image 2026年7月13日 16_20_11.png`
- 工厂几何与房间关系基准：`/Users/tian/Downloads/IMG_0272.PNG`
- CAD 模型坐标基准：`/Users/tian/Codes/nora/docs/呆大厨施工图0612(1).dwg` 中第一套“工艺设备平面图”
- 旋转后的施工图重点区域：`/Users/tian/Codes/nora/output/playwright/reference-plan-crop.png`
- 实现截图：`/Users/tian/Codes/nora/output/playwright/digital-twin-cad-direct.png`
- 地图重点截图：`/Users/tian/Codes/nora/output/playwright/digital-twin-map-final.png`
- 全页并排证据：`/Users/tian/Codes/nora/output/playwright/qa-ui-comparison.png`
- 几何并排证据：`/Users/tian/Codes/nora/output/playwright/qa-geometry-comparison.png`
- 视口：1920 × 1080
- 状态：浅色主题、工厂总览、状态与批次路径开启、蔬菜切配间选中

## Findings

没有遗留的 P0、P1 或 P2 问题。

### 全视图比较

- 页面结构保留了原型的顶部指标、左侧任务/区域状态、中部地图、右侧详情和底部批次链路，主区域比例与信息层级一致。
- 实际工厂比原型中的规则矩形平面更狭长，因此地图按施工图关系采用横向长轴布局；这是以真实工厂信息优先的有意差异。
- 当前建筑主体已移除黑色 CAD 截图，使用浅色建筑图层和克制的状态色，整体密度与原型一致。

### 重点区域比较

- 几何：实现直接使用目标平面的模型空间墙轴坐标，经统一比例尺逆时针旋转；没有再对房间做独立拉伸。检验、前处理、切配、包装、冷链与发货的相对尺寸来自同一 CAD 坐标系。
- 墙体与门：实现直接显示由 DWG/DXF 提取的墙体、门套、门扇与开启弧矢量；墙与门使用同一个变换矩阵，React 不再绘制独立 Door 组件。
- 内部构造：检验台、解冻/清洗池、切配台、包装机、货架、发货暂存位和冷库分隔均按房间类型独立绘制，窄房间使用纵向设备布局。
- 状态层：选中虚线、区域色、状态胶囊和批次路径均位于建筑图层上方，不遮挡主要墙体与门洞。

## 必检表面

- 字体与排版：沿用项目中文无衬线字体栈；标题、状态、指标和图纸辅助文字层级清晰。窄房间名称采用两行排布，无溢出或截断。
- 间距与布局节奏：页面、三栏卡片和地图工具栏保持原系统间距；地图外框、建筑留白及详情栏对齐稳定。
- 色彩与令牌：背景、边框、文字与正常/运行/预警状态使用现有语义色；状态不只依赖颜色，同时有文字标签。
- 图像质量与资产保真：黑底 CAD 不再作为页面图像；施工图用于几何校准，交互地图以清晰矢量线条呈现，缩放时保持锐利。
- 文案与内容：房间名称、冷库分区、状态、批次和负责人信息均为业务文案，没有开发说明或占位解释泄漏到界面。
- 图标：页面控件继续使用项目既有图标体系，尺寸和描边一致。
- 无障碍：区域为可聚焦 SVG button 语义，支持 Enter/Space 选择；状态有文本表达，焦点和详情联动可用。
- 响应式：本轮重点验证 1920 × 1080 桌面视口；现有地图容器在较窄视口保留横向滚动，避免压扁施工图比例。

## 交互与浏览器检查

- 已用 Playwright 打开 `/digital-twin` 并验证页面可渲染。
- 已验证点击“肉类前处理加工”后右侧详情切换为对应区域。
- 已验证隐藏/显示状态和路径后地图图层同步变化。
- 已验证重新选择“蔬菜切配间”后选中框和右侧详情恢复。
- 控制台未发现地图渲染错误；仅有 `/favicon.ico` 404，不影响页面或核心任务，归类为 P3 基础站点清理项。

## Comparison History

### Iteration 1

- 发现：P1，直接使用黑色 CAD 截图作为底图，视觉上与原型浅色建筑图严重冲突，并且状态区域与底图错位。
- 修复：完全移除黑色 CAD 位图，改用可交互的浅色矢量建筑图层。
- 修复后证据：`output/playwright/digital-twin-before.png`。

### Iteration 2

- 发现：P1，房间被规则网格化，检验区、冷链仓储、前处理与发货的宽深比例不符合施工图；窄房间设备出现负宽度浏览器错误。
- 修复：以旋转后的施工图像素关系归一化房间坐标；分别调整检验、肉类前处理、切配、包装、冷库、收货与发货的宽深；为窄房间提供专用设备布局并消除负尺寸。
- 修复后证据：`output/playwright/digital-twin-geometry-v2.png`、`output/playwright/digital-twin-map-v2.png`。

### Iteration 3

- 发现：P2，建筑边界仍偏像相邻矩形，墙体、门和冷库内部构造不够接近原型图的建筑表达。
- 修复：增加外墙/内墙双线、柱位、门洞遮罩、门扇与开启弧、双物流通道、冷库四分区货架、房间专属设备及收发货缓冲构造；移除未经来源确认的数字尺寸文案。
- 修复后证据：`output/playwright/qa-ui-comparison.png`、`output/playwright/qa-geometry-comparison.png`。

### Iteration 4

- 发现：P1，截图归一化虽然方向正确，但房间宽深、走廊宽度和开门位置仍与 DWG 模型空间不一致。
- 修复：从 DWG 的三套平面中定位第一套“工艺设备平面图”，提取现有墙体、新建墙体、WALL-MOVE、门与门套图层；以 CAD 边界建立单一旋转/缩放矩阵，回填房间墙轴、柱位和主要门扇坐标。
- 修复后证据：`output/playwright/digital-twin-cad-calibrated.png`。

### Iteration 5

- 发现：P0，Iteration 4 仍混用了 CAD 门坐标与手工房间矩形，导致门扇虽然来自 CAD 数值，却没有落在手工墙洞上；此前将通用测试通过误写成几何验收通过。
- 修复：删除全部手绘墙体、门、柱和设备组件；从目标 CAD 平面直接提取 737 个墙体、门套、门扇、开启弧和设备实体，生成统一坐标的浅色 SVG 建筑层。React 仅负责状态、标签、选中和批次路径。
- 防回归：新增 CAD 来源测试，检查门、门套、新旧墙体图层以及实体总数，并禁止重新引入手绘 Door 或位图 CAD 底图。
- 修复后证据：`output/playwright/digital-twin-cad-direct.png`。

## Follow-up Polish

- [P3] 补充站点 favicon，消除开发模式下 `/favicon.ico` 的 404。
- [P3] 若后续需要工程级复核，可让设计方提供仅含目标平面的清理版 DXF；当前版本已使用原 DWG 模型坐标，工程清理版主要用于剔除办公区、文字轮廓和重复图纸。

## Implementation Checklist

- [x] 按施工图方向和比例重排房间
- [x] 以 DWG 模型空间统一坐标替换截图归一化坐标
- [x] 删除黑色 CAD 底图
- [x] 增加墙体、柱、门洞、门板与开启弧
- [x] 增加冷库分隔和房间专属内部设备
- [x] 保持区域选择、状态层、批次路径和详情联动
- [x] TypeScript、ESLint、单元测试和生产构建通过
- [x] Playwright 桌面视口与核心交互验证

final result: passed
