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

## 稳定错误语义

| HTTP | 场景 | 用户动作 |
| --- | --- | --- |
| 400 | 缺幂等键、数量/日期/字段格式错误、production 无可信身份 | 修正输入或完成身份接入 |
| 404 | 产品或库位不存在/不属于当前组织 | 刷新主数据后重试 |
| 409 | 批次号已存在、产品单位不一致 | 更正批次或单位 |
| 500 | 事务失败 | 保留原幂等键重试；系统不得部分入账 |
