# 2026-08-21 可信身份与职责权限验证

## 验证范围

- production OIDC access token 的签名、issuer、audience、时效和单组织范围。
- 九种 Nora 角色到八项业务命令权限的服务端映射。
- 控制器命令权限、可信请求身份和客户端操作者伪造防护。
- Web 授权码 + PKCE 登录、身份显示、路由/控件权限、退出及公开 Showroom。
- demo/development 回归、类型、构建和文档契约。

## 自动化结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| API 类型 | 通过 | `pnpm typecheck:api` |
| API 单元/集成测试 | 29 文件、121 项通过 | `pnpm test:api`；包含临时 JWKS 服务、真实 RS256 token 和请求身份上下文传播 |
| Web 类型 | 通过 | `pnpm typecheck:web` |
| Web 单元测试 | 23 文件、103 项通过 | `pnpm test:web` |
| Keycloak Realm 导入 | 通过 | Keycloak 26.7.1 本地容器成功导入 `nora` Realm |
| 真实 token/RBAC 探针 | 通过 | 九种角色 `/auth/me` 一致；七组跨职责命令均返回 `403`；匿名业务接口返回 `401` |
| API production 构建/启动 | 通过 | `pnpm build:api` 后以 OIDC 环境变量运行在 3101 |
| Web production 构建/启动 | 通过 | `pnpm build` 后以 production/OIDC 配置运行在 3001 |
| 文档链接 | 通过 | `pnpm docs:check`，99 个 Markdown 文件（新增本记录前） |

OIDC 集成测试使用运行时生成的 RSA 密钥和本机临时 JWKS 服务，分别确认有效 token 成功、错误 issuer、错误 audience、过期 token 返回 `401`，跨组织 token 返回 `403`。JWKS 地址固定来自服务端环境变量。

本地 Keycloak 探针通过下列命令执行；脚本只提交无效业务体以触发权限后的 DTO 校验，不写入有效业务事实，也不输出 token：

```bash
NORA_IDENTITY_VERIFY_API_URL=http://localhost:3101/api/v1 pnpm auth:verify
```

结果：`Identity verification passed: 9 roles, 7 denied command probes.`

## 浏览器结果

使用 CLI 驱动的真实 Chromium 验证 production Web，完成后已关闭浏览器：

1. 未登录访问 `/orders`，跳转到 `Nora Local` 登录页；请求包含 Authorization Code、PKCE `S256` 和原始回跳地址。
2. 使用 `operator` 登录后返回 `/orders`，页头显示“现场 操作员 / operator”，正式订单数据正常读取。
3. 订单中心不显示新建订单动作；手工访问 `/orders/new` 显示“没有操作权限”，不渲染写入表单。
4. 手工访问 `/orders/approvals` 显示审核职责说明，不渲染审核工作台。
5. 生产工单允许现场操作命令；异常恢复按钮对普通操作员禁用。
6. 打开等待质检的产出时，只读展示记录，并明确说明没有质量判定权限；判定字段和按钮均禁用。
7. 身份菜单显示一项业务权限，退出后回到 Keycloak 登录页。
8. 退出后访问 `/showroom` 无需登录，演示章节与播放控制正常开放。

浏览器检查过程中没有提交生产命令，业务数据未被改变。

## 结论与剩余边界

可信身份和应用内职责 RBAC 已达到当前固定单组织 production MVP：正式业务 API 不再接受匿名身份，正式审计操作者来自验证后的 OIDC 上下文，前后端均按同一服务端投影权限收敛动作。

这不等于完整身份/租户平台。正式试点仍需由运维提供独立 Keycloak 部署、TLS、MFA、密码和停用策略、高可用、备份、监控及密钥轮换；Nora 后续还需稳定 subject 审计列、多组织数据隔离、用户目录投影、授权变更审计和紧急授权流程。仓库中的 Realm 只供本地验收。
