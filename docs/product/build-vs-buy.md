# Build / Buy / Integrate 决策

评估日期：2026-08-18；官方来源复核：2026-08-20。资料范围限定为官方文档、官方仓库与许可证文件；没有把营销页中的效率数字当作已验证事实。开源许可证仅用于产品技术边界评估，不构成法律意见；正式采用前必须逐模块复核版本、许可证、商标和商业条款。

## 决策摘要

Nora 自研食品制造领域核心和端到端事实链；通用 ERP 作为业务参考或集成目标；身份、授权、优化器、追溯标准与数字孪生协议优先采用成熟基础设施。

## 业务产品参考

| 候选 | 已有能力 | 适配与不足 | UI/UX | 技术耦合与集成成本 | 许可证/商业条款 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| [ERPNext Manufacturing](https://docs.frappe.io/erpnext/manufacturing) | BOM、多级 BOM、工序/路线、生产计划、工单、Job Card、库存台账、批次、质量检查和配送单等完整 ERP 流程 | 通用制造覆盖广；食品阶段投料、门店合批、客户去向分摊和人工净菜扫码仍需垂直定制 | 单据式 ERP，计划员可用；现场 Job Card/Plant Floor 可参考，但任务仍受 Frappe 交互模型约束 | 强依赖 Frappe DocType、权限和前端生态；API 集成中等，直接作为 Nora 底座的迁移/升级成本高 | [GPLv3](https://github.com/frappe/erpnext/blob/develop/license.txt)，复制、修改和分发边界需法律评估 | **流程参考 + 外部 ERP 集成**；不复制或嵌入核心源码 |
| [Odoo Manufacturing](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing.html) | BoM 同时支持组件与工序；制造订单、Shop Floor、拆并单、副产品、报废、批次/序列、质量、库存、采购和配送生态成熟 | 制造/仓储模型可借鉴；中央厨房订单合批、阶段配方、去向分摊和食品召回语义仍需 Nora 垂直扩展 | [Shop Floor](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/shop_floor/shop_floor_overview.html) 已适配平板工位，但整体仍以 ERP 应用与单据为中心 | 强依赖 Odoo ORM、模块和年度版本升级；API 对接中等，平台级二开与长期升级成本高 | [Community LGPLv3，Enterprise 为商业许可](https://www.odoo.com/documentation/master/legal/licenses.html) | **能力标杆 + 客户已有 Odoo 的集成目标**；不以其 UI 替代 Nora 现场体验 |
| [OCA manufacture](https://github.com/OCA/manufacture) / [stock-logistics-workflow](https://github.com/OCA/stock-logistics-workflow) | 扩展 Odoo 的制造、工单、库存工作流和边界场景 | 可补足 Odoo 社区版缺口；不是独立产品，食品语义仍需 Nora 定义 | 继承 Odoo UX，模块间一致性依赖组合 | 必须运行在兼容 Odoo 版本；逐模块升级和冲突维护成本高 | 仓库通常声明 AGPL-3.0，**具体模块可不同**，采用前逐个核对 `__manifest__`/LICENSE | **研究边界案例**；不整包接入 |
| [观麦中央厨房解决方案](https://www.guanmai.cn/central/) | 官方页面列出多 BOM、出成率/损耗、采购、生产领退料、多仓/货位/批次效期、分拣、配送和财务报表 | 中国生鲜/团餐语境贴合度高；多 BOM 与客户特配值得对照，但配方时态、不可变快照、事件追溯深度仍需实机验证 | 更接近国内运营人员习惯；现场效率声明属于厂商材料，必须用客户任务实测 | 商业 SaaS；[OpenAPI](https://gate.guanmai.cn/%E6%A8%A1%E5%9D%97%E6%96%87%E6%A1%A3/%E8%A7%82%E9%BA%A6OpenAPI/) 当前公开商品、客户、订单、采购、出入库等接口，且可用范围受合同限制；BOM/MES/追溯接口不能假定开放 | 专有商业产品，无可嵌入开源许可证 | **竞品基准 + 可选业务系统集成/替代评估**；PoC 先验证 API、数据导出和退出成本 |

## 通用基础设施

| 能力 | 候选 | 决策 | 原因 |
| --- | --- | --- | --- |
| 身份认证 | [Keycloak](https://www.keycloak.org/documentation) | **优先集成** | OIDC/OAuth2/SAML、MFA、用户/Realm 与管理 API 成熟，避免自研密码体系；[Apache-2.0](https://github.com/keycloak/keycloak/blob/main/LICENSE.txt)，但需承担补丁、HA 和升级运维 |
| 细粒度授权 | [OpenFGA](https://github.com/openfga/openfga) | **需要时集成** | 关系型授权适合组织/工厂/对象关系；[Apache-2.0](https://github.com/openfga/openfga/blob/main/LICENSE)，引入前先证明应用内 RBAC 无法满足，避免双重事实源 |
| 排程与优化 | [Google OR-Tools](https://developers.google.com/optimization) | **求解器外置候选** | CP-SAT、路由、流和整数规划成熟，支持 Python/C++/Java/C#；[Apache-2.0](https://github.com/google/or-tools/blob/stable/LICENSE)。Nora 仍拥有食品约束、输入版本、可行性检查和解释层 |
| 排程与优化 | [Timefold](https://github.com/TimefoldAI/timefold-solver) | **Java 团队候选** | Java/Kotlin 的约束流与持续规划体验好，[Apache-2.0](https://github.com/TimefoldAI/timefold-solver/blob/main/LICENSE.txt)；会引入 JVM 部署边界，当前 NestJS MVP 不应为“AI 排程”提前接入 |
| 事件追溯标准 | [GS1 EPCIS 2.0.1](https://ref.gs1.org/standards/epcis/) | **语义对齐** | 用 what/when/where/why 规划事件与互通；它是标准而非现成 Nora 业务服务，实施成本仍在事件映射 |
| 数字孪生协议 | [Eclipse Ditto](https://eclipse.dev/ditto/) | **后续评估** | 提供设备数字影子、策略与消息接口；[EPL-2.0](https://github.com/eclipse-ditto/ditto/blob/master/LICENSE)。设备身份、连接、事件语义和集群运维成本高，当前没有真实设备数据需求 |

## 采用前验证门槛

- ERP/观麦集成：用客户真实样例验证主数据、订单、批次、状态、增量同步、错误重试、限流、数据导出和合同退出条款。
- Keycloak/OpenFGA：先形成身份主体、组织边界、职责分离与停机策略；不能把两个系统都变成权限事实源。
- OR-Tools/Timefold：先用确定性规则得到可验证可行解，再比较求解质量、超时、不可行解释和人工覆盖；不以“能运行示例”作为采用证据。
- EPCIS/Ditto：先确定 Nora 内部事件与设备契约，再做适配器；标准或数字影子平台不拥有订单、工单、库存和质量事实。

## Nora 应自研的核心

- 订单审批时的递归配方冻结与历史可重放语义
- 面向中央厨房的订单聚合、生产需求与批次拆分规则
- 配方单位、损耗、产出率和食品制造约束
- 订单—需求—批次—工单—质量—库存事件的统一追溯链
- 计划员、生产主管和现场员工的任务式交互
- 规则/优化结果的业务解释层与人工确认边界

## 暂不建设

- 完整财务、薪资、通用 CRM、通用电商或通用仓库套件
- 自研身份认证、密码体系、策略引擎和通用求解器
- 没有设备数据支撑的 3D 孪生或“实时 AI”叙事
