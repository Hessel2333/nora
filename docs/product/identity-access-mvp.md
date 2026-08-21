# 可信身份与职责权限 MVP

## 目标

让 Nora 的生产查询和正式写入由经过 OIDC 验证的真实用户执行，并在服务端按业务职责授权；客户端传入的姓名、角色选择器或页面隐藏不能成为权限事实。

## 当前问题

development 允许固定开发身份，production 则拒绝全部写入。这样可以避免伪造审计，但真实试点无法登录、无法区分订单审核、计划、仓储、现场操作和质量判定职责，也无法形成可信操作者记录。

## 产品边界与证据

- 目标角色：订单人员、审核人员、配方管理员、计划员、仓储人员、现场操作员、生产主管、质量人员和系统管理员。
- 当前事实来源：OIDC access token、Nora 服务端权限映射和现有业务数据库。
- Build / Buy / Integrate：登录、密码、MFA、SSO 和用户生命周期集成 Keycloak/OIDC；Nora 自有业务命令到权限的映射。

## 角色与权限

| OIDC 角色 | Nora 权限 | 主要任务 |
| --- | --- | --- |
| `nora_sales_operator` | `orders:write` | 创建、修改、提交订单 |
| `nora_order_approver` | `orders:approve` | 审核通过、退回订单 |
| `nora_recipe_manager` | `recipes:write` | 配方及版本维护、发布、停用 |
| `nora_planner` | `planning:write` | 建立、确认和释放生产批次 |
| `nora_inventory_operator` | `inventory:write` | 期初登记、工单领料和退料 |
| `nora_production_operator` | `execution:operate` | 工单执行、实际耗用/报损和报产 |
| `nora_production_supervisor` | `execution:operate`、`execution:supervise` | 现场执行与异常恢复 |
| `nora_quality_inspector` | `quality:inspect` | 产出质量放行或拒收 |
| `nora_admin` | 全部权限 | 运维与应急管理，不绕过业务守卫 |

一个用户可以拥有多个角色。角色只授予命令权限，不允许覆盖配方快照、库存守恒、质量检查、revision 或幂等守卫。

## 核心用例

1. 用户通过 Keycloak 使用 Authorization Code + PKCE 登录。
2. Web 只在内存保存 token，请求前刷新短期 token，并通过 `Authorization: Bearer` 发送。
3. API 使用固定配置的 JWKS URI 验证签名，并校验 `iss`、`aud`、`exp`、`iat`、`sub` 和 `organization_id`。
4. API 将受信任角色映射为权限；没有命令权限返回 `403`。
5. 业务服务从请求身份上下文取得操作者，忽略 production 请求体中的 `actor`。

## 页面入口与出口

| 用户任务 | 入口 | 成功出口 | 失败/返回 |
| --- | --- | --- | --- |
| 登录 | 任一正式 Operations 页面 | 原目标页面 | 身份服务错误页，可重试 |
| 查看身份 | 顶部用户菜单 | 当前页面 | 无 |
| 退出 | 顶部用户菜单 | Keycloak 登录页 | 当前页面 |
| 无权限命令 | 业务页面 | 不显示或禁用主动作 | 保留只读页面并解释权限 |

Showroom 保持公开演示，不携带 production token，不访问正式业务 API。

## 状态与不变量

- token 仅有 `authenticated`、`expired/invalid` 和 `identity_unavailable` 会话结果，不建立 Nora 自有密码或会话状态机。
- production 的业务接口必须有有效 Bearer token；健康检查保持公开。
- `organization_id` 必须是 UUID 且等于当前单组织配置，不能由 URL、请求体或自定义客户端 header 覆盖。
- JWKS URI、issuer、audience 和允许算法只能来自服务端配置，不能从 token 内容动态决定。
- access token 和 refresh token 不进入 Local Storage、Session Storage、日志或数据库。
- 角色只来自签名验证后的 claims；前端角色选择器只存在于 demo/development。

## API

- `GET /api/v1/auth/me`：返回当前受信任身份、组织、角色和 Nora 权限。
- 业务读接口：production 要求已认证；development 保留服务端开发身份。
- 业务写接口：在认证基础上要求控制器声明的权限。

详细契约见 [身份 API](../contracts/identity-api.md)。

## 非功能要求

- 安全：固定 HTTPS JWKS 来源；仅允许回环地址在明确本地验证时使用 HTTP；固定 `RS256`；失败关闭。
- 性能：JWKS 由验证库缓存，不能每个请求重新下载。
- 审计：记录受信任用户显示名、组织、设备/工位和服务端时间；后续增加稳定 subject 独立字段。
- 可观测性：区分 `401` 未认证/令牌无效、`403` 组织或权限不符、`503` 身份配置或 JWKS 不可用。
- 运行模式：demo 使用演示身份；development 使用开发身份且可选择接入 OIDC；production 强制 OIDC。
- 无障碍：登录错误和权限说明可被读屏读取，登录/退出按钮满足键盘和触控要求。

## 失败、迁移与恢复

- Keycloak/JWKS 不可用：已有未过期且缓存密钥可继续验证；需要新密钥时返回失败，不允许匿名降级。
- token 过期：Web 先刷新；刷新失败回到登录，不重放未确认写命令。
- 错误组织或权限：返回 `403`，不泄露目标对象是否存在。
- 回滚：移除 Web 适配器和 API guard 可回到 development；production 不允许关闭认证后继续写入。

## 不在本次范围

- 自研注册、密码找回、MFA、用户管理或 Keycloak 管理控制台替代品。
- OpenFGA、对象级 ACL、跨组织切换、多租户数据库隔离。
- 门店客户 Portal 的独立外部身份域。
- 紧急越权、审批代理、临时授权和完整审计导出。

## 验收标准

- [x] production 无 token、过期 token、错误 issuer/audience/组织时业务接口失败关闭。
- [x] 有效 token 可读取 `/auth/me`，服务端返回的权限与角色矩阵一致。
- [x] 现场操作员不能质量放行，质量人员不能报产，计划员不能审核订单。
- [x] production 写入的 actor 来自验证后的身份，客户端伪造 actor 无效。
- [x] Web 登录、刷新、退出和 `401/403/503` 状态可理解，token 不持久化。
- [x] demo/development 行为保持可验证，Showroom 不被正式登录阻断。

验证证据见 [2026-08-21 可信身份与职责权限验证](../audits/verification-2026-08-21-identity-rbac.md)。
