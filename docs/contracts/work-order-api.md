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

## 不变量

- 查询固定带服务端组织边界，不接受客户端组织参数。
- 数量以 Decimal 字符串返回。
- 工序来自工单冻结的 v2 配方快照，禁止读取最新 BOM 补齐或替换。
- 一张工单必须追溯到唯一生产批次，批次可继续追溯到生产需求和订单分配。
- 当前只开放查询；MES 开工、暂停、完工和异常命令尚未实现，非 demo 页面不得直接修改状态。
