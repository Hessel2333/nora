# Nora 开发文档

## 开始开发

1. 阅读 [本地开发手册](runbooks/local-development.md)，确认 Web、API、数据库全部启动。
2. 阅读 [订单与 BOM MVP 架构](architecture/order-bom-mvp.md)，理解模块边界和依赖方向。
3. 阅读 [订单、生产需求与生产执行关系](architecture/order-demand-production-flow.md)，理解审核、聚合和拆分边界。
4. 阅读 [订单到生产状态机](state-machines/order-to-production.md)，理解状态、风险和页面步骤的边界。
5. 修改已有模块前阅读对应模块规范。
6. 新建模块时使用 [新增后端模块指南](guides/create-backend-module.md) 和 `templates/backend-module`。
7. 建任务时复制 [任务拆解模板](templates/task-breakdown.md)。

## 模块文档

- [订单中心](modules/orders/README.md)：事务单据、状态流转、快照、事件日志和乐观锁样板。
- [订单审核策略](modules/orders/order-review-policy.md)：角色分工、自动放行、例外路由和审计契约。
- [BOM](modules/boms/README.md)：版本化主数据、发布不可变、递归展开和循环检测样板。

## 页面任务流

- [订单审核](ui-flows/order-review.md)：审核任务的入口、出口、动作反馈和文案约束。

## 架构决策

- [ADR-0001：订单采用自动校验与例外人工审核](decisions/0001-hybrid-order-approval.md)

## 交付模板

- [功能规格模板](templates/feature-spec.md)
- [工作流规格模板](templates/workflow-spec.md)
- [API 契约模板](templates/api-contract.md)
- [任务拆解模板](templates/task-breakdown.md)
- [测试计划模板](templates/test-plan.md)
