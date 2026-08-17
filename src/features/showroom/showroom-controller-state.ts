import { SHOWROOM_SCENES, SHOWROOM_TOTAL_DURATION } from "./showroom-scenes";
import type { ShowroomPlaybackState, ShowroomScenePhase } from "./showroom-types";

export type ShowroomPlaybackAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle" }
  | { type: "tick"; deltaMs: number; loop: boolean }
  | { type: "next"; loop: boolean }
  | { type: "previous" }
  | { type: "go-to"; sceneIndex: number }
  | { type: "begin-next-handoff" }
  | { type: "replay"; playing?: boolean }
  | { type: "idle-resume" };

export const INITIAL_SHOWROOM_STATE: ShowroomPlaybackState = {
  sceneIndex: 0,
  elapsedMs: 0,
  playing: false,
  completed: false,
  pauseAtSceneIndex: null,
};

const clampSceneIndex = (index: number) => Math.min(SHOWROOM_SCENES.length - 1, Math.max(0, index));

export function advanceShowroomPlayback(
  state: ShowroomPlaybackState,
  deltaMs: number,
  loop: boolean,
): ShowroomPlaybackState {
  if (!state.playing || deltaMs <= 0) return state;

  let sceneIndex = state.sceneIndex;
  let elapsedMs = state.elapsedMs + deltaMs;

  while (elapsedMs >= SHOWROOM_SCENES[sceneIndex].durationMs) {
    elapsedMs -= SHOWROOM_SCENES[sceneIndex].durationMs;
    if (sceneIndex < SHOWROOM_SCENES.length - 1) {
      sceneIndex += 1;
      if (state.pauseAtSceneIndex === sceneIndex) {
        return {
          ...state,
          sceneIndex,
          elapsedMs: 0,
          playing: false,
          completed: false,
          pauseAtSceneIndex: null,
        };
      }
      continue;
    }
    if (loop) {
      sceneIndex = 0;
      continue;
    }
    return {
      sceneIndex,
      elapsedMs: SHOWROOM_SCENES[sceneIndex].durationMs,
      playing: false,
      completed: true,
      pauseAtSceneIndex: null,
    };
  }

  return { ...state, sceneIndex, elapsedMs, completed: false };
}

export function showroomPlaybackReducer(
  state: ShowroomPlaybackState,
  action: ShowroomPlaybackAction,
): ShowroomPlaybackState {
  switch (action.type) {
    case "play":
      return { ...state, playing: true, completed: false, pauseAtSceneIndex: null };
    case "idle-resume":
      return { ...state, elapsedMs: 0, playing: true, completed: false, pauseAtSceneIndex: null };
    case "pause":
      return { ...state, playing: false, pauseAtSceneIndex: null };
    case "toggle":
      return { ...state, playing: !state.playing, completed: false, pauseAtSceneIndex: null };
    case "tick":
      return advanceShowroomPlayback(state, action.deltaMs, action.loop);
    case "next": {
      if (state.sceneIndex === SHOWROOM_SCENES.length - 1) {
        return action.loop
          ? { ...state, sceneIndex: 0, elapsedMs: 0, completed: false, pauseAtSceneIndex: null }
          : { ...state, elapsedMs: SHOWROOM_SCENES[state.sceneIndex].durationMs, playing: false, completed: true, pauseAtSceneIndex: null };
      }
      return { ...state, sceneIndex: state.sceneIndex + 1, elapsedMs: 0, completed: false, pauseAtSceneIndex: null };
    }
    case "previous":
      return {
        ...state,
        sceneIndex: Math.max(0, state.sceneIndex - 1),
        elapsedMs: 0,
        completed: false,
        pauseAtSceneIndex: null,
      };
    case "go-to":
      return { ...state, sceneIndex: clampSceneIndex(action.sceneIndex), elapsedMs: 0, completed: false, pauseAtSceneIndex: null };
    case "begin-next-handoff": {
      const scene = SHOWROOM_SCENES[state.sceneIndex];
      return {
        ...state,
        elapsedMs: scene.durationMs - scene.transitionDurationMs,
        playing: true,
        completed: false,
        pauseAtSceneIndex: clampSceneIndex(state.sceneIndex + 1),
      };
    }
    case "replay":
      return { sceneIndex: 0, elapsedMs: 0, playing: action.playing ?? true, completed: false, pauseAtSceneIndex: null };
    default:
      return state;
  }
}

export function sceneProgress(state: ShowroomPlaybackState) {
  const duration = SHOWROOM_SCENES[state.sceneIndex].durationMs;
  return Math.min(1, Math.max(0, state.elapsedMs / duration));
}

export function scenePhase(state: ShowroomPlaybackState): ShowroomScenePhase {
  const scene = SHOWROOM_SCENES[state.sceneIndex];
  const transitionAt = scene.durationMs - scene.transitionDurationMs;
  if (state.elapsedMs < scene.enterAtMs) return "enter";
  if (state.elapsedMs < scene.exitAtMs) return "active";
  if (state.elapsedMs < transitionAt) return "exit";
  return "transition";
}

export function scenePhaseProgress(state: ShowroomPlaybackState) {
  const scene = SHOWROOM_SCENES[state.sceneIndex];
  const phase = scenePhase(state);
  if (phase === "enter") return Math.min(1, state.elapsedMs / scene.enterAtMs);
  if (phase === "active") return Math.min(1, (state.elapsedMs - scene.enterAtMs) / Math.max(1, scene.exitAtMs - scene.enterAtMs));
  const transitionAt = scene.durationMs - scene.transitionDurationMs;
  if (phase === "exit") return Math.min(1, (state.elapsedMs - scene.exitAtMs) / Math.max(1, transitionAt - scene.exitAtMs));
  return Math.min(1, (state.elapsedMs - transitionAt) / scene.transitionDurationMs);
}

export function overallProgress(state: ShowroomPlaybackState) {
  const completedDuration = SHOWROOM_SCENES
    .slice(0, state.sceneIndex)
    .reduce((total, scene) => total + scene.durationMs, 0);
  return Math.min(1, Math.max(0, (completedDuration + state.elapsedMs) / SHOWROOM_TOTAL_DURATION));
}
