# 生产批次 API 契约

## `GET /api/v1/production-batches`

用途：读取当前组织最近 100 张生产批次，按计划时间升序、批次号降序返回。

响应：`{ "data": ProductionBatch[] }`。每张批次包含 Decimal 字符串计划量、冻结 BOM 摘要、来源需求/订单分配和审计事件。查询必须带服务端组织边界；当前接口不提供跨组织参数。

## `POST /api/v1/production-batches`

用途：把兼容生产需求数量原子分配到一张生产批次草稿。

权限：生产计划员，当前组织；production 身份接入前拒绝写入。

运行模式：development 正式写入；production 失败关闭；demo 使用隔离浏览器状态。

幂等键：必填请求头 `Idempotency-Key`，1–80 字符，同组织唯一。

并发控制：事务内锁定来源需求行，批次 `revision` 初始为 1。

### 请求

```json
{
  "scheduledFor": "2026-08-21T02:00:00.000Z",
  "actor": "开发环境用户",
  "allocations": [
    {
      "productionDemandLineId": "uuid",
      "quantity": "120.000"
    }
  ]
}
```

### 成功响应

状态码：`201`

```json
{
  "id": "uuid",
  "code": "PB202608200001",
  "status": "draft",
  "productCode": "CP0001",
  "productName": "宫保鸡丁净菜包",
  "plannedQuantity": "120.000",
  "unit": "份",
  "bomVersionSnapshot": "V2.1",
  "snapshotSchemaVersion": 2,
  "processStepCount": 5,
  "releaseReady": true,
  "scheduledFor": "2026-08-21 10:00",
  "allocations": [
    {
      "productionDemandLineId": "uuid",
      "productionDemandCode": "PD202608200004",
      "salesOrderCode": "SO202608200003",
      "customerName": "盒马鲜生南山店",
      "allocatedQuantity": "120.000"
    }
  ]
}
```

### 失败响应

| 状态码 | 业务场景 | 稳定错误标识 |
| --- | --- | --- |
| 400 | 幂等键、日期、数量或请求结构非法 | `BATCH_INPUT_INVALID`（统一错误信封待实现） |
| 404 | 任一需求行不属于当前组织或不存在 | `DEMAND_LINE_NOT_FOUND` |
| 409 | 超额分配或并发分配冲突 | `DEMAND_ALLOCATION_CONFLICT` |
| 422 | 商品、单位、工厂、BOM 不兼容或快照不完整 | `BATCH_INCOMPATIBLE_DEMANDS` |

### 副作用与事务

- 原子写入：生产批次、来源分配、批次审计事件、生产需求状态和需求审计事件。
- 失败回滚：不得留下孤立批次、部分分配或错误需求状态。
- 重试结果：相同组织和幂等键返回原批次。
- 审计身份：production 不接受客户端伪造，未接认证时拒绝命令。

### 兼容性

- 所有新批次数量使用 Decimal 字符串。
- 日期沿用 Asia/Shanghai 本地展示格式，输入必须是 ISO 8601。
- 删除来源分配、改变快照或数量语义属于破坏性变更。

## `POST /api/v1/production-batches/:id/confirm`

用途：生产主管确认草稿批次的来源、数量、时间和冻结生产依据。

运行模式：development 正式写入；production 在真实身份接入前拒绝；demo 使用隔离浏览器状态。

幂等键：必填请求头 `Idempotency-Key`，1–80 字符；同组织命令唯一。

请求：

```json
{
  "revision": 1,
  "actor": "开发环境用户"
}
```

成功：返回更新后的 `ProductionBatch`，`status = confirmed`、`revision = 2`，并包含 `ProductionBatchEvent.confirmed`。

守卫：只有 `draft` 可确认；计划量必须为正，冻结配方快照必须完整。过期 revision、重复使用到其他命令的幂等键返回 `409`。

## `POST /api/v1/production-batches/:id/release`

用途：从已确认批次的冻结生产依据原子创建一张真实生产工单。

幂等键与运行模式同确认命令。

请求：

```json
{
  "revision": 2,
  "actor": "开发环境用户"
}
```

成功：返回更新后的 `ProductionBatch`，`status = released`、revision 增加，并包含新建的 `workOrder`。

原子副作用：

- 创建一张 `WorkOrder.pending` 和 `WorkOrderEvent.created`。
- 工单复制批次冻结的商品、Decimal 数量、单位、计划时间、BOM 版本和完整配方快照。
- 写入 `ProductionBatchEvent.released`，记录工单 ID、编号和工序数。
- 批次进入 `released`。

守卫：

- 只有 `confirmed` 可释放，revision 必须匹配。
- 只接受完整 `recipeSnapshot.schemaVersion = 2`，且至少含一个工序和工作中心。
- 一个批次只允许一张工单；重复幂等请求返回已有结果，不重复建单。

### 命令失败响应

| 状态码 | 场景 |
| --- | --- |
| 400 | 缺少/非法幂等键、revision 或生产环境无可信身份 |
| 404 | 批次不存在或不属于当前组织 |
| 409 | 状态不允许、revision 过期、幂等键冲突或并发命令冲突 |
| 422 | 数量、冻结配方、v2 工艺或工作中心不完整 |
