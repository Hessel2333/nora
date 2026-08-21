# 本地开发手册

## 环境要求

- Node.js 20 以上，推荐当前 LTS
- pnpm 10.26.0（与 `packageManager` 和 CI 保持一致）
- Docker Desktop 或兼容的 Docker Engine
- Docker Compose

## 首次启动

```bash
cp .env.example .env
pnpm install
pnpm dev:full
```

`dev:full` 会依次执行：

1. 启动 `postgres:16.13-alpine` 容器并等待健康检查通过。
2. 执行已提交的 Prisma migrations。
3. 幂等初始化 Nora 演示组织、客户、商品、订单和 BOM。
4. 并行启动 Next.js 与 NestJS。

开发前端使用独立的 `.next-dev` 输出目录，生产构建继续使用 `.next`。这样可以在开发服务运行时执行 `pnpm build`，不会用生产产物污染热更新清单。

Seed 不会覆盖已有组织数据；检测到 `NORA-DEMO` 后会直接跳过。

## 单独运行

```bash
pnpm db:up
pnpm db:deploy
pnpm db:seed
pnpm dev:api
pnpm dev:web
```

## 数据库变更

先修改 `apps/api/prisma/schema.prisma`，然后执行：

```bash
pnpm db:migrate -- --name describe_change
pnpm db:generate
pnpm typecheck
pnpm test
```

必须提交生成的 migration。不要直接修改已进入主分支的 migration，也不要用 `db push` 代替可审查的迁移。

## 健康检查

```bash
curl http://localhost:3100/api/v1/health
curl http://localhost:3100/api/v1/orders
curl http://localhost:3100/api/v1/boms
```

或执行只读 Smoke Test：

```bash
pnpm test:smoke
```

Swagger UI 位于 `http://localhost:3100/api/docs`。

## 验证 production 身份与权限

development 默认使用服务端固定开发身份。需要验证真实登录、Bearer token、组织范围和职责权限时，使用版本化的本地 Keycloak Realm；完整步骤见[本地 OIDC 与职责权限验证](./local-identity.md)。

## 常见问题

### Docker API 不可用

先启动 Docker Desktop，再运行 `pnpm db:up`。

### 54329 端口占用

修改 `compose.yaml` 的宿主机端口，并同步修改 `.env` 中的 `DATABASE_URL`。

### 前端仍显示演示数据

确认当前确实使用 `NORA_MODE=demo`。`development` 和 `production` 模式都不会在 API 不可用时静默回退到 Mock；请检查健康接口、`.env` 中的 `NEXT_PUBLIC_API_BASE_URL` 和页面顶部的环境状态。

## 停止服务

结束 Web/API 进程后运行：

```bash
pnpm db:down
```

该命令保留数据库卷。除非明确需要重建本地数据，不要删除 `nora_postgres_data` 卷。
