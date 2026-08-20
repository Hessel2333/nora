import { describe, expect, it } from "vitest";
import { findLatestBomDraft, getBomVersionValidityState, nextAvailableBomVersion, toLocalDateTimeInput } from "./bom-validity";

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

  it("prefers the draft currently selected by the API", () => {
    expect(findLatestBomDraft({
      status: "draft",
      versionId: "draft-selected",
      versions: [
        { id: "draft-newer", version: "V2.3", status: "draft", effectiveAt: null, revision: 1, events: [] },
        { id: "draft-selected", version: "V2.2", status: "draft", effectiveAt: null, revision: 1, events: [] },
      ],
    })?.id).toBe("draft-selected");
  });

  it("finds the most recently active draft when a published version is selected", () => {
    expect(findLatestBomDraft({
      status: "effective",
      versionId: "current",
      versions: [
        {
          id: "draft-old",
          version: "V2.2",
          status: "draft",
          effectiveAt: null,
          revision: 2,
          events: [{ id: "event-old", type: "updated", actor: "user", revision: 2, effectiveAt: null, createdAt: "2026-08-19T08:00:00Z" }],
        },
        {
          id: "draft-new",
          version: "V2.3",
          status: "draft",
          effectiveAt: null,
          revision: 1,
          events: [{ id: "event-new", type: "created", actor: "user", revision: 1, effectiveAt: null, createdAt: "2026-08-20T08:00:00Z" }],
        },
      ],
    })?.id).toBe("draft-new");
  });
});
