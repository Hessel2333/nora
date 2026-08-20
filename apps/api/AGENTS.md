# API Local Rules

继承仓库根 [AGENTS.md](../../AGENTS.md)。本目录负责业务事实、事务和持久化，不为前端演示语义让步。

## 分层

- Controller：HTTP、DTO、状态码与 OpenAPI；不放业务流程。
- Service：用例、事务、组织边界、幂等和审计。
- Policy/纯函数：状态转换、时态选择、数量规则，可独立单测。
- Presenter：Decimal/Date/内部结构到稳定 API 输出。
- Prisma：约束、索引、migration；不要使用 `db push` 作为交付。

## 必须保护

- 所有查询和写入带 `organizationId`；不要依赖前端过滤。
- 状态命令验证来源状态、revision、权限与幂等键，并原子写事件。
- 订单审批冻结递归配方快照；历史展开只读快照。
- 配方已发布版本不可原地修改；有效区间不得重叠。
- 生产模式没有真实身份时失败关闭。
- 金额与精确数量用 Prisma Decimal；API 字符串化，前端不得把浮点结果回写为事实。

## 数据库变更 DoD

- schema、可读 migration、索引/约束、历史数据策略和恢复说明。
- 从空 Postgres 执行全部 migration；seed 连续运行两次。
- 覆盖成功、重复请求、事务失败和至少一个边界/并发场景。
- 更新相关契约、状态机或 ADR。
