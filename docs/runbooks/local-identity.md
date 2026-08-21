# 本地 OIDC 与职责权限验证

## 用途与边界

本手册用于在本机验证 Nora 的 production 登录、单组织范围、服务端权限和可信审计身份。`infra/keycloak/nora-realm.json` 包含固定本地账号、短期 token 和便于自动检查的 Direct Access Grant，只能用于开发验收，禁止导入正式 Keycloak。

正式环境应由运维单独配置 Realm、MFA、密码策略、用户生命周期、TLS、数据库、高可用、备份和密钥轮换；Nora 只消费标准 OIDC 契约。

## 启动

先启动数据库和身份服务：

```bash
pnpm setup:local
pnpm auth:up
```

在 `.env` 中使用：

```dotenv
NEXT_PUBLIC_NORA_MODE=production
NORA_MODE=production
NEXT_PUBLIC_API_BASE_URL=http://localhost:3100/api/v1
NORA_OIDC_ISSUER=http://localhost:18080/realms/nora
NORA_OIDC_AUDIENCE=nora-api
NORA_OIDC_JWKS_URI=http://localhost:18080/realms/nora/protocol/openid-connect/certs
NEXT_PUBLIC_OIDC_URL=http://localhost:18080
NEXT_PUBLIC_OIDC_REALM=nora
NEXT_PUBLIC_OIDC_CLIENT_ID=nora-web
```

然后运行 `pnpm dev:api` 和 `pnpm dev:web`。访问 `http://localhost:3000/orders` 会跳转到 Keycloak，登录后返回原工作页面。Showroom 和帮助中心保持公开。

## 本地账号

所有账号密码均为 `nora-local-only`，组织均为 Nora 的本地单组织。

| 用户名 | 角色 | 可执行任务 |
| --- | --- | --- |
| `sales` | 订单录入员 | 创建、修改、提交订单 |
| `reviewer` | 订单审核员 | 审核通过、退回订单 |
| `recipe` | 配方管理员 | 维护配方、工艺和版本 |
| `planner` | 生产计划员 | 建立、确认、释放生产批次 |
| `warehouse` | 仓储操作员 | 期初登记、工单领料和退料 |
| `operator` | 现场操作员 | 工单执行、耗用/报损、报产 |
| `supervisor` | 生产主管 | 现场执行、异常恢复 |
| `quality` | 质量检验员 | 产出质量判定 |
| `admin` | Nora 管理员 | 全部 Nora 命令权限，仍受业务状态守卫约束 |

本地 Keycloak 管理控制台为 `http://localhost:18080/admin`，默认管理员为 `admin` / `nora-local-only`。这组账号只存在于本地临时容器。

## 自动验证

当 production API 运行在 3100 端口时执行：

```bash
pnpm auth:verify
```

检查会验证公开健康接口、匿名业务访问 `401`、九种角色的 `/auth/me` 映射、允许命令进入业务校验，以及七组跨职责命令返回 `403`。脚本不会输出或持久化 token，也不会写入有效业务数据。

## 停止与重建

```bash
pnpm auth:down
```

Realm 修改后，删除并重建本地 Keycloak 容器才会重新导入。该服务使用容器内本地数据库，移除容器会清除本地身份数据；PostgreSQL 业务卷不受影响。
