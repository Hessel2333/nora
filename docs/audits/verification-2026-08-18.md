# 验证记录：2026-08-18

## 2026-08-19 P0 完成门禁

订单中心、配方工艺工作台和 P0 治理整改完成后，重新执行完整根目录门禁，而不是只复用此前局部测试结果。

| 检查 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 通过，锁文件与工作区依赖一致 |
| `pnpm typecheck` | Web 与 API 通过 |
| `pnpm lint` | 通过 |
| `pnpm test` | Web 14 文件/75 测试；API 8 文件/29 测试，全部通过 |
| `pnpm build` | 28 个页面完成生产构建 |
| `pnpm build:api` | NestJS 构建通过 |
| `pnpm test:smoke` | 订单审批、递归快照、完整性摘要、需求查询和并发发布通过 |
| `pnpm docs:check` | 65 个 Markdown 文件，链接检查通过 |
| `git diff --check` | 通过 |
| `NEXT_PUBLIC_NORA_MODE=production NEXT_PUBLIC_API_BASE_URL=http://localhost:3101/api/v1 pnpm build` | 生产模式显式 API 地址构建通过 |

独立临时空库 `nora_verify_p0_20260819_1230` 的最终结果：

1. 从零顺序应用全部 6 个 migration。
2. seed 连续执行两次，第二次安全跳过；得到 4 个配方版本、16 道工序、15 条阶段投料，且没有未绑定工序的投料。
3. 数据库存在 `(id, bom_version_id)` 唯一键和阶段投料复合外键；故意把投料指向另一版本工序时被 PostgreSQL 拒绝。
4. API smoke 断言所有生产需求行都包含完整快照、`schemaVersion = 2` 且工序数大于 0。
5. 临时数据库验证结束后已删除；恢复策略仍是部署前备份、只前向应用 migration，应用回退时保留新增历史事实和快照。

最终浏览器验收覆盖桌面和 390×844 移动视口：

1. 订单中心正常读取本地 API；“新建订单”使用蓝底白字，正常流程控制台无 error/warning。
2. 配方工作台显示洗、切、腌、炒、装盒工序与阶段投料；树、图、节点详情和版本时间线联动。
3. 关系图只允许显式按钮缩放，范围限制为 75%–125%；到达边界后按钮禁用，复位和滚轮验证通过。
4. 生产构建连接独立生产 API 时能显示真实订单；`/orders/new` 被能力边界阻断，不渲染写入表单。
5. 将生产 API 模拟为 503 后，只显示“生产服务暂不可用”，没有订单、演示数据或本地假成功；移动页面宽度保持 390/390。此场景中的请求失败控制台记录是故意制造的离线证据。
6. 生产构建曾污染运行中的 Next.js 开发缓存并导致 `/orders` 返回 500；根因修复为开发使用 `.next-dev`、生产使用 `.next`。清理可再生缓存、重新启动并在 dev 运行期间再次完成生产构建后，API、`/orders` 和配方详情仍全部返回 200，且只保留一套 3000/3100 服务。

最终截图保存在被 Git 忽略的 `output/playwright/`；全路由审查基线保存在工作区外的 `nora-audit/`、`nora-current-audit/` 与 `nora-order-bom-workbench/`，不把临时截图提交进产品仓库。

## 2026-08-19 配方工艺、阶段投料与受控关系图

本次建立版本化工序、工序级阶段投料和审批快照 v2，并收敛订单/BOM 深色层级与主按钮颜色。

| 检查 | 结果 |
| --- | --- |
| `pnpm typecheck` | Web 与 API 通过 |
| `pnpm lint` | 通过 |
| `pnpm test` | Web 14 文件/75 测试；API 7 文件/27 测试，全部通过 |
| `pnpm build` | 28 个页面完成生产构建 |
| `pnpm build:api` | NestJS 构建通过 |
| `pnpm test:smoke` | 订单审批、快照展开、需求查询和 BOM 并发发布通过 |
| `pnpm docs:check` | 64 个 Markdown 文件，链接检查通过 |

数据库在临时空库 `nora_verify_bom_process_20260819` 完成验证后已删除：

