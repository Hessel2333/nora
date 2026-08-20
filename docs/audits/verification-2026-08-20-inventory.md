# 2026-08-20 库存台账底座验证记录

## 验证范围

本记录覆盖库存库位、库存批次、追加式库存流水、余额投影、幂等期初入账、正式库存查询和响应式库存页面。它不把采购收货、扫码领料、质检、成品入库或完整 WMS 描述为已完成。

## 自动化结果

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- Web：19 个测试文件、97 个测试通过。
- API：15 个测试文件、58 个测试通过。
- API 构建：通过。
- 库存 Service 覆盖原子成功、重复幂等键、组织边界、单位冲突和正式余额查询。
- DTO 覆盖 Decimal 精度和质量状态白名单。

## 数据库与真实 API

- 在独立空数据库 `nora_inventory_verify_20260820_1628` 从第一条 migration 执行至最新，共 11 条全部成功。
- seed 连续执行两次：首次初始化，第二次只同步 4 个库存库位，没有重复业务数据。
- 真实 API 期初入账 `5.000 kg` 后产生 1 条流水和相等余额；相同幂等键重复调用仍只有同一流水和 `5.000 kg`。
- 直接 SQL `UPDATE inventory_transactions` 被 `inventory_transactions_immutable` 触发器拒绝。
- 临时数据库完成验证后已删除；本地开发库已应用最新 migration 并补齐库位。
- `pnpm test:smoke` 已扩展并通过订单/BOM、库存期初入账、库存查询和重复幂等验证。

## 浏览器证据

- development 模式在 `/inventory/stock` 以真实 API 创建 `QA-INV-20260820-001`，数量 `12.500 kg`，质量状态“已放行”，写入后页面与最近流水立即更新。
- 刷新页面后批次、余额和流水仍存在，证明不是浏览器假成功。
- 1440×1000 桌面表格和 390×844 移动卡片均完成检查；移动端保留 44px 触控目标和单列任务流。
- 浏览器控制台 0 error、0 warning。
- 截图位于忽略目录 `output/playwright/inventory-stock-desktop.png` 与 `output/playwright/inventory-stock-mobile.png`。

## 仍未完成

- production 真实身份、角色和库位权限；因此正式写命令继续失败关闭。
- 工单开工/暂停/恢复、扫码领料、实际投料、退料、损耗、报废与成品入库。
- 质量检查/放行、库存预占、完整 UOM 换算、FEFO 分配和投影重建/对账作业。
- 离线队列、设备身份、外部 ERP/采购收货适配器和双向召回。
