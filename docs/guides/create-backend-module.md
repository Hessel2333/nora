# 新增后端模块指南

## 1. 明确边界

先复制 `docs/templates/feature-spec.md`，写清目标、角色、状态、不变量、输入输出和明确不做的范围。一个模块只拥有自己的聚合和状态。

## 2. 复制代码模板

复制 `templates/backend-module` 到 `apps/api/src/modules/<module>`，将 `{{feature}}` 等标记替换为实际名称。

推荐结构：

```text
<module>/
  dto/
  <module>.controller.ts
  <module>.service.ts
  <module>.module.ts
  <module>.presenter.ts
  <module>-policy.ts
  <module>-policy.test.ts
```

## 3. 数据库设计

- 所有业务表包含组织边界、创建时间和更新时间。
- 金额和数量使用 Decimal。
- 需要保留历史真实性的数据使用快照字段。
- 状态和唯一约束尽量下沉到数据库；跨表业务规则放在服务事务中。
- 使用 migration，禁止只修改本地数据库。

## 4. 实现顺序

1. 先写不依赖 NestJS/Prisma 的 policy 和单元测试。
2. 定义 DTO 和 OpenAPI 描述。
3. 实现 service 用例及事务。
4. 实现 presenter，隔离数据库类型和 API 类型。
5. 最后实现 controller 和前端调用。

## 5. 完成标准

- 本地数据库从空库应用 migration 后可启动。
- Seed 或 fixture 能演示主路径。
- OpenAPI 可访问。
- 单元测试、类型检查、Lint、构建全部通过。
- 至少用真实 HTTP 请求验证成功路径和一个失败路径。
- 模块 README、API 契约和任务状态同步更新。
