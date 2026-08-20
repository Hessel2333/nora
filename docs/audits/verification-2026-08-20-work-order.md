# 2026-08-20 生产工单现场状态控制验证记录

## 验证范围

本记录覆盖工单开始、暂停、继续、异常上报与恢复，包含工单/生产批次原子状态同步、revision、幂等、工位/设备上下文、追加式审计事件和响应式真实页面。它不把领料、实际投料、实际产出、完工、质量或完整 MES 描述为已完成。

## 自动化结果

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- Web：20 个测试文件、101 个测试通过。
- API：17 个测试文件、75 个测试通过。
- `pnpm build`、`pnpm build:api`：通过。
- `pnpm docs:check`：85 份 Markdown 文档链接检查通过。
- Policy 覆盖全部允许转换、非法状态、过期 revision 和批次状态投影。
- Service 覆盖原子成功、重复幂等、跨组织/不存在、批次并发冲突和 production 无可信身份失败关闭。

## 数据库与真实 API

- 新增第 12 条 migration：工单事件命令上下文、幂等唯一索引、原因约束和不可变触发器。
- 在独立空数据库 `nora_verify_work_order_20260820_1729` 从第一条 migration 执行至最新，12 条全部成功；seed 连续执行两次无重复或破坏，验证后已删除临时数据库。
- 真实 API 完成 `pending → running → paused → running → exception → pending`，revision 从 1 递增至 6。
- 开始命令用相同幂等键重复调用时状态仍为 `running`、revision 仍为 2、事件数仍为 2。
- 工单恢复到 `pending` 时来源生产批次同步恢复到 `released`；工单与批次 revision、事件一致提交。
- 直接 SQL 修改既有 `work_order_events` 被 `work_order_events_immutable` 触发器拒绝。
- `pnpm test:smoke` 已覆盖订单、配方、生产需求、生产批次确认/释放、工单全状态链、库存期初和重复幂等。

## 浏览器证据

- development 模式在 `/production/work-orders` 使用真实 API 完成开始、填写暂停原因、继续、填写异常说明和填写处置说明后退回待开工。
- 刷新后“已暂停”状态仍存在，证明不是浏览器假成功；短暂服务不可用时页面显示连接状态，没有制造本地成功。
- 1440×1000 桌面表格和 390×844 移动卡片均完成检查；移动端显示最近操作者、服务端时间与原因，主要操作达到触控尺寸。
- 浏览器控制台 0 error、0 warning；Playwright 验收结束后已关闭全部浏览器会话。
- 截图位于忽略目录 `output/playwright/work-order-execution-desktop.png` 与 `output/playwright/work-order-execution-mobile.png`。

## 仍未完成

- production 可信身份、角色、工位/设备注册和权限，因此 production 状态命令继续失败关闭。
- 工单扫码领料、实际投料、退料、损耗、报废和库存扣减。
- 实际产出、工单完工、包装/分装复核、成品批次、质量放行和入库。
- 离线命令队列、同步冲突处置、FEFO 分配和双向召回。
