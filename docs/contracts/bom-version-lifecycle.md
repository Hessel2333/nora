# 配方版本生命周期契约

## 目的

配方发布必须同时保护当前生产、未来计划和历史追溯。数据库状态 `draft/effective/retired` 表示治理状态；API 另返回按当前时间推导的 `validityState`，避免把已发布但尚未到达生效时点的版本称为“当前生效”。

| `validityState` | 含义 |
| --- | --- |
| `draft` | 尚未发布，可在 revision 守卫下修改 |
| `scheduled` | 已发布，`effectiveAt` 晚于当前时间 |
| `current` | 当前时点位于 `[effectiveAt, effectiveTo)` |
| `historical` | 有效窗口已经关闭，只用于历史解释 |

## 发布命令

`POST /api/v1/boms/versions/{versionId}/publish`

```json
{
  "revision": 1,
  "effectiveAt": "2026-08-20T06:00:00+08:00"
}
```

- `revision` 必填，用于阻止过期页面发布已变化的草稿。
- `effectiveAt` 省略时立即生效；提供时可计划未来生效。
- 新生效时间必须晚于时间线上最后一个已发布版本的开始时间。
- 当前开放区间在新版本 `effectiveAt` 关闭；计划生效不会提前使当前版本失效。
- 同一 BOM 的已发布有效区间由 PostgreSQL 排斥约束保证不重叠。
- 两个发布命令竞争时只能一个成功；失败方返回 HTTP 409 和可重试的业务错误，不泄漏数据库错误。
- 发布守卫要求至少一道工序、至少一条用料，且每条用料必须指向当前版本的工序。
- Nora 当前运行于净配菜业务边界：`BomOperationKind` 只包含 `receive/wash/cut/marinate/mix/cool/pack/quality`。Swagger、DTO、快照验证、Prisma 枚举和 PostgreSQL 枚举必须保持一致。

## 草稿定义命令

`PUT /api/v1/boms/versions/{versionId}` 原子替换草稿的产出基准、工艺路线和阶段投料。命令必须携带当前 `revision`。

```json
{
  "revision": 1,
  "outputQuantity": 1,
  "outputUnit": "份",
  "operations": [
    { "code": "OP10", "name": "清洗", "kind": "wash", "sequence": 10, "durationMinutes": 8 },
    { "code": "OP20", "name": "切配", "kind": "cut", "sequence": 20, "durationMinutes": 6 }
  ],
  "items": [
    { "componentProductId": "00000000-0000-4000-8000-000000000000", "operationCode": "OP10", "netQuantity": 0.2, "yieldRate": 0.9, "unit": "kg" }
  ]
}
```

- 工序 `code`、`sequence` 在版本内唯一。
- `items[].operationCode` 必须引用本次命令中的工序。
- 持久化后 `(operation_id, bom_version_id)` 复合外键继续保证投料与工序属于同一版本，避免绕过服务层产生跨版本引用。
- 同一组件可以在不同工序或同一工序重复出现；服务端按独立投料行保存。
- `operations[].kind` 必须属于 `receive/wash/cut/marinate/mix/cool/pack/quality`，只用于表达前处理、组配、冷链与包装。白名单外的值在 DTO 校验阶段返回 HTTP 400，不进入领域事务。
- 数据库检查约束 `bom_operations_net_prep_scope_check` 阻止工序名称、工作区域或作业说明写入最终加热制作及其工位语义；绕过 API 的写入同样失败。
- 失败时整次替换回滚，不允许留下工序和用料不一致的草稿。
- `POST /boms/{bomId}/versions` 复制版本时生成新工序 ID，并重建投料引用。

## 审计

`BomVersionEvent` 记录 `created/updated/published/superseded/retired`，包含组织、版本、操作者、revision、生效时点和服务端时间。版本变更与事件在同一事务内提交。

迁移前记录只回填能够从数据库证明的创建和发布时间；操作者写为 `migration:historical-actor-unknown`，不伪造人员身份。

## 恢复

部署前应备份数据库。移除旧工序类型的前向迁移只自动纠正 `NORA-DEMO` 数据并写入版本事件；检测到其他组织的白名单外工序或审批快照时必须失败关闭，等待组织级审计迁移。若应用回退，保留审计记录和有效期约束，不得通过删除历史事件或重新打开旧有效区间来回滚业务事实。
