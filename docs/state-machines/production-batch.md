# 生产批次状态机

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> confirmed: 确认数量与日期
  confirmed --> released: 发布工单
  released --> running: 首个工单开始
  running --> paused: 批次级暂停
  paused --> running: 恢复
  running --> awaiting_quality: 生产完成
  awaiting_quality --> completed: 质量放行并入库
  awaiting_quality --> exception: 不合格
  exception --> running: 返工批准
  draft --> cancelled
  confirmed --> cancelled
```

批次必须引用来源生产需求分配与所用配方快照。状态由工单、质量和库存事件聚合，不允许数字孪生页面成为状态来源。

当前代码已实现 `CreateProductionBatch → draft → confirmed → released → running → awaiting_quality → completed/exception`。`released` 在同一事务内创建一张引用冻结 v2 配方快照的 `WorkOrder.pending`；后续状态由工单现场命令、报产和质量判定原子同步。合格放行同时追加成品入库流水，不合格不增加库存。

确认和释放都要求 `Idempotency-Key` 与客户端最后读取到的 `revision`。跳过状态、过期 revision、跨组织对象和不完整/v1 工艺快照均失败关闭。
