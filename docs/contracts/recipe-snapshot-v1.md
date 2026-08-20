# 配方快照契约 v1/v2

`ProductionDemandLine.recipeSnapshot` 保存订单审批时的递归配方事实。它不是对当前 BOM 的引用缓存。

## 必填语义

```text
schemaVersion: 1
capturedAt: ISO timestamp
asAt: ISO timestamp used to resolve versions
product: { id, code, name, type, unit, unitCost }
bomVersion: { id, bomId, bomCode, version, effectiveAt, effectiveTo, outputQuantity, outputUnit }
components[]:
  product: { id, code, name, type, unit, unitCost }
  netQuantity, yieldRate, unit, unitCostSnapshot, sortOrder, notes
  recipe: nested RecipeSnapshotNode (leaf nodes have `bomVersion: null`, `components: []`)
```

## 校验

- v1 只包含物料结构，保留用于读取历史订单；不得原地补写推测的工艺。
- v2 在每个有配方的节点增加 `operations[]`，并在组件上增加 `operationCode`。
- v2 的 `operations[].code` 在节点内唯一，`sequence` 严格唯一；每个组件的 `operationCode` 必须存在于同节点工序中。
- 数据库使用 `(operation_id, bom_version_id)` 复合外键，保证阶段投料不能跨配方版本引用工序；应用层仍按工序编码校验更新命令。
- 不支持的 schema 版本或任何关键节点缺失时，快照视为不完整。
- 不完整快照必须失败关闭，不得回退到当前主数据重新展开。
- 展开物料时只读取快照中的数量、损耗和成本。
- 快照升级必须新增 schema 版本和迁移/兼容策略，不直接改变 v1 语义。

## v2 增量语义

```text
schemaVersion: 2
operations[]:
  code, name, kind, sequence
  workCenter, durationMinutes, waitMinutes
  temperatureMin, temperatureMax, instructions
components[]:
  ...v1 component fields
  operationCode
```

新审批只写 v2。物料展开可读取 v1 或 v2；工艺下发只接受 v2，v1 订单必须显示“历史快照无工艺依据”，不能读取当前工艺补齐。

生产需求摘要不能仅凭 `selectedBomVersionId` 判断就绪。行级投影同时返回 `snapshotComplete`、`snapshotSchemaVersion` 和 `processStepCount`；只有版本引用存在且快照结构完整时 `bomReady` 才为真。Smoke 以新审批必须生成 v2 且含工序作为门禁。

## 历史数据

迁移将无法还原的旧生产需求标记为 `schemaVersion: 0`、`incomplete: true`，并记录 `reason`。这类数据可显示审计提示，但不能生成可信的新物料需求。
