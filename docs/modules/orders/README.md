# 订单中心模块

## 职责

订单模块管理销售订单聚合、订单行、状态流转、事件日志，以及审核后形成的生产需求快照。它不负责库存、生产计划、配送或财务应收。

代码位置：`apps/api/src/modules/orders`。

## 状态机

```text
draft → pending → approved → in_production → delivering → completed → reconciled
           └────────→ draft（退回修改）
```

当前 UI/API 开放 MVP 所需的草稿、提交、审核通过和退回。后续状态必须继续通过显式动作接口迁移，禁止开放任意 `PATCH status`。

完整跨对象状态机见 [订单到生产状态机](../../state-machines/order-to-production.md)，自动与人工审核边界见 [订单审核策略](order-review-policy.md)。

## API

- `GET /api/v1/orders`
- `POST /api/v1/orders`
- `GET /api/v1/orders/:id`
- `PUT /api/v1/orders/:id`
- `POST /api/v1/orders/:id/submit`
- `POST /api/v1/orders/:id/approve`
- `POST /api/v1/orders/:id/return`
- `GET /api/v1/orders/:id/production-readiness`
- `GET /api/v1/orders/:id/production-demand`
- `GET /api/v1/orders/:id/material-requirements`

## 写操作规则

1. DTO 层拒绝未知字段、非法 UUID、空订单行和非正数量。
2. 服务层校验客户、商品、当前状态和 revision。
3. 订单头、订单行和事件日志在同一个数据库事务中提交。
4. 响应通过 presenter 转为稳定的前端契约，不直接暴露 Prisma Decimal 和数据库枚举实现。
5. 审核通过时，订单状态、审核事件和生产需求必须在一个事务中提交。

## 生产需求边界

- 审核通过创建生产需求，但不创建生产计划或工单。
- 一张销售订单对应一张生产需求；一条订单行对应一条需求行。
- 需求行保存商品、数量、单位和交期对应的顶层 BOM 版本。
- 缺少 BOM 时保留需求并标记异常，进入生产计划前必须补齐。
- 多订单聚合和单订单拆分由后续生产计划模块通过数量分配关系处理。

## 扩展检查

增加新动作时必须同步完成：

- 在 `order-policy.ts` 增加允许的状态迁移。
- 新建动作端点，不复用通用状态修改接口。
- 写入明确的事件类型、文案、操作人和备注。
- 添加成功、非法来源状态和并发冲突测试。
- 更新 OpenAPI 和本文档。

涉及跨对象工作流时，还必须使用 [工作流规格模板](../../templates/workflow-spec.md) 明确对象关系、自动化边界以及页面入口和出口。
