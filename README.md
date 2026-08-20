# Nora

Nora 将门店和客户订单，转化为可执行、可追溯、可核算的中央厨房生产批次。

当前仓库不是完整 ERP，也不是可直接投产的 MES/WMS。它包含一个可运行的 Next.js 产品原型，以及订单、生产需求、生产配方（BOM）、生产批次/工单和批次库存台账的 NestJS/PostgreSQL MVP。项目当前重点是把订单到生产的领域底座做正确，而不是继续扩展展示页面。

## 当前真实完成度

| 能力 | 当前状态 | 说明 |
| --- | --- | --- |
| 客户、商品、订单 | 后端 MVP | PostgreSQL 持久化，具备校验、乐观锁、状态事件和组织过滤 |
| 配方版本 | 后端 MVP | 已有半开有效期、未来生效、历史选择和不可编辑发布版本 |
| 订单审核到生产需求 | 后端 MVP | 同一事务完成；重复审核幂等；保存递归配方快照 |
| 物料展开 | 后端 MVP | 审核后只使用审批快照；旧数据缺完整快照时失败关闭 |
| 工艺步骤与阶段投料 | 后端 MVP | 配方版本包含有序工序，物料绑定投料步骤；支持同料多阶段，审批快照冻结工艺依据 |
| 完整食品工艺与单位换算 | 领域设计中 | 并行/返工、副产物、替代料、质量点、密度与包装换算尚未实现 |
| 生产批次与工单执行控制 | 后端 MVP | 支持合批/拆批、批次确认和基于冻结 v2 配方的一批次一工单释放；开始、暂停、继续、异常和恢复具备工位/设备上下文、revision、幂等和审计；尚未接领料、产出和完整 MES |
| 库存批次与台账 | 后端 MVP | 已有库位、批次、追加式流水、余额投影和幂等期初入账；正式查询不读取 `Product.stock`，流水由数据库禁止修改/删除 |
| 领退料、质检追溯、实际成本 | 未实现 | 尚未把工单执行、质量结果和库存流水连接为完整现场事实链 |
| Dashboard、MES、数字孪生、预测、门户 | 明确的 Demo | 仅在 `demo` 模式或 development 显式演示预览中开放，数据和操作不代表生产能力；独立的生产工单页面已有真实读取与状态命令路径 |

详细证据见 [批判性审查](docs/audits/nora-critical-review.md) 和 [UI/UX 审查](docs/audits/ui-ux-audit.md)。

## 目标业务链路

```text
订单 → 审核 → 不可变配方快照 → 生产需求 → 合批/拆批
    → 物料与库存检查 → 释放工单 → 扫码执行 → 批次/质检/成本/追溯
```

当前代码覆盖到“生产需求、版本化工艺、快照物料展开、批次确认、工单释放、工单现场状态控制和批次库存期初台账”，尚未进入完整 MES、扫码领退料、实际投料、质检和完工入库。后续阶段见 [ROADMAP.md](ROADMAP.md)。

## 运行模式

Web 与 API 必须使用一致的模式：

```dotenv
NEXT_PUBLIC_NORA_MODE=development
NORA_MODE=development
```

| 模式 | 数据与写入规则 |
| --- | --- |
| `demo` | 显式加载 Mock；本地状态只用于体验；页面显示演示标识 |
| `development` | 默认使用本地 API；API 离线时禁止写入。可从页头显式开启当前标签页隔离的“演示全部页面”预览 |
| `production` | 只允许真实后端数据；离线禁止写入；不制造演示操作者；未接真实数据的页面隐藏 |

生产环境不得静默回退到 Mock。离线 MES 未来必须使用显式同步队列、幂等键和可见同步状态，本仓库尚未实现。

## 架构

```text
Next.js Web (:3000)
        │ REST / JSON
NestJS modular monolith (:3100/api/v1)
        │ Prisma
PostgreSQL (:54329)
```

- Controller 维护 HTTP 契约；Service 编排用例和事务；Policy 保存可独立测试规则。
- 前端不访问数据库，不直接改变正式业务状态。
- 正式数据查询必须带组织边界；当前只有固定演示组织，尚无完整租户/身份系统。
- Decimal 用于数据库金额与精确数量。数据库变更必须提交 migration，禁止用 `prisma db push` 代替。

## 本地启动

环境要求：Node.js 20+、pnpm、Docker Compose。

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm dev:full
```

服务：Web <http://localhost:3000>、API <http://localhost:3100/api/v1>、OpenAPI <http://localhost:3100/api/docs>。

若只需体验静态模块，将两个 `NORA_MODE` 均设为 `demo`。验证正式写入行为时使用 `development` 并启动 API/PostgreSQL。

## 质量命令

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm build:api
pnpm setup:local
pnpm test:smoke
pnpm docs:check
```

涉及 schema 时还需从空数据库执行全部 migrations、重复运行 seed，并验证历史数据迁移。CI 定义见 [.github/workflows/ci.yml](.github/workflows/ci.yml)。

## 阅读顺序

1. [AGENTS.md](AGENTS.md) — 所有人和智能体必须遵守的规则
2. [产品边界](PRODUCT.md) — 为什么做、为谁做、当前不做什么
3. [文档入口](docs/index.md) — 产品、领域、实现和验证事实源
4. [统一术语](docs/domain/glossary.md) 与 [上下文地图](docs/domain/context-map.md)
5. [订单到生产批次](docs/domain/order-to-batch.md) 与相关状态机
6. 对应目录最近的 `AGENTS.md`

## 仓库结构

```text
src/                  Next.js Web；正式页面与明确 Demo 表面
apps/api/             NestJS + Prisma 模块化单体
docs/product/         产品边界与 Build / Buy / Integrate
docs/domain/          统一术语、流程和业务不变量
docs/state-machines/  正式对象生命周期
docs/decisions/       ADR 与待人工决策项
docs/contracts/       API、数据库和事件契约
docs/audits/          可复核的审查证据
```

许可证尚未决定。选项与影响见 [license-options.md](docs/decisions/license-options.md)；不要把仓库可见性当作授权许可。
