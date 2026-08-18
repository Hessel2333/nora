# 后端模块代码模板

复制本目录中的 `.tpl` 文件到 `apps/api/src/modules/<feature>`，替换以下标记：

- `{{Feature}}`：PascalCase，例如 `Purchasing`
- `{{feature}}`：camelCase，例如 `purchasing`
- `{{features}}`：URL 复数，例如 `purchases`

模板只提供结构，不替代功能规格。DTO 字段、事务边界、数据库模型和 policy 必须根据业务设计。
