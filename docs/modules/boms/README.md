# BOM 模块

## 职责

BOM 模块管理产出商品的配方版本、版本发布规则和订单物料展开。它不负责库存可用量、采购建议或生产工艺路线。

代码位置：`apps/api/src/modules/boms`。

## 聚合结构

```text
Bom（产出商品）
└── BomVersion（V1.0 / V1.1 / V2.0）
    └── BomItem（直接子物料、净用量、出成率、单位成本快照）
```

数据库只保存直接父子关系。多层结构在展开时根据半成品的有效 BOM 递归解析，不在明细中保存展示层级。

## 版本规则

- 新建 BOM 默认产生草稿版本。
- 生效版本不可原地修改。
- “复制新版本”完整复制用料并关联 `previousVersionId`。
- 发布草稿会停用同 BOM 原生效版本。
- 有效时间由 `effectiveAt` 表达；订单按交期选择版本。

## 计算规则

```text
展开系数 = 需求数量 ÷ BOM 标准产出
毛料需求 = 净用量 ÷ 出成率 × 展开系数
预计成本 = 毛料需求 × 物料单位成本
```

相同底层物料按商品和单位汇总。当前 MVP 不做单位换算，因此一个商品在所有 BOM 中必须使用一致的库存单位。

## API

- `GET /api/v1/boms`
- `POST /api/v1/boms`
- `GET /api/v1/boms/:id`
- `POST /api/v1/boms/:id/versions`
- `PUT /api/v1/boms/versions/:versionId`
- `POST /api/v1/boms/versions/:versionId/publish`
- `POST /api/v1/boms/versions/:versionId/retire`

物料展开作为订单用例暴露在 `GET /orders/:id/material-requirements`。

## 扩展检查

修改 BOM 规则时至少覆盖：数量精度、出成率边界、版本不可变、循环引用、缺失 BOM、多层汇总和交期版本选择。
