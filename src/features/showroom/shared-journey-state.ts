import type { ShowroomSceneId, ShowroomScenePhase } from "./showroom-types";

export type SharedJourneyVisibility = {
  order: boolean;
  dish: boolean;
};

export const DISH_HANDOFF_SETTLE_PROGRESS = 0.075;

/**
 * Shared objects only exist during the outgoing scene's hand-off.
 * The destination scene owns the object as soon as it starts entering; keeping
 * the overlay alive past that boundary reads as duplicate or stale content.
 */
export function sharedJourneyVisibility(
  scene: ShowroomSceneId,
  phase: ShowroomScenePhase,
  progress: number,
): SharedJourneyVisibility {
  const transitioning = phase === "transition";

  return {
    order: scene === "intro" && progress > 0.38,
    dish: (scene === "order" && transitioning)
      || (scene === "bom" && progress < DISH_HANDOFF_SETTLE_PROGRESS),
  };
}