1. 从零应用全部 5 个 migration。
2. 连续 seed 两次，第二次安全识别已有演示组织并跳过。
3. 查询得到 4 个配方版本、16 道工序、15 条用料，15 条全部绑定工序。
4. 新审批数据包含 `schemaVersion = 2` 的工艺/物料递归快照。
5. 历史数据库升级时，未知工艺只回填明确的“历史配料”标记；已知本地样例按可核对的演示工艺回填。
6. 初次空库验证发现样例回填在 seed 前触发外键失败，迁移随即改为仅对已存在历史版本回填；重跑全链成功。

真实浏览器在本地 API 下完成以下验收：

1. “新建订单”计算样式为蓝底 `rgb(8,117,225)`、白字 `rgb(255,255,255)`，且开发模式可进入真实 API 表单，不再落入能力边界死路。
2. 工艺路线显示“解冻清洗 → 切丁 → 腌制 → 炒制 → 装盒”，并在每一步下展示阶段投料、工位、作业/等待时长与说明。
3. 关系图只有显式缩放控件；连续放大到 125% 后按钮禁用，复位回到 100%，在图区域滚轮滚动后仍为 100%。
4. 浏览器复制 V2.2 草稿，在腌制阶段再次加入鸡胸肉并保存；数据库查询确认同一原料分别位于 `OP10`、`OP30`。
5. 刷新页面后通过版本时间线重新打开 V2.2，工艺与 7 条阶段投料完整恢复。
6. 390×844 下导航、版本摘要、水平标签与工艺摘要无页面级横向溢出；浏览器控制台无 error/warning。

## 2026-08-19 订单中心与 BOM 工作台增量

本次把订单中心、BOM 结构、订单物料展开和版本审计收敛为一条可连续操作的业务路径，并完成以下验证：

| 检查 | 结果 |
| --- | --- |
| `pnpm typecheck` | Web 与 API 通过 |
| `pnpm lint` | 通过 |
| `pnpm test` | Web 14 文件/74 测试；API 7 文件/25 测试，全部通过 |
| `pnpm docs:check` | 63 个 Markdown 文件，链接检查通过 |
| `pnpm build:web` | 28 个页面完成生产构建 |
| `pnpm build:api` | NestJS 构建通过 |
| `git diff --check` | 通过 |

浏览器在真实本地 API 数据下验证：

1. 订单中心主从布局可完成搜索、状态筛选、订单切换和生产交接判断；右侧交接栏会带订单和配方参数进入物料展开。
2. 宫保鸡丁两层 BOM 会把宫保调味汁递归展开到生抽、香醋和白砂糖，并保持树、图和节点详情联动。
3. 草稿与待审核订单显示“审核前试算”，明确使用当前有效 BOM；已审核订单只读取审批时冻结的配方快照。
4. 历史已审核订单若缺少完整快照会失败关闭，成本显示为空并提示恢复快照，不回退当前 BOM 伪造历史结果。
5. 旧的独立 BOM 爆炸图路由已重定向到统一配方工作台，避免两套业务解释并存。
6. 桌面 1600×1000 与笔记本 1280×720 下订单和 BOM 页面没有横向溢出；全新标签页的运行日志无错误。本次浏览器设备视口覆盖能力未生效，因此未新增移动截图，移动断点继续由现有响应式实现和既有移动基线约束。

证据目录：`/Users/tian/.codex/visualizations/2026/08/18/01a013e7-1cb7-7bc2-b27d-255b76a2f4c0/nora-order-bom-workbench/`。

- `01-order-center-desktop.png`：订单主列表与生产交接详情。
- `02-bom-recursive-structure-desktop.png`：两层 BOM 树、关系图和节点详情。
- `03-order-material-explosion-desktop.png`：待审核订单试算、末级物料和来源路径。

## 静态与自动化检查

| 检查 | 结果 |
| --- | --- |
| `pnpm typecheck` | Web 与 API 通过 |
| `pnpm lint` | 通过 |
| `pnpm test` | Web 13 文件/71 测试；API 7 文件/25 测试，全部通过 |
| `pnpm docs:check` | 63 个 Markdown 文件，链接检查通过 |
| `pnpm build:web` | 28 个路由完成生产构建 |
| `pnpm build:api` | NestJS 构建通过 |
| `pnpm test:smoke` | 创建订单、审批、重复审批、快照物料展开、需求和就绪查询通过 |

