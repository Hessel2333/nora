export type ShowroomSceneId =
  | "intro"
  | "forecast"
  | "order"
  | "bom"
  | "mrp"
  | "procurement"
  | "scheduling"
  | "production"
  | "traceability"
  | "business"
  | "platform";

export type ShowroomScenePhase = "enter" | "active" | "exit" | "transition";

export interface ShowroomSceneDefinition {
  id: ShowroomSceneId;
  label: string;
  durationMs: number;
  transitionDurationMs: number;
  enterAtMs: number;
  highlightAtMs: number;
  exitAtMs: number;
  backgroundVideo?: string;
}

export interface ShowroomPlaybackState {
  sceneIndex: number;
  elapsedMs: number;
  playing: boolean;
  completed: boolean;
  pauseAtSceneIndex: number | null;
}

export interface ShowroomOptions {
  autoplay: boolean;
  loop: boolean;
  kiosk: boolean;
}
