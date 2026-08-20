import { describe, expect, it } from "vitest";
import { getBomVersionValidityState, nextAvailableBomVersion, toLocalDateTimeInput } from "./bom-validity";

describe("BOM validity presentation", () => {
  const now = new Date("2026-08-18T08:00:00Z");

  it("does not call a future published version current", () => {
    expect(getBomVersionValidityState({
      status: "effective",
      effectiveAt: "2026-08-19T08:00:00Z",
      effectiveTo: null,
    }, now)).toBe("scheduled");
  });

  it("uses half-open time windows for current and historical labels", () => {
    const version = {
      status: "retired" as const,
      effectiveAt: "2026-08-01T00:00:00Z",
      effectiveTo: "2026-08-18T08:00:00Z",
    };
    expect(getBomVersionValidityState(version, new Date("2026-08-18T07:59:59Z"))).toBe("current");
    expect(getBomVersionValidityState(version, now)).toBe("historical");
  });

  it("formats a stable datetime-local value", () => {
    expect(toLocalDateTimeInput(new Date(2026, 7, 19, 6, 30))).toBe("2026-08-19T06:30");
  });

  it("skips version labels already used by another draft or scheduled release", () => {
    expect(nextAvailableBomVersion("V2.1", ["V2.1", "V2.2", "V2.3"])).toBe("V2.4");
  });
});
