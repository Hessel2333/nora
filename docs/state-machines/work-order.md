# 工单状态机

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> running: 开始
  running --> paused: 暂停
  paused --> running: 继续
  running --> completed: 完成并提交产出
  pending --> exception: 上报异常
  running --> exception: 上报异常
  paused --> exception: 上报异常
  exception --> pending: 重新排队
  exception --> running: 现场恢复
  pending --> cancelled: 受控取消
```

## 事件要求

每次转换记录：工单、前后状态、真实操作者、设备/工位（若有）、服务端时间、原因、数量和幂等键。生产模式拒绝匿名或演示身份。

## 当前实现

批次从 `confirmed` 释放时原子创建一张 `WorkOrder.pending` 和 `WorkOrderEvent.created`，并复制批次冻结的商品、数量、单位、计划时间、BOM 版本和完整 v2 配方快照。`pending → running` 及之后的现场命令尚未接入真实 API；非演示页面不得从浏览器直接修改工单状态。

## 现场体验

MES 端仅突出开始、暂停、继续、完成和异常上报；扫码用于定位真实工单/批次，不把“模拟扫码”结果写入生产事实。
