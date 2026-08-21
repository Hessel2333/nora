# ADR 0009：外部 OIDC 身份与应用内业务 RBAC

- 状态：Accepted
- 日期：2026-08-21

## 决策

Nora 不自研密码、登录、MFA 或用户生命周期。Web 使用 Keycloak JavaScript adapter 的 Authorization Code + PKCE 流程；API 使用固定 issuer、audience 和 JWKS URI 验证 access token。Keycloak 角色经过 Nora 的静态映射得到业务命令权限。

当前单组织 MVP 要求已验证 token 的 `organization_id` 与 `NORA_ORGANIZATION_ID` 完全一致。对象级授权和多组织切换延后；OpenFGA 仅在应用内 RBAC 无法表达真实关系授权时评估。

## 原因

- 密码、MFA、SSO、密钥轮换和用户停用是成熟通用能力，自研风险高且不构成 Nora 差异化价值。
- 命令语义和职责分离属于 Nora 领域边界，不能只依赖前端页面隐藏或身份平台中的通用菜单权限。
- 固定可信 JWKS 来源并校验 issuer/audience/organization，可以避免接受攻击者控制的密钥地址或跨组织 token。

## 后果

- production 依赖 OIDC 可用性；配置缺失或验证失败时必须关闭业务访问。
- Web token 只在内存保存，页面刷新可能触发 SSO 检查或重新登录。
- Keycloak realm/client/role 配置成为部署契约，需要版本化样例和环境运行手册。
- 当前审计表继续保存受信任显示名；稳定 OIDC subject 独立字段和历史用户目录投影列入后续 migration。
