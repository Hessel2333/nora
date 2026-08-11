# Nora Agent Instructions

## 项目定位

Nora 是面向中央厨房、净配菜工厂、团餐供应链的新一代 AI ERP + MES + WMS 平台。

目标不是传统 ERP，而是类似 Odoo Manufacturing + 现代 SaaS + 食品制造 MES 的智能制造操作系统。

核心流程：

客户订单 → AI预测 → BOM展开 → 生产计划 → MES工位执行 → 质量追溯 → 库存 → 配送

## 设计原则

参考 prototype 目录中的原型图。

设计风格：
- 极简现代 SaaS
- Odoo Manufacturing
- Linear
- Vercel Dashboard
- Stripe Dashboard

禁止：
- 传统 ERP 菜单树
- 老式表格堆叠
- 复杂单据页面

## 技术栈

Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:
- Node.js/NestJS
- PostgreSQL

第一阶段优先 Mock 数据实现高质量 Demo。

## 核心模块

### Dashboard
中央厨房运营驾驶舱：
- 今日订单
- 生产任务
- 库存预警
- 配送任务
- AI建议

### Sales
- 销售预测
- 客户管理
- 订单中心

### Product
- 产品档案
- 原料
- 半成品
- 成品
- BOM管理
- 工艺路线

### Manufacturing
- 生产计划
- 生产工单
- MES执行
- 工序管理
- 生产看板

### Digital Twin
数字孪生：
- 2D工厂地图
- 2.5D工厂模型
- 3D扩展
- 实时状态绑定

### Warehouse
- 库存
- 批次
- 食品追溯

### AI Copilot
- 销售预测
- 智能采购建议
- 生产排程优化
- 异常分析

## MES原则

员工端不是 ERP 页面。

必须：
- 大按钮
- 少文字
- 平板适配
- 扫码录入

支持：
- 开始任务
- 暂停
- 完成
- 异常上报

## 开发原则

每个模块完成：
1. 页面可运行
2. 使用模拟数据
3. 有真实交互
4. 保持设计一致

优先完成：
Dashboard → 订单 → BOM → 生产计划 → MES → 数字孪生
