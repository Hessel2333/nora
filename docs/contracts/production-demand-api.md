# 生产需求 API 契约

## `GET /api/v1/production-demands`

用途：为生产准备工作台查询当前组织的生产需求及来源订单摘要。

权限：当前 MVP 由服务端组织上下文限定数据范围；真实角色授权接入前只提供只读查询。

运行模式：development / production 使用正式 API；demo 不调用本端点。

幂等键：不适用，只读查询。

并发控制：不适用；列表与总数在同一个数据库事务中读取。

### 请求

查询参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `query` | string，可选 | 匹配需求号、订单号、客户或商品 |
| `status` | ProductionDemandStatus，可选 | 按需求状态筛选 |
| `page` | integer，默认 1 | 页码 |
| `pageSize` | integer，默认 50，最大 100 | 每页数量 |

### 成功响应

状态码：`200`

```json
{
  "data": [
    {
      "id": "uuid",
      "code": "PD202608200001",
      "salesOrderId": "uuid",
      "factoryCode": "SZ-CENTRAL",
      "factoryName": "深圳中央工厂",
      "requiredAt": "2026-08-21 11:30",
      "status": "pending_planning",
      "approvedAt": "2026-08-20 09:15",
      "createdAt": "2026-08-20 09:15",
      "salesOrder": {
        "id": "uuid",
        "code": "SO202608200001",
        "customerName": "南山门店",
        "deliveryAt": "2026-08-21 11:30"
      },
      "lines": [],
      "lineCount": 2,
      "readyLineCount": 2,
      "missingBomCount": 0
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 1
}
```

列表中的每条需求行额外返回 `allocatedQuantity` 与 `remainingQuantity` Decimal 字符串，用于批次分配；两者只统计未取消批次的有效分配。

需求行中的 `requiredQuantity` 当前沿用既有 JSON 数字兼容格式；在写入或进行高精度计划分配前必须升级为稳定 Decimal 字符串契约，不得把前端浮点回写为事实。

### 失败响应

| 状态码 | 业务场景 | 稳定错误标识 |
| --- | --- | --- |
| 400 | 状态、页码或分页大小不合法 | Nest 校验消息（稳定错误码待统一错误信封实现） |
| 500 | 数据库或服务不可用 | 当前通用服务错误（不得回退 Mock） |

### 副作用与事务

- 原子写入：无。
- 失败回滚：无写入。
- 重试结果：相同数据版本下返回同一投影；并发业务变更可能改变列表。
- 审计身份：只读查询当前未记录用户级审计；组织范围由服务端上下文提供。

### 兼容性

- 新增可选字段兼容。
- 删除、重命名或改变就绪语义属于破坏性变更。
- `requiredAt`、`approvedAt`、`createdAt` 和订单交期使用 Asia/Shanghai 本地时间字符串，与现有订单/BOM API 保持一致。
