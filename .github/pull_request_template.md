## What changed / 用户结果

<!-- 用户现在可以完成什么？不要只写页面或接口。 -->

## Why

<!-- 当前问题和为什么现在需要变更。 -->

## In scope / Non-goals

- 本次：
- 明确不做：
- 运行模式：`demo / development / production`

## Mental model delta

<!-- 是否改变术语、领域对象、状态、模块边界或产品能力声明？无则写“无”。 -->

## Invariants touched

<!-- 影响哪些不可违反的规则？如何保护？ -->

## Contracts and migrations

- 涉及上下文：
- 不变量/状态机：
- API/事件/数据库变化：
- ADR 或契约链接：

## Rollout and rollback

- Migration/历史数据影响：
- Seed 是否可重复：
- 回滚或恢复方法：
- 二进制/资产变化：

## Evidence

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build` 与 `pnpm build:api`
- [ ] `pnpm docs:check`
- [ ] schema 变化：空库 migrations、重复 seed、smoke
- [ ] UI 变化：桌面/移动、正常/空/错/离线、控制台

粘贴测试日志、截图或可复现业务样例：

## Documentation updated

- [ ] 产品/领域/状态机/契约/ADR 中的适用文档已更新
- [ ] `Mental model delta` 非空时已请求对应 CODEOWNER

## 风险与人工决策

<!-- 身份、权限、许可证、业务规则或部署等未解决事项。 -->
