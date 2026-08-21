# Identity API 契约

## Bearer token

production 下除健康检查外的正式 API 都要求：

```http
Authorization: Bearer <OIDC access token>
```

服务端验证：

- 签名算法：`RS256`。
- `iss`：精确匹配 `NORA_OIDC_ISSUER`。
- `aud`：包含 `NORA_OIDC_AUDIENCE`。
- 必填 claims：`sub`、`iat`、`exp`、`organization_id`。
- `organization_id`：UUID，且等于 `NORA_ORGANIZATION_ID`。
- 角色：已验证 token 的 `realm_access.roles`，兼容顶层 `roles` 数组。

JWKS URI 仅来自 `NORA_OIDC_JWKS_URI`。API 不读取 token 中的 `jku`、`jwk` 或其他外部密钥地址。

## `GET /api/v1/auth/me`

用途：读取当前受信任身份和 Nora 权限。

权限：任何已认证的当前组织成员。

### 成功响应

```json
{
  "subject": "7cc52c6d-4d63-4cb3-bf9d-8cf68296fe91",
  "displayName": "现场操作员",
  "username": "operator",
  "organizationId": "00000000-0000-4000-8000-000000000001",
  "roles": ["nora_production_operator"],
  "permissions": ["execution:operate"]
}
```

### 失败响应

| 状态码 | 场景 | 行为 |
| --- | --- | --- |
| `401` | 缺少、过期或无效 token | 不进入业务服务 |
| `403` | token 组织不是当前组织 | 不泄露业务对象 |
| `503` | production OIDC 配置缺失或 JWKS 暂不可用 | 不降级为开发/演示身份 |

## 命令权限

| 权限 | API 命令 |
| --- | --- |
| `orders:write` | 创建、修改、提交订单 |
| `orders:approve` | 批准、退回订单 |
| `recipes:write` | 创建/修改配方与版本、发布、停用 |
| `planning:write` | 创建、确认、释放生产批次 |
| `inventory:write` | 期初库存、工单领料、退料 |
| `execution:operate` | 工单开始/暂停/继续/异常、实际耗用/报损、报产 |
| `execution:supervise` | 工单异常恢复 |
| `quality:inspect` | 产出质量放行或拒收 |

业务状态、revision、幂等和数量守卫继续执行；`nora_admin` 也不能绕过这些守卫。
