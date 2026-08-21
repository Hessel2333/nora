# Nora 文档地图

Nora 的文档按四层组织。任何功能实现都应能从产品边界追溯到领域规则、技术决策和验收证据。

## 1. 产品层：为什么做、为谁做

- [愿景](./product/vision.md)
- [目标客户](./product/target-customers.md)
- [明确不做什么](./product/non-goals.md)
- [成功指标](./product/success-metrics.md)
- [Build / Buy / Integrate 决策](./product/build-vs-buy.md)
- [配方工艺工作台功能规格](./product/recipe-process-workbench.md)
- [生产需求工作台功能规格](./product/production-demand-workbench.md)
- [生产批次分配功能规格](./product/production-batch-allocation.md)
- [库存台账底座与期初入账功能规格](./product/inventory-ledger-foundation.md)
- [生产工单现场状态控制功能规格](./product/work-order-execution-control.md)
- [生产工单领料与退料功能规格](./product/work-order-material-movement.md)
- [生产工单物料耗用与报损核销功能规格](./product/work-order-material-usage-reconciliation.md)
- [生产工单产出、质检与成品入库功能规格](./product/work-order-output-quality-release.md)

## 2. 领域层：业务事实是什么

- [统一术语表](./domain/glossary.md)
- [限界上下文](./domain/context-map.md)
- [门店订单到生产批次](./domain/order-to-batch.md)
- [配方、版本、单位与损耗](./domain/recipe-and-uom.md)
- [库存、批次与台账](./domain/inventory-and-lot.md)
- [质量与追溯](./domain/quality-and-traceability.md)
- [工单产出、质量放行与成品入库流程](./domain/work-order-output-quality-flow.md)
- [工单物料耗用与报损核销流程](./domain/work-order-material-reconciliation-flow.md)
- [完整业务样例](./domain/examples/store-orders-to-batch.md)

## 3. 契约层：系统如何保证不变量

- [运行模式契约](./contracts/runtime-modes.md)
- [配方版本生命周期](./contracts/bom-version-lifecycle.md)
- [配方快照 v1/v2](./contracts/recipe-snapshot-v1.md)
- [生产需求 API 契约](./contracts/production-demand-api.md)
- [生产批次 API 契约](./contracts/production-batch-api.md)
- [生产工单 API 契约](./contracts/work-order-api.md)
- [库存 API 契约](./contracts/inventory-api.md)
- [销售订单状态机](./state-machines/sales-order.md)
- [生产需求状态机](./state-machines/production-demand.md)
- [生产批次状态机](./state-machines/production-batch.md)
- [工单状态机](./state-machines/work-order.md)
- [架构决策记录](./decisions/README.md)
- [净配菜加工边界](./decisions/0006-net-prep-processing-boundary.md)
- [质量放行控制成品入账与工单完工](./decisions/0007-quality-release-controls-finished-goods-posting.md)
- [领出物料核销不重复改变库存余额](./decisions/0008-issued-material-disposition-is-not-a-second-stock-movement.md)

## 4. 交付层：怎样协作与验证

- [AI 协作指南](./ai-collaboration.md)
- [关键审查报告](./audits/nora-critical-review.md)
- [UI/UX 审查](./audits/ui-ux-audit.md)
- [仓库资产审查](./audits/repository-assets.md)
- [2026-08-18 验证记录](./audits/verification-2026-08-18.md)
- [2026-08-19 P0 完成审计](./audits/p0-completion-audit-2026-08-19.md)
- [2026-08-20 净菜 BOM 与 P0 复核](./audits/verification-2026-08-20.md)
- [2026-08-20 库存台账底座验证](./audits/verification-2026-08-20-inventory.md)
- [2026-08-20 生产工单现场状态控制验证](./audits/verification-2026-08-20-work-order.md)
- [2026-08-20 生产工单领退料验证](./audits/verification-2026-08-20-work-order-material.md)
- [2026-08-21 工单产出、质量与成品入库验证](./audits/verification-2026-08-21-work-order-output-quality.md)
- [2026-08-21 工单物料耗用与报损核销验证](./audits/verification-2026-08-21-work-order-material-reconciliation.md)
- [本地开发](./runbooks/local-development.md)
- [功能规格模板](./templates/feature-spec.md)
- [工作流规格模板](./templates/workflow-spec.md)
- [API 契约模板](./templates/api-contract.md)
- [测试计划模板](./templates/test-plan.md)
- [任务拆解模板](./templates/task-breakdown.md)

## 文档状态

`docs/architecture/`、`docs/ui-flows/` 中的旧文档仍可用于理解早期原型，但若与本页链接的领域契约或 ADR 冲突，以后者为准。
