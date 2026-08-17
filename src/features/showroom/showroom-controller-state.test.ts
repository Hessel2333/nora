import { describe, expect, it } from "vitest";
import { SHOWROOM_SCENES } from "./showroom-scenes";
import {
  INITIAL_SHOWROOM_STATE,
  advanceShowroomPlayback,
  sceneProgress,
  scenePhase,
  showroomPlaybackReducer,
} from "./showroom-controller-state";

describe("Showroom scene controller", () => {
  it("autoplays into the next scene and preserves overflow time", () => {
    const playing = showroomPlaybackReducer(INITIAL_SHOWROOM_STATE, { type: "play" });
    const advanced = advanceShowroomPlayback(playing, SHOWROOM_SCENES[0].durationMs + 420, true);

    expect(advanced.sceneIndex).toBe(1);
    expect(advanced.elapsedMs).toBe(420);
    expect(advanced.playing).toBe(true);
  });

  it("supports next and previous navigation", () => {
    const next = showroomPlaybackReducer(INITIAL_SHOWROOM_STATE, { type: "next", loop: true });
    const previous = showroomPlaybackReducer(next, { type: "previous" });

    expect(next.sceneIndex).toBe(1);
    expect(previous.sceneIndex).toBe(0);
  });

  it("starts an interactive hand-off from the current scene transition boundary", () => {
    const orderIndex = 2;
    const order = SHOWROOM_SCENES[orderIndex];
    const handoff = showroomPlaybackReducer(
      { ...INITIAL_SHOWROOM_STATE, sceneIndex: orderIndex, elapsedMs: 2_000 },
      { type: "begin-next-handoff" },
    );

    expect(handoff.playing).toBe(true);
    expect(handoff.elapsedMs).toBe(order.durationMs - order.transitionDurationMs);
    expect(handoff.pauseAtSceneIndex).toBe(orderIndex + 1);
    expect(scenePhase(handoff)).toBe("transition");

    const landed = advanceShowroomPlayback(handoff, order.transitionDurationMs, true);
    expect(landed.sceneIndex).toBe(orderIndex + 1);
    expect(landed.elapsedMs).toBe(0);
    expect(landed.playing).toBe(false);
    expect(landed.pauseAtSceneIndex).toBeNull();
  });

  it("pauses without losing scene progress", () => {
    const state = { ...INITIAL_SHOWROOM_STATE, playing: true, elapsedMs: 1_600 };
    const paused = showroomPlaybackReducer(state, { type: "pause" });

    expect(paused.playing).toBe(false);
    expect(paused.elapsedMs).toBe(1_600);
  });

  it("loops from the final scene to the intro", () => {
    const lastScene = {
      ...INITIAL_SHOWROOM_STATE,
      sceneIndex: SHOWROOM_SCENES.length - 1,
      elapsedMs: SHOWROOM_SCENES.at(-1)!.durationMs - 100,
      playing: true,
    };
    const looped = advanceShowroomPlayback(lastScene, 250, true);

    expect(looped.sceneIndex).toBe(0);
    expect(looped.elapsedMs).toBe(150);
  });

  it("resumes autoplay after the interaction idle timeout", () => {
    const paused = { ...INITIAL_SHOWROOM_STATE, sceneIndex: 3, elapsedMs: 2_400, playing: false };
    const resumed = showroomPlaybackReducer(paused, { type: "idle-resume" });

    expect(resumed.playing).toBe(true);
    expect(resumed.sceneIndex).toBe(3);
    expect(resumed.elapsedMs).toBe(0);
  });

  it("reports bounded scene progress", () => {
    const half = {
      ...INITIAL_SHOWROOM_STATE,
      sceneIndex: 2,
      elapsedMs: SHOWROOM_SCENES[2].durationMs / 2,
    };

    expect(sceneProgress(half)).toBe(0.5);
    expect(sceneProgress({ ...half, elapsedMs: SHOWROOM_SCENES[2].durationMs * 2 })).toBe(1);
  });

  it("exposes enter, active, exit and transition timing phases", () => {
    const scene = SHOWROOM_SCENES[3];
    expect(scenePhase({ ...INITIAL_SHOWROOM_STATE, sceneIndex: 3, elapsedMs: 0 })).toBe("enter");
    expect(scenePhase({ ...INITIAL_SHOWROOM_STATE, sceneIndex: 3, elapsedMs: scene.highlightAtMs })).toBe("active");
    expect(scenePhase({ ...INITIAL_SHOWROOM_STATE, sceneIndex: 3, elapsedMs: scene.exitAtMs + 1 })).toBe("exit");
    expect(scenePhase({ ...INITIAL_SHOWROOM_STATE, sceneIndex: 3, elapsedMs: scene.durationMs - 1 })).toBe("transition");
  });
});