## 数据库验证

基础 P0 在独立空数据库 `nora_validation_20260818_230001` 验证。随后配方生命周期闭环在独立空数据库 `nora_bom_final_20260818_234100` 重新执行完整验证：

1. 从零应用 4 个 migration。
2. 连续运行 seed 两次；第二次识别已有演示组织并安全跳过。
3. 启动独立 API，运行订单/BOM smoke。
4. 查询确认 `bom_versions_valid_window_check` 与 `bom_versions_no_overlapping_validity` 两个约束存在。
5. 查询确认 seed 和 smoke 生成的生产需求均包含 `schemaVersion = 1` 完整快照。
6. 在独立历史数据库 `nora_validation_legacy_20260818_230001` 先应用首个 migration、写入旧式已审批需求，再升级余下 2 个 migration；旧记录被明确标记为 `schemaVersion = 0`、`incomplete = true`，并保留原 BOM 版本引用，没有伪造递归快照。
7. 在已有本地开发数据库应用第 4 个 migration，确认 4 个历史配方版本各回填 `created/published` 事件，操作者明确为 `migration:historical-actor-unknown`。
8. 在最终空库并发发布两个同 BOM、同生效时点的草稿；一个返回 201，一个返回 409。时间线仍只有一个计划生效版本，当前版本保持有效至未来切换时点，并写入 `published/superseded` 审计事件。
9. 最终空库 seed 直接创建的 4 个配方版本各含 `created/published` 演示审计事件；第二次 seed 安全跳过。
10. 停止验证 API 并删除所有临时数据库；本地开发数据库保留正式 migration 和诚实的历史回填事件。

恢复策略：新 migration 只增加有效期、快照、索引和约束。正式部署前备份数据库；若应用回滚，旧应用会忽略新增列。不要删除已生成快照来回滚历史业务事实。

## 浏览器验证

应用内浏览器完成桌面基线与 390×844 移动验收。当前运行证据保存在工作区外的审查目录 `nora-current-audit/`，重点包括：

- `01-dashboard-desktop.png`：Demo Dashboard 显示环境身份与演示数据来源。
- `02-orders-desktop-viewport.png`：订单中心桌面信息密度与筛选基线。
- `03-bom-desktop.png`：配方版本与有效期信息。
- `05-digital-twin-desktop.png`：数字孪生被限定为演示监测表面。
- `06-new-order-mobile.png`、`07-order-review-mobile.png`：移动新建与审核流程。
- `08-mes-mobile.png`：MES 平板式大按钮和演示执行状态。
- `11-showroom-desktop.png`：Showroom 演示身份。
- `12-production-orders-mobile.png`：生产模式已连接真实 API，且没有未接通的“新建/导入”动作。
- `13-production-write-boundary-mobile.png`：生产模式显式阻断写入路由。
- `14-production-offline-mobile.png`：生产 API 离线时失败关闭，不回退 Mock。
- `15-development-capability-boundary-mobile.png`：开发模式阻断尚无后端的业务表面。
- `16-bom-scheduled-desktop.jpg`：桌面端区分草稿、计划生效、当前生效与历史版本，并显示 revision 和审计操作者。
- `17-bom-schedule-modal-mobile.jpg`：390×844 下的计划发布对话框、未来时间提示和不可变快照说明。

浏览器复查还发现并修复了两项运行问题：客户详情 selector 每次返回新数组导致无限更新；物料展开页存在没有副作用的“生成生产需求”按钮。修复后重新加载目标页面，客户详情正常渲染，死按钮已移除。浏览器日志仍保留修复前的时间戳记录，因此最终判断以修复后的 DOM、页面状态与自动化检查共同为证，不把截图单独当作功能证明。

配方计划发布流程还实际完成了“复制新版本 → 打开发布对话框 → 选择计划生效 → 提交未来时间 → 时间线显示计划版本”的浏览器操作。首次故意选择早于已有计划版本的时间时返回明确冲突；改为更晚时间后成功。页面日志仅包含 React DevTools 和 Fast Refresh 信息，没有运行错误。
