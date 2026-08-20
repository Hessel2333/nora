import { describe, expect, it } from "vitest";
import { parseMarkdown } from "./markdown";

describe("help markdown parser", () => {
  it("builds a title, stable table of contents, lists, and tables", () => {
    const document = parseMarkdown(`# 流程总览

介绍正文。

## 审核订单

1. 核对客户
2. 核对交期

## 审核订单

| 状态 | 含义 |
| --- | --- |
| 待计划 | 尚未形成工单 |
`);

    expect(document.title).toBe("流程总览");
    expect(document.headings).toEqual([
      { id: "审核订单", level: 2, text: "审核订单" },
      { id: "审核订单-2", level: 2, text: "审核订单" },
    ]);
    expect(document.blocks).toContainEqual({
      type: "ordered-list",
      items: ["核对客户", "核对交期"],
    });
    expect(document.blocks).toContainEqual({
      type: "table",
      headers: ["状态", "含义"],
      rows: [["待计划", "尚未形成工单"]],
    });
  });
});
