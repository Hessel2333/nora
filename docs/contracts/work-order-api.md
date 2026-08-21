# 生产工单 API 契约

## `GET /api/v1/work-orders`

用途：读取当前组织最近 100 张真实生产工单，按计划开工时间升序、工单号降序返回。

响应：

```json
{
  "data": [
    {
      "id": "uuid",
      "code": "WO202608200001",
      "productionBatchId": "uuid",
      "productionBatchCode": "PB202608200001",
      "factoryCode": "SZ-CENTRAL",
      "factoryName": "深圳中央工厂",
      "productId": "uuid",
      "productCode": "CP0001",
      "productName": "宫保鸡丁净菜包",
      "plannedQuantity": "120.000",
      "unit": "份",
      "selectedBomVersionId": "uuid",
      "bomVersionSnapshot": "BOM-CP0001 / V2.1",
      "snapshotSchemaVersion": 2,
      "scheduledStartAt": "2026-08-21 10:00",
      "workCenter": "肉类前处理间",
      "status": "pending",
      "revision": 1,
      "operations": [
        {
          "code": "OP10",
          "name": "低温解冻与来料确认",
          "kind": "receive",
          "sequence": 10,
          "workCenter": "肉类前处理间",
          "durationMinutes": 12,
          "waitMinutes": 0,
          "temperatureMin": 0,
          "temperatureMax": 10,
          "instructions": "核对批次与中心温度"
        }
      ],
      "events": []
    }
  ]
}
```

## 状态命令

以下命令均要求请求头 `Idempotency-Key`，长度 1–80；请求体共同字段为：

```json
{
  "revision": 1,
  "workstationCode": "肉类前处理间",
  "deviceId": "WEB-DEVELOPMENT",
  "actor": "开发环境用户"
}
```

`actor` 仅在 demo/development 使用；production 必须从认证上下文取得。可信身份尚未接入前，production 拒绝所有写命令。

| API | 允许转换 | 附加字段 |
| --- | --- | --- |
| `POST /work-orders/:id/start` | `pending → running` | 无 |
| `POST /work-orders/:id/pause` | `running → paused` | `reason`，1–500 字符 |
| `POST /work-orders/:id/resume` | `paused → running` | 无 |
| `POST /work-orders/:id/report-exception` | `pending/running/paused → exception` | `reason`，1–500 字符 |
| `POST /work-orders/:id/recover` | `exception → pending/running` | `reason`，1–500 字符；`targetStatus` 为 `pending` 或 `running` |

成功响应为最新 `ProductionWorkOrder`。相同幂等键和相同命令重复提交返回当前同一工单，不追加第二条事件。

## 产出与质量

### `GET /api/v1/work-orders/:id/outputs`

返回当前组织工单、最近 20 条实际产出、追加式质量检查、成品入库结果和同工厂启用的成品库位。待检批次会返回，但在质量放行前没有库存流水或余额。

### `POST /api/v1/work-orders/:id/outputs`

请求头：`Idempotency-Key: work-order-output:<uuid>`。

```json
{
  "revision": 2,
  "quantity": "118.000",
  "unit": "份",
  "lotCode": "FG-20260821-001",
  "expiresAt": "2026-08-23T15:59:00.000Z",
  "varianceReason": "修整损耗导致少产 2 份",
  "workstationCode": "净菜包装间",
  "deviceId": "WEB-DEVELOPMENT",
  "actor": "开发环境用户"
}
```

仅允许 `running → awaiting_quality`。系统创建 `WorkOrderOutput.pending_quality` 和 `InventoryLot.pending`，复制冻结配方末道工序温度上下限，并同步生产批次；不创建库存流水。实际数量与计划不一致时必须填写差异原因。

### `POST /api/v1/work-orders/:workOrderId/outputs/:outputId/inspect`

请求头：`Idempotency-Key: quality-inspection:<uuid>`。

```json
{
  "workOrderRevision": 3,
  "outputRevision": 1,
  "decision": "released",
  "standardVersion": "Q-NET-PREP-V1.2",
  "sampleQuantity": 5,
  "measuredTemperature": "8.50",
  "appearancePassed": true,
  "packageSealPassed": true,
  "labelPassed": true,
  "locationId": "uuid",
  "note": "抽检通过",
  "workstationCode": "质量检验台",
  "deviceId": "WEB-DEVELOPMENT",
  "actor": "质量人员"
}
```

- `released`：要求三个检查项通过、实测温度在产出冻结范围内且库位是同工厂启用成品库。事务追加质量检查，批次改为 `released`，追加 `produce/inbound` 流水和余额，并将工单/生产批次改为 `completed`。
- `rejected`：必须填写说明。事务追加质量检查，批次改为 `rejected`，工单/生产批次改为 `exception`，不创建库存流水或余额。
- 质量检查不可修改或删除；拒收后可按工单异常恢复流程重新生产并申报新批次，旧记录继续保留。

## 稳定错误语义

| HTTP | 场景 | 用户动作 |
| --- | --- | --- |
| 400 | 缺少幂等键/命令上下文、字段格式错误、production 无可信身份 | 补全上下文或完成身份接入 |
| 404 | 工单、产出或成品库位不存在/不属于当前组织 | 刷新任务列表或库位 |
| 409 | 状态非法、revision 过期、批次号冲突、已有待检/放行产出、幂等键被其他命令使用或批次投影不一致 | 刷新后重新判断 |
| 422 | 冻结配方/单位不完整，或质量检查、温度不满足放行条件 | 修正生产依据或判定为不合格 |
| 500 | 事务失败 | 保留原幂等键重试 |

## 不变量

- 查询固定带服务端组织边界，不接受客户端组织参数。
- 数量以 Decimal 字符串返回。
- 工序来自工单冻结的 v2 配方快照，禁止读取最新 BOM 补齐或替换。
- 一张工单必须追溯到唯一生产批次，批次可继续追溯到生产需求和订单分配。
- 状态命令原子更新工单与来源生产批次，并分别追加审计事件。
- 命令事件记录组织、操作者、工位、设备、前后状态、原因、幂等键和服务端时间，事件只追加。
- 工单不能通过通用状态命令直接完成；只有待检产出质量放行并成功入库的同一事务可以完成。
- 产出温度依据从工单冻结 v2 配方复制，历史判定不得读取最新 BOM。
- 同一工单最多一个待检产出和一个放行产出；首版不支持多次部分报产累计完工。
