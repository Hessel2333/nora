import { describe, expect, it } from "vitest";
import {
  detectPreprocessTemplate,
  editablePreprocessKinds,
  instantiatePreprocessTemplate,
  preprocessTemplates,
  suggestPreprocessOperationCode,
} from "./preprocess-templates";

describe("preprocess templates", () => {
  it("contains only supported net-prep operations with unique ordered codes", () => {
    for (const template of preprocessTemplates) {
      const operations = instantiatePreprocessTemplate(template, template.id);
      expect(operations.every((operation) => editablePreprocessKinds.includes(operation.kind))).toBe(true);
      expect(new Set(operations.map((operation) => operation.code)).size).toBe(operations.length);
      expect(operations.map((operation) => operation.sequence)).toEqual(
        operations.map((_, index) => (index + 1) * 10),
      );
    }
  });

  it("distinguishes basic and marinated meat preparation", () => {
    const basic = preprocessTemplates.find((template) => template.id === "meat-basic")!;
    const marinated = preprocessTemplates.find((template) => template.id === "meat-marinated")!;
    expect(basic.operations.some((operation) => operation.kind === "marinate")).toBe(false);
    expect(marinated.operations.some((operation) => operation.kind === "marinate")).toBe(true);
  });

  it("detects an instantiated standard flow", () => {
    const template = preprocessTemplates[0]!;
    expect(detectPreprocessTemplate(instantiatePreprocessTemplate(template))?.id).toBe(template.id);
  });

  it("keeps packaging, meat, marinade and dry accessories in sensible stages", () => {
    const template = preprocessTemplates.find((candidate) => candidate.id === "meat-marinated")!;
    const operations = instantiatePreprocessTemplate(template);
    expect(suggestPreprocessOperationCode(operations, { category: "包装" })).toBe("OP60");
    expect(suggestPreprocessOperationCode(operations, { category: "禽肉类", type: "raw" })).toBe("OP10");
    expect(suggestPreprocessOperationCode(operations, { category: "半成品", type: "semi" })).toBe("OP40");
    expect(suggestPreprocessOperationCode(operations, { category: "干货", type: "raw" })).toBe("OP50");
    expect(suggestPreprocessOperationCode(operations, { category: "辅料", type: "raw" })).toBe("OP50");
  });

  it("sends every non-package component to the assembly step in a kit flow", () => {
    const template = preprocessTemplates.find((candidate) => candidate.id === "kit-assembly")!;
    const operations = instantiatePreprocessTemplate(template);
    expect(suggestPreprocessOperationCode(operations, { category: "禽肉类", type: "raw" })).toBe("OP30");
    expect(suggestPreprocessOperationCode(operations, { category: "干货", type: "raw" })).toBe("OP30");
  });
});
