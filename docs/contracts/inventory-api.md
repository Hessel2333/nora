# 库存 API 契约

## 通用规则

- 路径前缀：`/api/v1/inventory`。
- 服务端固定当前组织，不接受客户端 `organizationId`。
- 所有数量使用最多 3 位小数的 Decimal 字符串。
- 写命令要求 `Idempotency-Key`，长度 1–80；production 未接真实身份时返回 `400` 并拒绝写入。
- 正式库存查询不读取 `Product.stock`。

## `GET /locations`

返回当前组织启用的库存库位，按工厂和编码排序。

```json
{
  "data": [
    {
      "id": "uuid",
      "factoryCode": "SZ-CENTRAL",
      "code": "RAW-COLD-01",
      "name": "原料冷藏库",
      "type": "cold_storage",
      "active": true
    }
  ]
}
```

## `GET /stock`

可选查询参数：`productId`、`locationId`、`qualityStatus`。返回账面数量大于 0 的批次余额，按近效期优先排序，无效期排最后。

```json
{
  "data": [
    {
      "id": "uuid",
      "location": { "id": "uuid", "code": "RAW-COLD-01", "name": "原料冷藏库" },
      "product": { "id": "uuid", "code": "RM01234", "name": "冷冻鸡胸肉" },
      "lot": {
        "id": "uuid",
        "code": "OPEN-20260820-001",
        "supplierLotCode": "SUP-240820-A",
        "qualityStatus": "released",
        "receivedAt": "2026-08-20 09:00",
        "expiresAt": "2026-09-20 23:59"
      },
      "onHandQuantity": "120.000",
      "availableQuantity": "120.000",
      "unit": "kg",
      "revision": 1,
      "updatedAt": "2026-08-20 09:00"
    }
  ]
}
```

`availableQuantity` 仅在批次 `qualityStatus = released` 时等于账面数量，否则为 `0.000`。

## `GET /transactions`

可选查询参数：`productId`、`locationId`、`lotId`。返回最近 200 条追加式流水，按发生时间倒序。

## `POST /opening-balances`

请求头：`Idempotency-Key: inventory-opening:<uuid>`。

```json
{
  "locationId": "uuid",
  "productId": "uuid",
  "lotCode": "OPEN-20260820-001",
  "supplierLotCode": "SUP-240820-A",
  "quantity": "120.000",
  "unit": "kg",
  "qualityStatus": "released",
  "receivedAt": "2026-08-20T01:00:00.000Z",
  "expiresAt": "2026-09-20T15:59:00.000Z",
  "note": "上线盘点期初库存",
  "actor": "仓储主管"
}
```

成功返回创建的流水及最新余额。相同幂等键重复提交返回同一结果。

## `GET /work-orders/:id/materials`

返回工单冻结配方的叶子原料需求、累计领料、累计退料、净领用、剩余计划量，以及当前已放行批次余额（按近效期优先）。正式需求不得读取当前 BOM。

## `POST /work-orders/:id/issues`

请求头：`Idempotency-Key: work-order-issue:<uuid>`。

```json
{
  "stockBalanceId": "uuid",
  "expectedBalanceRevision": 1,
  "quantity": "5.000",
  "unit": "kg",
  "workstationCode": "肉类前处理",
  "deviceId": "WEB-DEVELOPMENT",
  "note": "首批领料",
  "actor": "开发环境用户"
}
```

仅允许从已放行、未失效批次领取冻结配方中的原料；数量不能超过计划剩余或当前余额。

## `POST /work-orders/:id/returns`

请求体与领料相同。退料回到同一余额行，累计数量不能超过该工单对同一库位、产品和批次的净领用量。

领料和退料成功均返回：

```json
{
  "transaction": {},
  "balance": {},
  "materials": {}
}
```

## 稳定错误语义

| HTTP | 场景 | 用户动作 |
| --- | --- | --- |
| 400 | 缺幂等键、数量/日期/字段格式错误、production 无可信身份 | 修正输入或完成身份接入 |
| 404 | 产品或库位不存在/不属于当前组织 | 刷新主数据后重试 |
| 409 | 批次号已存在、库存不足、超计划领料、超量退料、revision/工单状态冲突 | 刷新后更正数量或状态 |
| 422 | 冻结配方不完整、非配方原料或单位不一致 | 修正生产依据后重试 |
| 500 | 事务失败 | 保留原幂等键重试；系统不得部分入账 |

## 成品产出入库

成品入库不提供可绕过质量的独立库存命令。`POST /work-orders/:workOrderId/outputs/:outputId/inspect` 的合格放行事务追加：

- `InventoryTransaction.type = produce`
- `direction = inbound`
- `sourceType = production_output`
- 同时绑定 `workOrderId` 与 `workOrderOutputId`
- 数量、单位、商品和批次与待检产出完全一致

数据库约束要求 `production_output` 来源必须具备上述因果链、工位和设备，且每条产出最多一条入库流水。拒收产出没有库存流水或余额。
