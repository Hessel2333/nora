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

## 稳定错误语义

| HTTP | 场景 | 用户动作 |
| --- | --- | --- |
| 400 | 缺少幂等键/命令上下文、字段格式错误、production 无可信身份 | 补全上下文或完成身份接入 |
| 404 | 工单不存在或不属于当前组织 | 刷新任务列表 |
| 409 | 状态非法、revision 过期、幂等键被其他命令使用或批次投影不一致 | 刷新后重新判断 |
| 500 | 事务失败 | 保留原幂等键重试 |

## 不变量

- 查询固定带服务端组织边界，不接受客户端组织参数。
- 数量以 Decimal 字符串返回。
- 工序来自工单冻结的 v2 配方快照，禁止读取最新 BOM 补齐或替换。
- 一张工单必须追溯到唯一生产批次，批次可继续追溯到生产需求和订单分配。
- 状态命令原子更新工单与来源生产批次，并分别追加审计事件。
- 命令事件记录组织、操作者、工位、设备、前后状态、原因、幂等键和服务端时间，事件只追加。
- 完工命令尚未开放；实际产出、损耗和成品批次未提交前不得完成工单。
